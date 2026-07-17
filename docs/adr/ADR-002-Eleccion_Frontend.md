# ADR-002: Elección de Angular para el Frontend del Sistema de Gestión de Escuela Deportiva (SGED)

## Estado
Aceptado

## Contexto
El Sistema de Gestión de Escuela Deportiva (SGED) requiere una plataforma frontend interactiva, robusta y escalable. Debe gestionar flujos de información complejos como:
1. Inscripciones y matrículas de alumnos y atletas.
2. Control y asignación de horarios de entrenamiento, canchas y entrenadores.
3. Seguimiento de asistencia, evaluaciones físicas y progreso de rendimiento deportivo.
4. Gestión de pagos y facturación mensual.

Para responder a estas necesidades, se requiere una arquitectura de frontend altamente estructurada, mantenible a largo plazo, fuertemente tipada y que cuente con herramientas maduras para el manejo de formularios complejos.

## Decisión
Hemos decidido seleccionar **Angular v21.2.0** (junto con su ecosistema oficial) como el framework principal para el desarrollo del frontend de SGED. El proyecto se estructurará con las siguientes tecnologías clave y versiones definidas:

*   **Framework Core:** Angular `@angular/core` v21.2.0, `@angular/common` v21.2.0.
*   **Herramientas de Construcción:** `@angular/cli` y `@angular/build` v21.2.5.
*   **Manejo de Formularios:** `@angular/forms` v21.2.0 (esencial para inscripciones y registros deportivos complejos).
*   **Enrutamiento:** `@angular/router` v21.2.0 para la navegación del panel del administrador, entrenadores y representantes.
*   **Tipado:** TypeScript `~5.9.2` para garantizar seguridad de datos deportivos.
*   **Programación Reactiva:** RxJS `~7.8.0` para la sincronización de eventos y estados en tiempo real.
*   **Pruebas Unitarias:** Vitest `^4.0.8` como entorno de testing rápido y moderno en sustitución de Karma/Jasmine.

## Consecuencias
*   **Positivas (Beneficios):**
    *   **Estandarización y Mantenibilidad:** La arquitectura fuertemente orientada a componentes de Angular 21 y su enfoque "opinionated" garantiza que cualquier desarrollador nuevo que ingrese al proyecto SGED entienda la estructura de inmediato.
    *   **Formularios Reactivos Robustos:** El módulo `@angular/forms` v21.2.0 permite validaciones complejas de forma nativa (por ejemplo, cruces de horarios de canchas o validación de edad de atletas por categoría).
    *   **Ecosistema TypeScript 5.9 Actualizado:** Ofrece un tipado estricto excelente para manejar el modelo de datos de atletas, categorías, entrenamientos e inscripciones sin errores en tiempo de compilación.
    *   **Testing Veloz:** La integración con **Vitest 4.0.8** proporciona una velocidad de ejecución de pruebas drásticamente superior en comparación con soluciones tradicionales, agilizando el pipeline de integración continua (CI).
*   **Negativas (Compromisos):**
    *   **Curva de aprendizaje inicial:** El equipo técnico debe dominar conceptos de inyección de dependencias, RxJS (para flujos de datos asíncronos de entrenamientos) y señales (Signals) de Angular moderno.
    *   **Complejidad del setup con Vitest:** Aunque Angular 21 soporta herramientas modernas de construcción, la configuración inicial de Vitest requiere ajustes manuales detallados para reemplazar por completo el motor de pruebas por defecto.

## Alternativas consideradas
*   **React:** Se descartó debido a su naturaleza de "librería de interfaz" no estructurada. En un sistema complejo como SGED, delegar la arquitectura, el enrutamiento y la validación de formularios a múltiples librerías externas de terceros aumentaría el riesgo de inconsistencias técnicas y problemas de mantenimiento a largo plazo.