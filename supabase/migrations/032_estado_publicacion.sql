-- =============================================================================
-- MIGRACIÓN 032: Estado de Publicación, Fecha de Venta y Contador de Vistas
-- Descripción: Agrega a `vehiculos` y `repuestos` los campos necesarios para
--              el módulo "Centro de Mando":
--                - `estado`      ENUM: ACTIVO (default) | PAUSADO | VENDIDO
--                - `fecha_venta` TIMESTAMPTZ: se puebla cuando estado → VENDIDO
--                - `vistas`      INT: contador atómico de visitas al detalle
--
-- NOTAS DE DISEÑO:
--   - El ENUM `estado_publicacion_enum` es compartido por ambas tablas.
--   - `DEFAULT 'ACTIVO'` garantiza retrocompatibilidad con registros existentes.
--   - Los índices parciales son B-tree sobre el campo estado para filtrado
--     eficiente en el catálogo público y en el panel aliado.
--   - Las políticas RLS de UPDATE en vehiculos y repuestos (migración 006)
--     ya cubren estos nuevos campos porque aplican a TODA la fila;
--     no se requieren nuevas políticas RLS.
--
-- Sincronización de tipos: después de aplicar esta migración ejecutar
--   supabase gen types typescript   o actualizar types/database.ts manualmente.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- ENUM: estado_publicacion_enum
-- Valores canónicos del ciclo de vida de una publicación.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE estado_publicacion_enum AS ENUM (
    'ACTIVO',   -- Visible en el catálogo público
    'PAUSADO',  -- Ocultado temporalmente por el vendedor
    'VENDIDO'   -- Vendido; visible con lazo (ribbon) por 7 días, luego se oculta
  );
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'El tipo estado_publicacion_enum ya existe. Se omite.';
END $$;


-- ---------------------------------------------------------------------------
-- TABLA: vehiculos — nuevos campos
-- ---------------------------------------------------------------------------

ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS estado      estado_publicacion_enum NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN IF NOT EXISTS fecha_venta TIMESTAMPTZ             NULL,
  ADD COLUMN IF NOT EXISTS vistas      INTEGER                 NOT NULL DEFAULT 0;

-- Índice parcial: búsqueda de publicaciones activas en catálogo público
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado
  ON vehiculos (estado)
  WHERE deleted_at IS NULL;

-- Índice compuesto para la query del catálogo público (estado + fecha_venta)
-- Cubre el filtro: ACTIVO OR (VENDIDO AND fecha_venta >= NOW() - INTERVAL '7 days')
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado_fecha_venta
  ON vehiculos (estado, fecha_venta)
  WHERE deleted_at IS NULL;

-- Índice para el panel aliado: listar publicaciones de una empresa
CREATE INDEX IF NOT EXISTS idx_vehiculos_vendedor_empresa_estado
  ON vehiculos (vendedor_empresa_id, estado)
  WHERE deleted_at IS NULL AND vendedor_empresa_id IS NOT NULL;

-- Constraint: fecha_venta solo puede tener valor cuando el estado es VENDIDO
ALTER TABLE vehiculos DROP CONSTRAINT IF EXISTS chk_vehiculos_fecha_venta_estado;
ALTER TABLE vehiculos ADD CONSTRAINT chk_vehiculos_fecha_venta_estado CHECK (
  (estado = 'VENDIDO' AND fecha_venta IS NOT NULL) OR
  (estado <> 'VENDIDO' AND fecha_venta IS NULL)
);

COMMENT ON COLUMN vehiculos.estado      IS 'Estado del ciclo de vida de la publicación. DEFAULT ACTIVO. (032_estado_publicacion.sql)';
COMMENT ON COLUMN vehiculos.fecha_venta IS 'Fecha exacta en que se marcó como VENDIDO. NULL si no está vendido. (032)';
COMMENT ON COLUMN vehiculos.vistas      IS 'Contador atómico de visitas a la página de detalle del vehículo. (032)';


-- ---------------------------------------------------------------------------
-- TABLA: repuestos — nuevos campos (patrón idéntico a vehiculos)
-- ---------------------------------------------------------------------------

ALTER TABLE repuestos
  ADD COLUMN IF NOT EXISTS estado      estado_publicacion_enum NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN IF NOT EXISTS fecha_venta TIMESTAMPTZ             NULL,
  ADD COLUMN IF NOT EXISTS vistas      INTEGER                 NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_repuestos_estado
  ON repuestos (estado)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_repuestos_estado_fecha_venta
  ON repuestos (estado, fecha_venta)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_repuestos_vendedor_empresa_estado
  ON repuestos (vendedor_empresa_id, estado)
  WHERE deleted_at IS NULL AND vendedor_empresa_id IS NOT NULL;

ALTER TABLE repuestos DROP CONSTRAINT IF EXISTS chk_repuestos_fecha_venta_estado;
ALTER TABLE repuestos ADD CONSTRAINT chk_repuestos_fecha_venta_estado CHECK (
  (estado = 'VENDIDO' AND fecha_venta IS NOT NULL) OR
  (estado <> 'VENDIDO' AND fecha_venta IS NULL)
);

COMMENT ON COLUMN repuestos.estado      IS 'Estado del ciclo de vida de la publicación. DEFAULT ACTIVO. (032_estado_publicacion.sql)';
COMMENT ON COLUMN repuestos.fecha_venta IS 'Fecha exacta en que se marcó como VENDIDO. NULL si no está vendido. (032)';
COMMENT ON COLUMN repuestos.vistas      IS 'Contador atómico de visitas a la página de detalle del repuesto. (032)';
