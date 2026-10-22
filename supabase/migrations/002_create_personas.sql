-- =============================================================================
-- MIGRACIÓN 002: Tabla `personas`
-- Descripción: Almacena cualquier individuo del sistema (comprador, empleado,
--              dueño de concesionario, vendedor particular). Entidad unificada
--              según DIRECTRICES §2 "Unificación de Entidades".
-- =============================================================================

CREATE TABLE personas (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Enlace con Supabase Auth (auth.users.id).
  -- Una persona del sistema = una cuenta de autenticación.
  -- Las políticas RLS en vehiculos/repuestos navegan:
  --   propietario_id → personas.auth_user_id = auth.uid()
  auth_user_id        UUID          UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nombres             VARCHAR       NOT NULL,
  apellidos           VARCHAR       NOT NULL,
  -- 'V' = Venezolano | 'E' = Extranjero | 'P' = Pasaporte
  nacionalidad        CHAR(1)       NOT NULL CHECK (nacionalidad IN ('V', 'E', 'P')),
  cedula_pasaporte    VARCHAR       NOT NULL UNIQUE,
  fecha_nacimiento    DATE,
  direccion_residencia TEXT,                            -- Campo presente en: Representante, Empleado, Anunciante, Propietario, Vendedor
  telefonos           TEXT[]        NOT NULL DEFAULT '{}',
  correo              VARCHAR       NOT NULL UNIQUE,
  -- Arreglo flexible: puede contener URLs de Instagram, TikTok, etc.
  redes_sociales      TEXT[]        NOT NULL DEFAULT '{}',
  foto_cedula_url     VARCHAR,                          -- URL en Supabase Storage (bucket privado)
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ   NULL                -- Soft Delete: NULL = activo
);

-- Índice sobre cédula/pasaporte para búsquedas rápidas por documento
CREATE INDEX idx_personas_cedula_pasaporte ON personas (cedula_pasaporte);

-- Índice sobre auth_user_id para resolver FK en políticas RLS sin table-scan
CREATE INDEX idx_personas_auth_user_id ON personas (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Índice parcial: excluye registros eliminados lógicamente de los índices activos
CREATE INDEX idx_personas_activas ON personas (id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------
-- Habilitar Row Level Security (RLS)
-- NOTA: Las políticas de acceso diferenciado por rol se definen
--       en la migración 007_rls_policies.sql tras crear todos los roles.
-- -----------------------------------------------------------------------
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
