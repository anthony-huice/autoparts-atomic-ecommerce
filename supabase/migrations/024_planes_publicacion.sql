-- =============================================================================
-- MIGRACIÓN 024: Sistema de Planes de Publicación para Vehículos
-- Descripción: Implementa los dos niveles de publicación para vendedores
--              particulares (BASICO y DESTACADO), con restricciones estrictas
--              a nivel de motor de BD. El frontend NUNCA es la barrera.
--
-- Cambios:
--   1. Enum `tipo_plan_enum`          → BASICO | DESTACADO
--   2. Columnas en `vehiculos`        → tipo_plan, fecha_expiracion_plan,
--                                        renovaciones_basico, precio_plan_usd
--   3. CHECK constraint fotos         → máx 4 (BASICO) / máx 10 (DESTACADO)
--   4. Función RPC `publicar_vehiculo` → inserta con plan, valida placa duplicada
--                                        por usuario en BASICO, y guarda el
--                                        precio en USD (DIRECTRICES §2: no float)
--   5. Función RPC `renovar_plan_basico` → incrementa renovaciones y reinicia
--                                           fecha_expiracion_plan +15 días
--   6. Índices de soporte             → expiración, tipo de plan
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM: tipo_plan_enum
--    Creación idempotente: si ya existiera en otro contexto, no falla.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'tipo_plan_enum'
  ) THEN
    CREATE TYPE tipo_plan_enum AS ENUM ('BASICO', 'DESTACADO');
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. COLUMNAS NUEVAS EN `vehiculos`
-- -----------------------------------------------------------------------------

-- Tipo de plan de publicación. Por defecto BASICO para toda publicación nueva.
ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS tipo_plan          tipo_plan_enum   NOT NULL DEFAULT 'BASICO';

-- Fecha límite de visibilidad del anuncio.
-- BASICO: NOW() + 15 días al publicar.
-- DESTACADO: NOW() + 45 días al publicar.
ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS fecha_expiracion_plan TIMESTAMPTZ  NULL;

-- Contador de renovaciones de plan BASICO (a $1 USD + IVA c/u).
-- Solo relevante cuando tipo_plan = 'BASICO'. Para DESTACADO queda en 0.
ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS renovaciones_basico  SMALLINT      NOT NULL DEFAULT 0
  CHECK (renovaciones_basico >= 0);

-- Precio cobrado por el plan en USD (DECIMAL, no float — DIRECTRICES §2).
-- BASICO: 0.00 USD (gratis). DESTACADO: 5.00 USD base. IVA se calcula en runtime.
ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS precio_plan_usd      DECIMAL(12,2) NOT NULL DEFAULT 0.00
  CHECK (precio_plan_usd >= 0.00);

-- -----------------------------------------------------------------------------
-- 3. CHECK CONSTRAINT: límite de fotos por plan
--    - BASICO:    array_length(imagenes_url, 1) ≤ 4   (o está vacío)
--    - DESTACADO: array_length(imagenes_url, 1) ≤ 10  (o está vacío)
--    Se usa COALESCE para manejar el caso donde imagenes_url es vacío (NULL length).
-- -----------------------------------------------------------------------------
ALTER TABLE vehiculos
  DROP CONSTRAINT IF EXISTS chk_fotos_por_plan;

ALTER TABLE vehiculos
  ADD CONSTRAINT chk_fotos_por_plan CHECK (
    (
      tipo_plan = 'BASICO'
      AND COALESCE(array_length(imagenes_url, 1), 0) <= 4
    )
    OR
    (
      tipo_plan = 'DESTACADO'
      AND COALESCE(array_length(imagenes_url, 1), 0) <= 10
    )
  );

-- -----------------------------------------------------------------------------
-- 4. CHECK CONSTRAINT: precio_plan coherente con tipo_plan
--    - BASICO:    precio_plan_usd = 0.00 (gratis en la primera publicación)
--    - DESTACADO: precio_plan_usd >= 5.00
-- -----------------------------------------------------------------------------
ALTER TABLE vehiculos
  DROP CONSTRAINT IF EXISTS chk_precio_plan_coherente;

ALTER TABLE vehiculos
  ADD CONSTRAINT chk_precio_plan_coherente CHECK (
    (tipo_plan = 'BASICO'    AND precio_plan_usd = 0.00)
    OR
    (tipo_plan = 'DESTACADO' AND precio_plan_usd >= 5.00)
  );

-- -----------------------------------------------------------------------------
-- 5. ÍNDICES DE SOPORTE
-- -----------------------------------------------------------------------------

-- Expiración: permite depurar/desactivar anuncios vencidos eficientemente.
CREATE INDEX IF NOT EXISTS idx_vehiculos_expiracion
  ON vehiculos (fecha_expiracion_plan)
  WHERE deleted_at IS NULL;

-- Tipo de plan: soporte para filtros de catálogo (destacados primero).
CREATE INDEX IF NOT EXISTS idx_vehiculos_tipo_plan
  ON vehiculos (tipo_plan)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 6. FUNCIÓN RPC: publicar_vehiculo
--    Responsabilidades:
--    a) Valida que el usuario no tenga ya una publicación ACTIVA con la misma
--       placa en plan BASICO (evita re-registro sin pagar).
--    b) Inserta el vehículo con el plan correspondiente.
--    c) Calcula y asigna fecha_expiracion_plan según el plan.
--    d) Asigna precio_plan_usd según el plan.
--    e) Devuelve el UUID del vehículo creado.
--
--    SECURITY INVOKER: la función opera con los permisos del usuario llamante,
--    por lo que las políticas RLS siguen activas. No otorga privilegios extra.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION publicar_vehiculo(p_vehiculo JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid          UUID;
  v_tipo_plan         tipo_plan_enum;
  v_placas            TEXT;
  v_imagenes          TEXT[];
  v_count_imagenes    INT;
  v_vehiculo_id       UUID;
  v_expiracion        TIMESTAMPTZ;
  v_precio_plan       DECIMAL(12,2);
  v_duplicado_count   INT;
BEGIN

  -- ── a) Contexto de seguridad ──────────────────────────────────────────────
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'publicar_vehiculo: sesión requerida. auth.uid() es NULL.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── b) Leer y validar parámetros obligatorios ─────────────────────────────
  IF p_vehiculo IS NULL OR p_vehiculo = '{}'::JSONB THEN
    RAISE EXCEPTION 'publicar_vehiculo: p_vehiculo no puede estar vacío.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_tipo_plan := COALESCE(
    (p_vehiculo->>'tipo_plan')::tipo_plan_enum,
    'BASICO'
  );

  v_placas := p_vehiculo->>'placas';
  IF v_placas IS NULL OR trim(v_placas) = '' THEN
    RAISE EXCEPTION 'publicar_vehiculo: el campo "placas" es obligatorio.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Extraer imágenes del JSON
  v_imagenes := ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(p_vehiculo->'imagenes_url', '[]'::JSONB)
    )
  );
  v_count_imagenes := COALESCE(array_length(v_imagenes, 1), 0);

  -- ── c) Validar límite de fotos por plan ───────────────────────────────────
  IF v_tipo_plan = 'BASICO' AND v_count_imagenes > 4 THEN
    RAISE EXCEPTION 'publicar_vehiculo: Plan BASICO permite máximo 4 fotos. Recibidas: %.',
      v_count_imagenes
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_tipo_plan = 'DESTACADO' AND v_count_imagenes > 10 THEN
    RAISE EXCEPTION 'publicar_vehiculo: Plan DESTACADO permite máximo 10 fotos. Recibidas: %.',
      v_count_imagenes
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── d) Regla anti-duplicado para plan BASICO ──────────────────────────────
  --    Un mismo auth.uid() NO puede tener DOS publicaciones activas (deleted_at
  --    IS NULL y no expiradas) con la misma placa en Plan BASICO.
  --    En DESTACADO no aplica esta restricción (el pago lo justifica).
  IF v_tipo_plan = 'BASICO' THEN
    SELECT COUNT(*) INTO v_duplicado_count
    FROM vehiculos
    WHERE
      creado_por_auth_id    = v_auth_uid
      AND placas             = v_placas
      AND tipo_plan          = 'BASICO'
      AND deleted_at         IS NULL
      AND (
        fecha_expiracion_plan IS NULL          -- sin expiración definida
        OR fecha_expiracion_plan > NOW()       -- aún vigente
      );

    IF v_duplicado_count > 0 THEN
      RAISE EXCEPTION
        'publicar_vehiculo: ya tienes una publicación activa con las placas "%" en Plan BASICO. '
        'Espera a que expire o actualiza al Plan DESTACADO.',
        v_placas
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- ── e) Calcular fecha de expiración y precio por plan ─────────────────────
  CASE v_tipo_plan
    WHEN 'BASICO' THEN
      v_expiracion  := NOW() + INTERVAL '15 days';
      v_precio_plan := 0.00;
    WHEN 'DESTACADO' THEN
      v_expiracion  := NOW() + INTERVAL '45 days';
      v_precio_plan := 5.00;
  END CASE;

  -- ── f) Insertar el vehículo ───────────────────────────────────────────────
  INSERT INTO vehiculos (
    propietario_id,
    vendedor_tipo,
    vendedor_persona_id,
    vendedor_empresa_id,
    marca,
    modelo,
    version,
    anio,
    color,
    motor,
    traccion,
    tipo_vehiculo,
    transmision,
    kilometraje,
    combustible,
    cantidad_puertas,
    cantidad_ejes,
    cantidad_duenos,
    serial_motor,
    serial_carroceria,
    placas,
    papeles_al_dia,
    precio,
    negociable,
    observacion,
    ubicacion,
    imagenes_url,
    tipo_plan,
    fecha_expiracion_plan,
    renovaciones_basico,
    precio_plan_usd,
    creado_por_auth_id
  )
  VALUES (
    (p_vehiculo->>'propietario_id')::UUID,
    (p_vehiculo->>'vendedor_tipo')::vendedor_tipo_enum,
    (p_vehiculo->>'vendedor_persona_id')::UUID,
    (p_vehiculo->>'vendedor_empresa_id')::UUID,
    p_vehiculo->>'marca',
    p_vehiculo->>'modelo',
    p_vehiculo->>'version',
    (p_vehiculo->>'anio')::INTEGER,
    p_vehiculo->>'color',
    p_vehiculo->>'motor',
    p_vehiculo->>'traccion',
    (p_vehiculo->>'tipo_vehiculo')::tipo_vehiculo_enum,
    (p_vehiculo->>'transmision')::transmision_enum,
    (p_vehiculo->>'kilometraje')::INTEGER,
    (p_vehiculo->>'combustible')::combustible_enum,
    (p_vehiculo->>'cantidad_puertas')::SMALLINT,
    (p_vehiculo->>'cantidad_ejes')::SMALLINT,
    COALESCE((p_vehiculo->>'cantidad_duenos')::SMALLINT, 1),
    p_vehiculo->>'serial_motor',
    p_vehiculo->>'serial_carroceria',
    v_placas,
    (p_vehiculo->>'papeles_al_dia')::BOOLEAN,
    (p_vehiculo->>'precio')::DECIMAL(12,2),
    COALESCE((p_vehiculo->>'negociable')::BOOLEAN, FALSE),
    p_vehiculo->>'observacion',
    COALESCE(p_vehiculo->'ubicacion', '{}'::JSONB),
    v_imagenes,
    v_tipo_plan,
    v_expiracion,
    0,              -- renovaciones_basico arranca en 0
    v_precio_plan,
    v_auth_uid
  )
  RETURNING id INTO v_vehiculo_id;

  RETURN v_vehiculo_id;

END;
$$;

-- -----------------------------------------------------------------------------
-- 7. FUNCIÓN RPC: renovar_plan_basico
--    Permite al propietario del anuncio renovar un plan BASICO vencido por $1 USD.
--    - Verifica que el vehículo pertenezca al auth.uid() llamante.
--    - Verifica que el plan actual sea BASICO (no se renueva un DESTACADO aquí).
--    - Incrementa renovaciones_basico en 1.
--    - Reinicia fecha_expiracion_plan → NOW() + 15 días.
--    - Devuelve la nueva fecha_expiracion_plan.
--
--    Nota: el cobro del $1 USD se procesa en el Route Handler de Next.js
--    ANTES de llamar a esta función. Esta RPC solo ejecuta el efecto en BD
--    una vez que el pago fue confirmado.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION renovar_plan_basico(p_vehiculo_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid      UUID;
  v_nueva_fecha   TIMESTAMPTZ;
  v_tipo_plan     tipo_plan_enum;
  v_owner         UUID;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'renovar_plan_basico: sesión requerida.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Leer plan y propietario con SELECT FOR UPDATE (consistencia transaccional — DIRECTRICES §2)
  SELECT tipo_plan, creado_por_auth_id
    INTO v_tipo_plan, v_owner
    FROM vehiculos
   WHERE id = p_vehiculo_id
     AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'renovar_plan_basico: vehículo % no encontrado o eliminado.', p_vehiculo_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_owner <> v_auth_uid THEN
    RAISE EXCEPTION 'renovar_plan_basico: no tienes permiso para renovar este anuncio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_tipo_plan <> 'BASICO' THEN
    RAISE EXCEPTION 'renovar_plan_basico: solo se puede renovar un anuncio con Plan BASICO. Plan actual: %.',
      v_tipo_plan
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_nueva_fecha := NOW() + INTERVAL '15 days';

  UPDATE vehiculos
     SET renovaciones_basico   = renovaciones_basico + 1,
         fecha_expiracion_plan = v_nueva_fecha
   WHERE id = p_vehiculo_id;

  RETURN v_nueva_fecha;

END;
$$;

-- -----------------------------------------------------------------------------
-- 8. FUNCIÓN RPC: actualizar_a_destacado
--    Actualiza un anuncio BASICO existente al plan DESTACADO.
--    - Verifica propiedad del anuncio.
--    - Cambia tipo_plan = 'DESTACADO'.
--    - Extiende fecha_expiracion_plan → NOW() + 45 días.
--    - Actualiza precio_plan_usd → 5.00.
--    - Nota: el cobro de $5 USD se valida en el Route Handler ANTES de esta llamada.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION actualizar_a_destacado(p_vehiculo_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid    UUID;
  v_nueva_fecha TIMESTAMPTZ;
  v_owner       UUID;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'actualizar_a_destacado: sesión requerida.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT creado_por_auth_id
    INTO v_owner
    FROM vehiculos
   WHERE id = p_vehiculo_id
     AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'actualizar_a_destacado: vehículo % no encontrado.', p_vehiculo_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_owner <> v_auth_uid THEN
    RAISE EXCEPTION 'actualizar_a_destacado: no tienes permiso sobre este anuncio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_nueva_fecha := NOW() + INTERVAL '45 days';

  -- Al pasar a DESTACADO, el límite de fotos sube a 10.
  -- Si tenía > 4 y < 10 fotos previamente subidas → el CHECK de la tabla lo permite.
  UPDATE vehiculos
     SET tipo_plan             = 'DESTACADO',
         fecha_expiracion_plan = v_nueva_fecha,
         precio_plan_usd       = 5.00
   WHERE id = p_vehiculo_id;

  RETURN v_nueva_fecha;

END;
$$;
