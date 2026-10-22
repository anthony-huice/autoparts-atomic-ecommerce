-- =============================================================================
-- MIGRACIÓN 003: Tablas `empresas` y `empleados_empresa`
-- Descripción: `empresas` unifica aliados comerciales y concesionarios en una
--              única entidad discriminada por tipo_empresa (DIRECTRICES §2).
--              `empleados_empresa` es la tabla puente de relación laboral.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tabla: empresas
-- ---------------------------------------------------------------------------
CREATE TABLE empresas (
  id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_empresa        tipo_empresa_enum NOT NULL,
  razon_social        VARCHAR           NOT NULL,
  nombre_comercial    VARCHAR           NOT NULL, -- "NOMBRE ESTABLECIMIENTO" en el formulario
  rif                 VARCHAR           NOT NULL UNIQUE,
  direccion           TEXT              NOT NULL, -- Dirección fiscal
  telefonos           TEXT[]            NOT NULL CHECK (array_length(telefonos, 1) > 0),
  correo              VARCHAR           NOT NULL UNIQUE,
  pagina_web          VARCHAR           NOT NULL, -- "PAGINA WEB O REDES" del formulario
  foto_establecimiento_url VARCHAR      NOT NULL, -- URL en Supabase Storage (bucket público)
  -- Geolocalización del establecimiento (aplica a ALIADOS y CONCESIONARIOS)
  -- Estructura: { "estado": "...", "ciudad": "...", "lat": 0.0, "lng": 0.0 }
  ubicacion           JSONB             NOT NULL DEFAULT '{}',
  -- Agrupa todos los documentos legales en un JSONB flexible.
  -- Estructura completa:
  -- {
  --   "nombre_registro":    "Registro Mercantil Primero",
  --   "circunscripcion":    "Circunscripción Judicial del Área Metropolitana",
  --   "tomo":               "15-A",
  --   "folio":              "42",
  --   "nro_expediente":     "12345",
  --   "fecha_registro":     "2010-03-15",
  --   "rif_url":            "https://...supabase.co/storage/v1/...",
  --   "urls":               ["https://...registro_mercantil.pdf"]
  -- }
  documentos_legales  JSONB             NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ       NULL      -- Soft Delete: NULL = activo
);

-- Índice sobre RIF para búsquedas por identificador tributario
CREATE INDEX idx_empresas_rif ON empresas (rif);

-- Índice parcial para empresas activas
CREATE INDEX idx_empresas_activas ON empresas (id) WHERE deleted_at IS NULL;

-- Índices de expresión para filtrar por ubicación del establecimiento.
-- B-tree sobre clave extraída: eficiente para igualdad exacta en queries de directorio.
CREATE INDEX idx_empresas_ubicacion_estado ON empresas ((ubicacion->>'estado'));
CREATE INDEX idx_empresas_ubicacion_ciudad ON empresas ((ubicacion->>'ciudad'));

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Tabla: empleados_empresa
-- Tabla puente entre personas y empresas. Registra el rol laboral o
-- administrativo de una persona dentro de un ente jurídico.
-- ---------------------------------------------------------------------------
CREATE TABLE empleados_empresa (
  id                    UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID      NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  persona_id            UUID      NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  cargo                 VARCHAR   NOT NULL,          -- Ej: 'Gerente de Ventas'
  es_representante_legal BOOLEAN  NOT NULL DEFAULT FALSE,

  -- Restricción: una persona no puede tener el mismo cargo en la misma empresa dos veces
  CONSTRAINT uq_empleado_empresa_persona UNIQUE (empresa_id, persona_id, cargo)
);

CREATE INDEX idx_empleados_empresa_empresa_id ON empleados_empresa (empresa_id);
CREATE INDEX idx_empleados_empresa_persona_id ON empleados_empresa (persona_id);

ALTER TABLE empleados_empresa ENABLE ROW LEVEL SECURITY;
