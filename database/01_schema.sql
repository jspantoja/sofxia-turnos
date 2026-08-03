-- ============================================================
-- SOFXIA · Sistema Integrado de Gestión de Turnos y Personal
-- Script DDL — 01_schema.sql
-- Motor: PostgreSQL 15+ (Supabase) · Cumple 3FN
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Catálogo de roles (permite agregar "Coordinador" en el futuro sin migrar el esquema)
CREATE TABLE IF NOT EXISTS tbl_roles (
  id         SERIAL      PRIMARY KEY,
  nombre_rol VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO tbl_roles (id, nombre_rol)
VALUES (1, 'Administrador'), (2, 'Operario')
ON CONFLICT (id) DO NOTHING;

-- 2) Usuarios (password_hash: hash Bcrypt calculado en el serverless, nunca texto plano)
CREATE TABLE IF NOT EXISTS tbl_usuarios (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  rol_id          INT         NOT NULL REFERENCES tbl_roles(id),
  nombre_completo VARCHAR(150) NOT NULL,
  estado          BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON tbl_usuarios (email);

-- 3) Puntos de trabajo (sedes de clientes)
CREATE TABLE IF NOT EXISTS tbl_puntos_trabajo (
  id          SERIAL       PRIMARY KEY,
  nombre_sede VARCHAR(100) NOT NULL,
  direccion   VARCHAR(255) NOT NULL,
  estado      BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 4) Parámetros configurables del algoritmo de turnos
CREATE TABLE IF NOT EXISTS tbl_configuracion (
  clave VARCHAR(50)  PRIMARY KEY,
  valor VARCHAR(50)  NOT NULL
);
INSERT INTO tbl_configuracion (clave, valor) VALUES
  ('max_horas_diarias',           '8'),
  ('hora_inicio_nocturno',        '21:00'),
  ('hora_fin_nocturno',           '06:00'),
  ('margen_desplazamiento_min',   '60')
ON CONFLICT (clave) DO NOTHING;

-- 5) Turnos — entidad puente con desglose de horas para prenómina
CREATE TABLE IF NOT EXISTS tbl_turnos (
  id                     SERIAL       PRIMARY KEY,
  usuario_id             UUID         NOT NULL REFERENCES tbl_usuarios(id) ON DELETE RESTRICT,
  punto_id               INT          NOT NULL REFERENCES tbl_puntos_trabajo(id) ON DELETE RESTRICT,
  fecha                  DATE         NOT NULL,
  hora_inicio            TIME         NOT NULL,
  hora_fin               TIME         NOT NULL,
  horas_ordinarias       DECIMAL(5,2) NOT NULL DEFAULT 0,
  horas_extra            DECIMAL(5,2) NOT NULL DEFAULT 0,
  horas_recargo_nocturno DECIMAL(5,2) NOT NULL DEFAULT 0,
  horas_calculadas       DECIMAL(5,2) NOT NULL DEFAULT 0,
  estado_turno           VARCHAR(20)  NOT NULL DEFAULT 'Programado',
  cruce_forzado          BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_turnos_usuario_fecha ON tbl_turnos (usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha         ON tbl_turnos (fecha);

-- 6) Actividades del turno (cascade: se eliminan al borrar el turno)
CREATE TABLE IF NOT EXISTS tbl_actividades (
  id          SERIAL  PRIMARY KEY,
  turno_id    INT     NOT NULL REFERENCES tbl_turnos(id) ON DELETE CASCADE,
  descripcion TEXT    NOT NULL,
  completada  BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7) Novedades reportadas por operarios (cascade: se eliminan al borrar el turno)
CREATE TABLE IF NOT EXISTS tbl_novedades (
  id            SERIAL      PRIMARY KEY,
  turno_id      INT         NOT NULL REFERENCES tbl_turnos(id) ON DELETE CASCADE,
  tipo_novedad  VARCHAR(50) NOT NULL,
  descripcion   TEXT        NOT NULL,
  fecha_reporte TIMESTAMPTZ NOT NULL DEFAULT now()
);