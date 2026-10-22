-- =============================================================================
-- MIGRACIÓN 004: Tabla `vehiculos`
-- Descripción: Inventario principal de vehículos. Implementa el patrón
--              polimórfico de vendedor (PARTICULAR vs EMPRESA) mediante
--              el campo vendedor_tipo y dos FK opcionales mutuamente excluyentes.
--              Soft Delete habilitado (DIRECTRICES §2).
--              Precio estrictamente en USD DECIMAL(12,2) (DIRECTRICES §2).
--              `creado_por_auth_id`: permite RLS de evaluación directa en fila
--              (sin subconsulta) y auditoría de empleado exacto en empresas.
-- =============================================================================

CREATE TABLE vehiculos (
  id                    UUID                NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Propietario legal del vehículo (quien aparece en los papeles)
  propietario_id        UUID                NOT NULL REFERENCES personas(id),

  -- Patrón polimórfico de vendedor:
  -- Si vendedor_tipo = 'PARTICULAR'    → vendedor_persona_id  tiene valor, vendedor_empresa_id es NULL
  -- Si vendedor_tipo = 'CONCESIONARIO' → vendedor_empresa_id tiene valor, vendedor_persona_id es NULL
  vendedor_tipo         vendedor_tipo_enum  NOT NULL,
  vendedor_persona_id   UUID                REFERENCES personas(id),
  vendedor_empresa_id   UUID                REFERENCES empresas(id),

  -- Atributos del vehículo
  marca                 VARCHAR             NOT NULL,
  modelo                VARCHAR             NOT NULL,
  anio                  INTEGER             NOT NULL CHECK (anio >= 1886 AND anio <= EXTRACT(YEAR FROM NOW()) + 1),
  color                 VARCHAR             NOT NULL,
  tipo_vehiculo         tipo_vehiculo_enum  NOT NULL,   -- CARGA, SEDAN, SUV, MINIVAN, PICKUP, MOTO
  transmision           transmision_enum    NOT NULL,
  kilometraje           INTEGER             NOT NULL CHECK (kilometraje >= 0),
  combustible           combustible_enum    NOT NULL,
  cantidad_puertas      SMALLINT            CHECK (cantidad_puertas > 0),
  cantidad_ejes         SMALLINT            CHECK (cantidad_ejes > 0),
  cantidad_duenos       SMALLINT            NOT NULL DEFAULT 1 CHECK (cantidad_duenos >= 1),

  -- Identificadores únicos del vehículo (ocultos en publicación pública)
  serial_motor          VARCHAR             NOT NULL UNIQUE,
  serial_carroceria     VARCHAR             NOT NULL UNIQUE,
  placas                VARCHAR             NOT NULL UNIQUE,

  -- Estado administrativo y comercial
  papeles_al_dia        BOOLEAN             NOT NULL,
  precio                DECIMAL(12,2)       NOT NULL CHECK (precio >= 0),  -- Siempre en USD
  negociable            BOOLEAN             NOT NULL DEFAULT FALSE,
  observacion           TEXT,                            -- Campo libre de observaciones del vendedor

  -- Ubicación flexible: { "estado": "...", "ciudad": "...", "lat": 0.0, "lng": 0.0 }
  ubicacion             JSONB               NOT NULL DEFAULT '{}',

  -- Autoría y auditoría:
  -- `creado_por_auth_id` = auth.uid() del usuario que ejecutó el INSERT.
  -- Propósitos duales:
  --   1. RLS en fila: evita subconsultas por cada fila evaluada (antipatrón de rendimiento).
  --      Ejemplo de política óptima: USING (creado_por_auth_id = auth.uid())
  --   2. Auditoría: en empresas con múltiples empleados, identifica cuál
  --      de ellos creó esta publicación específica.
  creado_por_auth_id    UUID                NOT NULL REFERENCES auth.users(id),

  created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ         NULL,  -- Soft Delete: NULL = activo

  -- Constraint de integridad polimórfica:
  -- Garantiza que el vendedor corresponda al tipo declarado
  CONSTRAINT chk_vendedor_polimorfismo CHECK (
    (vendedor_tipo = 'PARTICULAR' AND vendedor_persona_id  IS NOT NULL AND vendedor_empresa_id IS NULL) OR
    (vendedor_tipo = 'EMPRESA'    AND vendedor_empresa_id  IS NOT NULL AND vendedor_persona_id IS NULL)
  )
);

-- Índice primario de búsqueda por placa
CREATE INDEX idx_vehiculos_placas ON vehiculos (placas);

-- Índice crítico para RLS: Supabase lo usa en cada evaluación de política por fila
CREATE INDEX idx_vehiculos_creado_por ON vehiculos (creado_por_auth_id);

-- Índices para filtrado en catálogo
CREATE INDEX idx_vehiculos_marca_modelo ON vehiculos (marca, modelo);
CREATE INDEX idx_vehiculos_anio         ON vehiculos (anio);
CREATE INDEX idx_vehiculos_precio       ON vehiculos (precio);
CREATE INDEX idx_vehiculos_vendedor_empresa ON vehiculos (vendedor_empresa_id) WHERE vendedor_empresa_id IS NOT NULL;

-- Índices de expresión para filtrar por ubicación geográfica.
-- Tipo B-tree (no GIN): las queries de catálogo usan igualdad exacta
-- (WHERE ubicacion->>'ciudad' = 'Caracas'), no containment (@>).
-- GIN consumiría espacio y escrituras extra sin beneficiar este patrón de consulta.
CREATE INDEX idx_vehiculos_ubicacion_estado ON vehiculos ((ubicacion->>'estado'));
CREATE INDEX idx_vehiculos_ubicacion_ciudad ON vehiculos ((ubicacion->>'ciudad'));

-- Índice parcial: solo vehículos activos (no eliminados lógicamente)
CREATE INDEX idx_vehiculos_activos ON vehiculos (id) WHERE deleted_at IS NULL;

ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
