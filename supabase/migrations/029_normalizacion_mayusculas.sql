-- =============================================================================
-- MIGRACIÓN 029: Normalización de Mayúsculas (Marca y Modelo)
-- Descripción: Actualiza el RPC publicar_vehiculo para aplicar una limpieza 
--              estricta (UPPER y TRIM) en la marca y el modelo, asegurando
--              búsquedas exactas e insensibles a mayúsculas/minúsculas.
-- =============================================================================

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
    UPPER(TRIM(p_vehiculo->>'marca')),
    UPPER(TRIM(p_vehiculo->>'modelo')),
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
