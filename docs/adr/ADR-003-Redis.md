# Architecture Decision Record (ADR)

## ADR-003: Elección de Redis para Caché y Blacklist de JWT

* **Estado:** Aceptado
* **Fecha:** 16 de Julio, 2026
* **Contexto del Proyecto:** Backend de Autenticación (`org.uteq.backend`)

---

### 1. Contexto y Problema

En nuestra arquitectura de autenticación *stateless* (sin estado), los tokens JWT son distribuidos al cliente en cookies seguras `HttpOnly`. Debido a la naturaleza autónoma del JWT, una vez firmado, el servidor lo considera válido de manera predeterminada hasta que alcanza su fecha de expiración temporal. 

Esto genera una vulnerabilidad crítica: **el cierre de sesión (*logout*) del usuario no invalida realmente el token**. Si un atacante intercepta un token antes del logout, podría seguir utilizándolo para acceder a recursos protegidos hasta su expiración natural.

Necesitamos un mecanismo para:
1. Invalidar inmediatamente los identificadores de token (`jti`) cuando ocurra un evento de *logout*.
2. Mantener la naturaleza *stateless* del sistema evitando consultar la base de datos relacional principal (PostgreSQL/MySQL) en cada petición API entrante, lo cual degradaría drásticamente el rendimiento del sistema.

---

### 2. Decisiones de Diseño

Hemos decidido utilizar **Redis** como almacén de datos clave-valor en memoria para gestionar la lista negra (*blacklist*) de identificadores de token (`jti`) y caché de sesión, complementando la estrategia de cookies `HttpOnly`.

#### Detalles de la Implementación:
* **Identificación Única (`jti`):** Cada JWT generado contendrá un Claim `jti` (JWT ID) único.
* **Invalidación en Logout:** Al invocar el endpoint `/api/auth/logout`, el backend extraerá el `jti` y calculará el tiempo de vida restante exacto del token ($TTL_{restante} = Expiracion_{JWT} - Tiempo_{Actual}$).
* **Almacenamiento Efímero:** El `jti` se registrará en Redis como clave con un valor nulo o booleano, configurando su tiempo de expiración (TTL) en Redis idéntico a $TTL_{restante}$.
* **Verificación en Filtro:** Nuestro `JwtAuthenticationFilter` interceptará cada petición, extraerá el `jti` de la cookie `access_token` y consultará a Redis. Si la clave existe en la lista negra, la petición será rechazada inmediatamente con un estado `401 Unauthorized`.

---

### 3. Alternativas Consideradas

Opción A: Base de Datos Relacional Principal (PostgreSQL / MySQL)**
  * *Desventaja:* Realizar una consulta SQL en cada petición entrante anula por completo el propósito de usar JWT (*stateless*). Generaría un cuello de botella masivo de conexiones de lectura a la base de datos bajo alta concurrencia.
  * *Desventaja:* Requiere un proceso programado en segundo plano (*cron job*) manual para limpiar registros expirados de la tabla.

* **Opción B: Caché en Memoria Local del Servidor (como Caffeine o ConcurrentHashMap)**
  * *Desventaja:* No es escalable horizontalmente. Si desplegamos múltiples instancias de nuestro microservicio/backend detrás de un balanceador de carga, la lista negra no estaría sincronizada entre servidores, permitiendo que un token revocado en el Servidor A sea aceptado en el Servidor B.

---

### 4. Pros y Contras de Redis (Consecuencias)

#### Puntos Favorables (Pros):
* **Rendimiento de Ultra-Baja Latencia:** Redis opera completamente en memoria RAM, lo que permite verificar la existencia del `jti` en sub-milisegundos sin añadir sobrecarga apreciable al filtro de seguridad.
* **Expiración Nativa (TTL):** El soporte nativo para `EXPIRE` permite que Redis elimine automáticamente los `jti` revocados una vez que el tiempo original del JWT expira. No requiere tareas de mantenimiento o scripts manuales de limpieza.
* **Escalabilidad Horizontal:** Al ser un servicio centralizado independiente de las instancias de Spring Boot, todas las réplicas del backend consultan la misma lista negra instantáneamente.

#### Puntos en Contra / Riesgos (Contras):
* **Infraestructura Adicional:** Añade un nuevo componente a la pila tecnológica (servidor Redis) que debe ser desplegado, monitoreado y mantenido.
* **Dependencia Crítica (SPOF):** Si Redis cae, el filtro de autenticación no podrá verificar la lista negra. *Mitigación:* Se implementará una política de tolerancia a fallos (*fail-safe*) donde, si Redis no responde, el sistema puede optar por degradar la seguridad temporalmente confiando en la firma del JWT, o denegar el acceso según la criticidad de la ruta.

---

### 5. Estado de Cumplimiento Técnico

Este enfoque satisface por completo el requerimiento de seguridad de invalidación real del logout, manteniendo un entorno *stateless* optimizado de alto tráfico para el ecosistema Angular-Spring Boot.