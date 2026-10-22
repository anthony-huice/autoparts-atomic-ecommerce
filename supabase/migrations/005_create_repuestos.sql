-- =============================================================================
-- MIGRACIÓN 005: Tablas `categorias_repuestos`, `repuestos` y
--                `compatibilidad_repuestos`
-- Descripción: Motor de búsqueda de inventario de repuestos.
--              - `categorias_repuestos`: Catálogo estático de categorías.
--              - `repuestos`: Inventario de repuestos con patrón polimórfico
--                de vendedor idéntico al de vehículos.
--              - `compatibilidad_repuestos`: Tabla puente para búsquedas
--                cruzadas repuesto↔vehículo por marca/modelo/año.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tabla: categorias_repuestos (Catálogo estático)
-- ---------------------------------------------------------------------------
CREATE TABLE categorias_repuestos (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  VARCHAR NOT NULL UNIQUE  -- Ej: 'Frenos', 'Motor', 'Suspensión'
);

-- Seed inicial de categorías comunes (extensible)
INSERT INTO categorias_repuestos (nombre) VALUES
  ('Motor'),
  ('Frenos'),
  ('Suspensión'),
  ('Transmisión'),
  ('Eléctrico'),
  ('Carrocería'),
  ('Enfriamiento'),
  ('Dirección'),
  ('Escape'),
  ('Iluminación'),
  ('Filtros'),
  ('Accesorios');

-- ---------------------------------------------------------------------------
-- Tabla: repuestos
-- ---------------------------------------------------------------------------
CREATE TABLE repuestos (
  id                  UUID                NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id        UUID                NOT NULL REFERENCES categorias_repuestos(id),

  -- Patrón polimórfico de vendedor (idéntico a vehiculos)
  vendedor_tipo       vendedor_tipo_enum  NOT NULL,
  vendedor_persona_id UUID                REFERENCES personas(id),
  vendedor_empresa_id UUID                REFERENCES empresas(id),

  -- Atributos del repuesto
  nombre_repuesto     VARCHAR             NOT NULL,
  marca_repuesto      VARCHAR,            -- Fabricante del repuesto (Ej: Bosch, Gates, Denso)
  numero_parte        VARCHAR,            -- Código de fabricante para búsqueda rápida
  es_nuevo            BOOLEAN             NOT NULL,
  precio              DECIMAL(12,2)       NOT NULL CHECK (precio >= 0),  -- Siempre en USD
  negociable          BOOLEAN             NOT NULL DEFAULT FALSE,
  observacion         TEXT,               -- Campo libre de observaciones del vendedor

  -- Ubicación flexible: { "estado": "...", "ciudad": "...", "lat": 0.0, "lng": 0.0 }
  ubicacion           JSONB               NOT NULL DEFAULT '{}',

  -- Autoría y auditoría (mismo patrón que vehiculos):
  -- Permite RLS sin subconsulta: USING (creado_por_auth_id = auth.uid())
  -- Identifica al empleado exacto que publicó este repuesto.
  creado_por_auth_id  UUID                NOT NULL REFERENCES auth.users(id),

  created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ         NULL,  -- Soft Delete: NULL = activo

  -- Constraint de integridad polimórfica (igual que vehiculos)
  CONSTRAINT chk_repuesto_vendedor_polimorfismo CHECK (
    (vendedor_tipo = 'PARTICULAR' AND vendedor_persona_id  IS NOT NULL AND vendedor_empresa_id IS NULL) OR
    (vendedor_tipo = 'EMPRESA'    AND vendedor_empresa_id  IS NOT NULL AND vendedor_persona_id IS NULL)
  )
);

-- Índice sobre número de parte para búsquedas por código de fabricante
CREATE INDEX idx_repuestos_numero_parte ON repuestos (numero_parte) WHERE numero_parte IS NOT NULL;

-- Índice crítico para RLS
CREATE INDEX idx_repuestos_creado_por ON repuestos (creado_por_auth_id);

-- Índices para filtrado en catálogo
CREATE INDEX idx_repuestos_categoria   ON repuestos (categoria_id);
CREATE INDEX idx_repuestos_precio      ON repuestos (precio);
CREATE INDEX idx_repuestos_es_nuevo    ON repuestos (es_nuevo);

-- Índices de expresión para filtrar por ubicación geográfica.
-- B-tree sobre clave extraída: eficiente para igualdad exacta en queries de catálogo.
CREATE INDEX idx_repuestos_ubicacion_estado ON repuestos ((ubicacion->>'estado'));
CREATE INDEX idx_repuestos_ubicacion_ciudad ON repuestos ((ubicacion->>'ciudad'));

-- Índice parcial: solo repuestos activos
CREATE INDEX idx_repuestos_activos ON repuestos (id) WHERE deleted_at IS NULL;

ALTER TABLE repuestos ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Tabla: compatibilidad_repuestos
-- Motor de búsqueda cruzada: dado un vehículo (marca/modelo/año),
-- encuentra todos los repuestos compatibles y viceversa.
-- ON DELETE CASCADE: si se elimina el repuesto (físicamente), se limpian
-- sus compatibilidades. El Soft Delete en repuestos no activa este CASCADE.
-- ---------------------------------------------------------------------------
CREATE TABLE compatibilidad_repuestos (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  repuesto_id     UUID    NOT NULL REFERENCES repuestos(id) ON DELETE CASCADE,
  marca_vehiculo  VARCHAR NOT NULL,   -- Ej: 'Toyota'
  modelo_vehiculo VARCHAR NOT NULL,   -- Ej: 'Corolla'
  anio_desde      INTEGER NOT NULL CHECK (anio_desde >= 1886),
  anio_hasta      INTEGER NOT NULL CHECK (anio_hasta >= 1886),

  -- Rango coherente: el año final no puede ser anterior al inicial
  CONSTRAINT chk_anio_rango CHECK (anio_hasta >= anio_desde),

  -- Evita duplicados exactos de compatibilidad
  CONSTRAINT uq_compatibilidad UNIQUE (repuesto_id, marca_vehiculo, modelo_vehiculo, anio_desde, anio_hasta)
);

-- Índice compuesto para la búsqueda cruzada principal:
-- "¿Qué repuestos sirven para un Toyota Corolla 2012?"
CREATE INDEX idx_compatibilidad_vehiculo
  ON compatibilidad_repuestos (marca_vehiculo, modelo_vehiculo, anio_desde, anio_hasta);

CREATE INDEX idx_compatibilidad_repuesto_id
  ON compatibilidad_repuestos (repuesto_id);

ALTER TABLE compatibilidad_repuestos ENABLE ROW LEVEL SECURITY;
