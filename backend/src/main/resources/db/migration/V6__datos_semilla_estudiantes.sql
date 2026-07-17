-- V6__datos_semilla_estudiantes.sql
-- Carga de 50 estudiantes de prueba mediante Flyway.

-- =====================================================
-- 1. INSERTAR 50 PERSONAS
-- =====================================================

INSERT INTO seguridad.personas
(
    nombre,
    apellido,
    cedula,
    correo,
    telefono,
    fecha_nacimiento,
    activo
)
SELECT
    'Estudiante' || LPAD(numero::TEXT, 2, '0'),
    'Prueba' || LPAD(numero::TEXT, 2, '0'),
    (1000000000 + numero)::TEXT,
    'semilla.estudiante' || LPAD(numero::TEXT, 2, '0') || '@uteq.edu.ec',
    '09' || LPAD(numero::TEXT, 8, '0'),
    DATE '2000-01-01' + numero,
    TRUE
FROM generate_series(1, 50) AS datos(numero);

-- =====================================================
-- 2. INSERTAR LOS 50 ESTUDIANTES
-- =====================================================

INSERT INTO seguridad.estudiantes
(
    id_persona,
    categoria,
    fecha_ingreso,
    activo
)
SELECT
    p.id_persona,
    CASE
        WHEN p.id_persona % 4 = 0 THEN 'SUB-12'
        WHEN p.id_persona % 4 = 1 THEN 'SUB-14'
        WHEN p.id_persona % 4 = 2 THEN 'SUB-16'
        ELSE 'SUB-18'
        END,
    NOW(),
    TRUE
FROM seguridad.personas p
WHERE p.correo LIKE 'semilla.estudiante%@uteq.edu.ec'
  AND NOT EXISTS (
    SELECT 1
    FROM seguridad.estudiantes e
    WHERE e.id_persona = p.id_persona
);