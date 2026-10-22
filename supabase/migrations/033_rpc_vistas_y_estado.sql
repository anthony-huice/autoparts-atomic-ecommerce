-- =============================================================================
-- MIGRACIÓN 033: Funciones RPC — Vistas Atómicas y Gestión de Estado
-- Descripción: Define 4 funciones PL/pgSQL para el Centro de Mando:
--
--   1. incrementar_vistas_vehiculo  — Contador atómico de visitas (sin auth)
--   2. incrementar_vistas_repuesto  — Ídem para repuestos
--   3. actualizar_estado_publicacion_vehiculo — Pausa / Marca Vendido / Reactiva
--   4. actualizar_estado_publicacion_repuesto — Ídem para repuestos
--
-- MODELO DE AUTORIZACIÓN (Funciones 3 y 4):
--   El usuario puede gestionar una publicación si cumple UNA de estas condiciones:
--     A) Es el autor directo: creado_por_auth_id = auth.uid()
--     B) Pertenece a la misma empresa vendedora:
--        vendedor_empresa_id IS NOT NULL
--        AND EXISTS (empleados_empresa JOIN personas WHERE auth_user_id = auth.uid())
--   Este modelo respeta el requisito de concesionarios/aliados donde cualquier
--   empleado activo puede gestionar el inventario de la empresa.
--
-- SEGURIDAD:
--   - Funciones 1 y 2: SECURITY DEFINER (necesario para evitar que RLS de UPDATE
--     bloquee el contador de vistas de visitantes anónimos). La función valida
--     que el vehiculo/repuesto existe y está activo antes del UPDATE.
--     El riesgo es mínimo: solo incrementa un contador, no muta datos sensibles.
--   - Funciones 3 y 4: SECURITY INVOKER — las políticas RLS del propietario
--     se aplican. La función agrega la verificación de empresa por encima.
--
-- CONCURRENCIA:
--   El UPDATE atómico (vistas = vistas + 1) en PostgreSQL es seguro para
--   concurrencia alta gracias a MVCC + bloqueo exclusivo de fila durante el UPDATE.
--   No se requiere SELECT FOR UPDATE adicional para un simple incremento de entero.
-- =============================================================================


-- =============================================================================
-- FUNCIÓN 1: incrementar_vistas_vehiculo
--
-- Propósito: Contar una visita a la página de detalle de un vehículo de forma
--            atómica. Llamada desde un Client Component (<ViewTracker />) al
--            montarse en el navegador, garantizando conteo real (no ISR/caché).
--
-- Por qué SECURITY DEFINER:
--   La política RLS vehiculos_update_propietario bloquea UPDATEs de visitantes
--   no propietarios. El contador de vistas debe funcionar para cualquier usuario
--   (incluso anónimo). SECURITY DEFINER ejecuta con privilegios del owner (postgres)
--   y así bypasea RLS de forma acotada a esta sola operación de incremento.
--
-- Parámetros:
--   p_vehiculo_id UUID — ID del vehículo cuyas vistas se incrementan.
--
-- Retorna: VOID. El frontend no necesita el valor nuevo del contador.
-- =============================================================================

CREATE OR REPLACE FUNCTION incrementar_vistas_vehiculo(
  p_vehiculo_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo incrementar si el vehículo existe, está activo (no eliminado) y
  -- no está PAUSADO ni VENDIDO (no tiene sentido contar vistas ocultas).
  UPDATE vehiculos
  SET    vistas = vistas + 1
  WHERE  id         = p_vehiculo_id
    AND  deleted_at IS NULL
    AND  estado     = 'ACTIVO';

  -- Si no existe o no cumple la condición: silencioso (no es un error).
  -- El frontend no debe romper por esto.
END;
$$;

COMMENT ON FUNCTION incrementar_vistas_vehiculo(UUID) IS
  'RPC atómico: incrementa el contador de vistas de un vehículo activo. '
  'SECURITY DEFINER para funcionar con visitantes anónimos. '
  'Invocado desde <ViewTracker /> (Client Component) en la página de detalle. (033)';

-- Permisos: anon y authenticated pueden invocar (es una lectura-escritura controlada)
GRANT EXECUTE ON FUNCTION incrementar_vistas_vehiculo(UUID) TO anon, authenticated;


-- =============================================================================
-- FUNCIÓN 2: incrementar_vistas_repuesto
-- Patrón idéntico a incrementar_vistas_vehiculo.
-- =============================================================================

CREATE OR REPLACE FUNCTION incrementar_vistas_repuesto(
  p_repuesto_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE repuestos
  SET    vistas = vistas + 1
  WHERE  id         = p_repuesto_id
    AND  deleted_at IS NULL
    AND  estado     = 'ACTIVO';
END;
$$;

COMMENT ON FUNCTION incrementar_vistas_repuesto(UUID) IS
  'RPC atómico: incrementa el contador de vistas de un repuesto activo. '
  'SECURITY DEFINER para visitantes anónimos. (033)';

GRANT EXECUTE ON FUNCTION incrementar_vistas_repuesto(UUID) TO anon, authenticated;


-- =============================================================================
-- FUNCIÓN 3: actualizar_estado_publicacion_vehiculo
--
-- Propósito: Cambiar el estado de una publicación de vehículo de forma atómica.
--            Gestiona automáticamente fecha_venta según el nuevo estado.
--
-- Autorización (modelo de empresa — Requisito del usuario):
--   El llamante puede gestionar el vehículo si:
--   A) Es el autor: creado_por_auth_id = auth.uid()
--   B) Pertenece a la empresa vendedora: empleados_empresa con auth_user_id activo
--
-- Parámetros:
--   p_vehiculo_id  UUID                    — ID del vehículo a gestionar.
--   p_nuevo_estado estado_publicacion_enum — ACTIVO | PAUSADO | VENDIDO
--
-- Retorna: VOID.
--
-- Errores:
--   - 'insufficient_privilege' si el usuario no es propietario/empleado de empresa.
--   - 'no_data_found' si el vehículo no existe o está eliminado.
-- =============================================================================

CREATE OR REPLACE FUNCTION actualizar_estado_publicacion_vehiculo(
  p_vehiculo_id  UUID,
  p_nuevo_estado estado_publicacion_enum
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid         UUID;
  v_empresa_id       UUID;
  v_tiene_permiso    BOOLEAN := FALSE;
  v_vehiculo_count   INTEGER;
BEGIN
  v_auth_uid := auth.uid();

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'actualizar_estado_publicacion_vehiculo: usuario no autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── Verificar que el vehículo existe y está activo ────────────────────────
  SELECT COUNT(*) INTO v_vehiculo_count
  FROM   vehiculos
  WHERE  id         = p_vehiculo_id
    AND  deleted_at IS NULL;

  IF v_vehiculo_count = 0 THEN
    RAISE EXCEPTION 'actualizar_estado_publicacion_vehiculo: vehículo % no encontrado o eliminado.', p_vehiculo_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- ── Verificación de autorización ─────────────────────────────────────────
  --
  -- CONDICIÓN A: El usuario es el autor directo de la publicación.
  SELECT COUNT(*) > 0 INTO v_tiene_permiso
  FROM   vehiculos v
  WHERE  v.id                 = p_vehiculo_id
    AND  v.creado_por_auth_id = v_auth_uid
    AND  v.deleted_at         IS NULL;

  -- CONDICIÓN B: El usuario pertenece a la empresa vendedora del vehículo.
  IF NOT v_tiene_permiso THEN
    -- Primero obtenemos el empresa_id del vehículo (si es vendedor empresa)
    SELECT v.vendedor_empresa_id INTO v_empresa_id
    FROM   vehiculos v
    WHERE  v.id         = p_vehiculo_id
      AND  v.deleted_at IS NULL
      AND  v.vendedor_empresa_id IS NOT NULL;

    IF v_empresa_id IS NOT NULL THEN
      SELECT COUNT(*) > 0 INTO v_tiene_permiso
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id  = v_empresa_id
        AND  p.auth_user_id = v_auth_uid
        AND  p.deleted_at   IS NULL;
    END IF;
  END IF;

  IF NOT v_tiene_permiso THEN
    RAISE EXCEPTION 'actualizar_estado_publicacion_vehiculo: sin permiso para gestionar el vehículo %.',
      p_vehiculo_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── Aplicar el nuevo estado ───────────────────────────────────────────────
  --
  -- Reglas de fecha_venta:
  --   VENDIDO  → fecha_venta = NOW() (marca el inicio del período de 7 días del lazo)
  --   ACTIVO / PAUSADO → fecha_venta = NULL (limpia la fecha de venta anterior)
  --
  -- Nota: El CHECK CONSTRAINT chk_vehiculos_fecha_venta_estado de 032 valida esto.
  UPDATE vehiculos
  SET
    estado      = p_nuevo_estado,
    fecha_venta = CASE
                    WHEN p_nuevo_estado = 'VENDIDO' THEN NOW()
                    ELSE NULL
                  END
  WHERE id = p_vehiculo_id;

END;
$$;

COMMENT ON FUNCTION actualizar_estado_publicacion_vehiculo(UUID, estado_publicacion_enum) IS
  'RPC: cambia el estado (ACTIVO/PAUSADO/VENDIDO) de un vehículo. '
  'Autorización: autor directo O empleado activo de la empresa vendedora. '
  'Gestiona fecha_venta automáticamente. SECURITY INVOKER. (033)';

GRANT EXECUTE ON FUNCTION actualizar_estado_publicacion_vehiculo(UUID, estado_publicacion_enum)
  TO authenticated;


-- =============================================================================
-- FUNCIÓN 4: actualizar_estado_publicacion_repuesto
-- Patrón idéntico a actualizar_estado_publicacion_vehiculo.
-- =============================================================================

CREATE OR REPLACE FUNCTION actualizar_estado_publicacion_repuesto(
  p_repuesto_id  UUID,
  p_nuevo_estado estado_publicacion_enum
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid         UUID;
  v_empresa_id       UUID;
  v_tiene_permiso    BOOLEAN := FALSE;
  v_repuesto_count   INTEGER;
BEGIN
  v_auth_uid := auth.uid();

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'actualizar_estado_publicacion_repuesto: usuario no autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── Verificar existencia ──────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_repuesto_count
  FROM   repuestos
  WHERE  id         = p_repuesto_id
    AND  deleted_at IS NULL;

  IF v_repuesto_count = 0 THEN
    RAISE EXCEPTION 'actualizar_estado_publicacion_repuesto: repuesto % no encontrado o eliminado.', p_repuesto_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- ── Verificación de autorización ─────────────────────────────────────────
  -- CONDICIÓN A: Autor directo
  SELECT COUNT(*) > 0 INTO v_tiene_permiso
  FROM   repuestos r
  WHERE  r.id                 = p_repuesto_id
    AND  r.creado_por_auth_id = v_auth_uid
    AND  r.deleted_at         IS NULL;

  -- CONDICIÓN B: Empleado de la empresa vendedora
  IF NOT v_tiene_permiso THEN
    SELECT r.vendedor_empresa_id INTO v_empresa_id
    FROM   repuestos r
    WHERE  r.id         = p_repuesto_id
      AND  r.deleted_at IS NULL
      AND  r.vendedor_empresa_id IS NOT NULL;

    IF v_empresa_id IS NOT NULL THEN
      SELECT COUNT(*) > 0 INTO v_tiene_permiso
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id  = v_empresa_id
        AND  p.auth_user_id = v_auth_uid
        AND  p.deleted_at   IS NULL;
    END IF;
  END IF;

  IF NOT v_tiene_permiso THEN
    RAISE EXCEPTION 'actualizar_estado_publicacion_repuesto: sin permiso para gestionar el repuesto %.',
      p_repuesto_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── Aplicar el nuevo estado ───────────────────────────────────────────────
  UPDATE repuestos
  SET
    estado      = p_nuevo_estado,
    fecha_venta = CASE
                    WHEN p_nuevo_estado = 'VENDIDO' THEN NOW()
                    ELSE NULL
                  END
  WHERE id = p_repuesto_id;

END;
$$;

COMMENT ON FUNCTION actualizar_estado_publicacion_repuesto(UUID, estado_publicacion_enum) IS
  'RPC: cambia el estado (ACTIVO/PAUSADO/VENDIDO) de un repuesto. '
  'Autorización: autor directo O empleado activo de la empresa vendedora. '
  'Gestiona fecha_venta automáticamente. SECURITY INVOKER. (033)';

GRANT EXECUTE ON FUNCTION actualizar_estado_publicacion_repuesto(UUID, estado_publicacion_enum)
  TO authenticated;


-- =============================================================================
-- FUNCIÓN AUXILIAR: soft_delete_vehiculo
-- Propósito: Ejecutar el Soft Delete de forma segura desde un Server Action.
--            Verifica la misma autorización empresa/propietario antes de
--            setear deleted_at = NOW().
-- =============================================================================

CREATE OR REPLACE FUNCTION soft_delete_vehiculo(
  p_vehiculo_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid         UUID;
  v_empresa_id       UUID;
  v_tiene_permiso    BOOLEAN := FALSE;
BEGIN
  v_auth_uid := auth.uid();

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'soft_delete_vehiculo: usuario no autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Condición A
  SELECT COUNT(*) > 0 INTO v_tiene_permiso
  FROM   vehiculos v
  WHERE  v.id                 = p_vehiculo_id
    AND  v.creado_por_auth_id = v_auth_uid
    AND  v.deleted_at         IS NULL;

  -- Condición B
  IF NOT v_tiene_permiso THEN
    SELECT v.vendedor_empresa_id INTO v_empresa_id
    FROM   vehiculos v
    WHERE  v.id         = p_vehiculo_id
      AND  v.deleted_at IS NULL
      AND  v.vendedor_empresa_id IS NOT NULL;

    IF v_empresa_id IS NOT NULL THEN
      SELECT COUNT(*) > 0 INTO v_tiene_permiso
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id  = v_empresa_id
        AND  p.auth_user_id = v_auth_uid
        AND  p.deleted_at   IS NULL;
    END IF;
  END IF;

  IF NOT v_tiene_permiso THEN
    RAISE EXCEPTION 'soft_delete_vehiculo: sin permiso para eliminar el vehículo %.',
      p_vehiculo_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE vehiculos
  SET    deleted_at = NOW()
  WHERE  id         = p_vehiculo_id
    AND  deleted_at IS NULL;  -- Idempotente: solo actúa sobre registros activos

END;
$$;

COMMENT ON FUNCTION soft_delete_vehiculo(UUID) IS
  'Soft Delete atómico de vehículo con verificación de autorización empresa/propietario. (033)';

GRANT EXECUTE ON FUNCTION soft_delete_vehiculo(UUID) TO authenticated;


-- =============================================================================
-- FUNCIÓN AUXILIAR: soft_delete_repuesto
-- Patrón idéntico a soft_delete_vehiculo.
-- =============================================================================

CREATE OR REPLACE FUNCTION soft_delete_repuesto(
  p_repuesto_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid         UUID;
  v_empresa_id       UUID;
  v_tiene_permiso    BOOLEAN := FALSE;
BEGIN
  v_auth_uid := auth.uid();

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'soft_delete_repuesto: usuario no autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Condición A
  SELECT COUNT(*) > 0 INTO v_tiene_permiso
  FROM   repuestos r
  WHERE  r.id                 = p_repuesto_id
    AND  r.creado_por_auth_id = v_auth_uid
    AND  r.deleted_at         IS NULL;

  -- Condición B
  IF NOT v_tiene_permiso THEN
    SELECT r.vendedor_empresa_id INTO v_empresa_id
    FROM   repuestos r
    WHERE  r.id         = p_repuesto_id
      AND  r.deleted_at IS NULL
      AND  r.vendedor_empresa_id IS NOT NULL;

    IF v_empresa_id IS NOT NULL THEN
      SELECT COUNT(*) > 0 INTO v_tiene_permiso
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id  = v_empresa_id
        AND  p.auth_user_id = v_auth_uid
        AND  p.deleted_at   IS NULL;
    END IF;
  END IF;

  IF NOT v_tiene_permiso THEN
    RAISE EXCEPTION 'soft_delete_repuesto: sin permiso para eliminar el repuesto %.',
      p_repuesto_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE repuestos
  SET    deleted_at = NOW()
  WHERE  id         = p_repuesto_id
    AND  deleted_at IS NULL;

END;
$$;

COMMENT ON FUNCTION soft_delete_repuesto(UUID) IS
  'Soft Delete atómico de repuesto con verificación de autorización empresa/propietario. (033)';

GRANT EXECUTE ON FUNCTION soft_delete_repuesto(UUID) TO authenticated;
