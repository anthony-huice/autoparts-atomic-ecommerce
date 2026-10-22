-- =============================================================================
-- MIGRACIÓN 042: Control de Concurrencia de Inventario con Bloqueo Pesimista
--                (SELECT ... FOR UPDATE) y Checkout Transaccional Atómico
-- =============================================================================
-- Propósito:
--   Garantizar consistencia transaccional estricta (ACID) en compras simultáneas
--   de repuestos automotrices, eliminando condiciones de carrera (race conditions)
--   y sobre-venta (overselling) cuando múltiples compradores intentan adquirir
--   las últimas unidades de un SKU en el mismo milisegundo.
-- =============================================================================

-- 1. Extender la tabla `repuestos` con columnas de stock atómico y especificaciones JSONB
ALTER TABLE public.repuestos
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 5 CHECK (stock >= 0),
  ADD COLUMN IF NOT EXISTS especificaciones JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_repuestos_stock_disponible
  ON public.repuestos (stock)
  WHERE deleted_at IS NULL AND estado = 'ACTIVO';

CREATE INDEX IF NOT EXISTS idx_repuestos_especificaciones_gin
  ON public.repuestos USING GIN (especificaciones);

-- 2. Tabla de auditoría de órdenes transaccionales
CREATE TABLE IF NOT EXISTS public.ordenes_compra_repuestos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  repuesto_id       UUID          NOT NULL REFERENCES public.repuestos(id),
  comprador_auth_id UUID          NULL,
  cantidad          INTEGER       NOT NULL CHECK (cantidad > 0),
  precio_unitario   DECIMAL(12,2) NOT NULL,
  total_usd         DECIMAL(12,2) NOT NULL,
  stock_previo      INTEGER       NOT NULL,
  stock_restante    INTEGER       NOT NULL,
  modo_sandbox      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ordenes_compra_repuestos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ordenes_lectura_publica_sandbox" ON public.ordenes_compra_repuestos;
CREATE POLICY "ordenes_lectura_publica_sandbox"
  ON public.ordenes_compra_repuestos
  FOR SELECT
  USING (TRUE);

-- =============================================================================
-- FUNCIÓN RPC: reservar_y_descontar_stock_atomico
-- =============================================================================
-- Adquiere un bloqueo exclusivo a nivel de fila (ROW-LEVEL LOCK) mediante
-- `SELECT ... FOR UPDATE`. Cualquier transacción concurrente sobre el mismo
-- `p_repuesto_id` queda encolada por el motor PostgreSQL hasta que esta
-- transacción haga COMMIT o ROLLBACK, impidiendo lecturas sucias o sobre-venta.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reservar_y_descontar_stock_atomico(
  p_repuesto_id UUID,
  p_cantidad    INTEGER DEFAULT 1,
  p_es_sandbox  BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_actual  INTEGER;
  v_precio        DECIMAL(12,2);
  v_estado        estado_publicacion_enum;
  v_nuevo_stock   INTEGER;
  v_nuevo_estado  estado_publicacion_enum;
  v_orden_id      UUID;
  v_inicio_tx     TIMESTAMPTZ := clock_timestamp();
  v_duracion_ms   NUMERIC(10,3);
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad solicitada debe ser mayor a 0.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ---------------------------------------------------------------------------
  -- PASO CRÍTICO: Bloqueo Pesimista de Fila (SELECT ... FOR UPDATE)
  -- Serializa el acceso concurrente exclusivamente sobre la fila del SKU.
  -- ---------------------------------------------------------------------------
  SELECT stock, precio, estado
    INTO v_stock_actual, v_precio, v_estado
    FROM public.repuestos
   WHERE id = p_repuesto_id
     AND deleted_at IS NULL
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El repuesto solicitado no existe o fue retirado del catálogo.'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_estado != 'ACTIVO' OR v_stock_actual < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para completar la transacción (Disponible: %, Solicitado: %).',
      v_stock_actual, p_cantidad
      USING ERRCODE = 'check_violation';
  END IF;

  -- Calcular nuevo inventario y transición automática de estado
  v_nuevo_stock := v_stock_actual - p_cantidad;
  v_nuevo_estado := CASE WHEN v_nuevo_stock = 0 THEN 'VENDIDO'::estado_publicacion_enum ELSE v_estado END;

  UPDATE public.repuestos
     SET stock       = v_nuevo_stock,
         estado      = v_nuevo_estado,
         fecha_venta = CASE WHEN v_nuevo_stock = 0 THEN NOW() ELSE fecha_venta END
   WHERE id = p_repuesto_id;

  -- Registrar recibo de auditoría en la misma transacción atómica
  INSERT INTO public.ordenes_compra_repuestos (
    repuesto_id,
    comprador_auth_id,
    cantidad,
    precio_unitario,
    total_usd,
    stock_previo,
    stock_restante,
    modo_sandbox
  )
  VALUES (
    p_repuesto_id,
    auth.uid(),
    p_cantidad,
    v_precio,
    v_precio * p_cantidad,
    v_stock_actual,
    v_nuevo_stock,
    p_es_sandbox
  )
  RETURNING id INTO v_orden_id;

  v_duracion_ms := ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_inicio_tx)) * 1000.0, 3);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'orden_id', v_orden_id,
    'repuesto_id', p_repuesto_id,
    'stock_previo', v_stock_actual,
    'stock_restante', v_nuevo_stock,
    'estado_publicacion', v_nuevo_estado,
    'total_usd', v_precio * p_cantidad,
    'lock_strategy', 'SELECT_FOR_UPDATE',
    'execution_time_ms', v_duracion_ms
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reservar_y_descontar_stock_atomico(UUID, INTEGER, BOOLEAN) TO anon, authenticated;
