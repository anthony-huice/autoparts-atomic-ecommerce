-- =============================================================================
-- MIGRACIÓN 034: Reglas de Monetización y Cuotas
-- =============================================================================

-- 1. Restricción en repuestos: Solo vendedores tipo EMPRESA pueden publicarlos.
ALTER TABLE repuestos
  DROP CONSTRAINT IF EXISTS chk_repuestos_solo_empresas;

ALTER TABLE repuestos
  ADD CONSTRAINT chk_repuestos_solo_empresas CHECK (
    vendedor_tipo = 'EMPRESA' AND vendedor_empresa_id IS NOT NULL
  );

-- 2. Modificación de la RPC publicar_vehiculo para aplicar límites a PARTICULARES.
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
  
  -- Variables nuevas para monetización
  v_vendedor_tipo     vendedor_tipo_enum;
  v_activos_count     INT;
  v_historico_count   INT;
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

  v_vendedor_tipo := (p_vehiculo->>'vendedor_tipo')::vendedor_tipo_enum;

  v_placas := p_vehiculo->>'placas';
  IF v_placas IS NULL OR trim(v_placas) = '' THEN
    RAISE EXCEPTION 'publicar_vehiculo: el campo "placas" es obligatorio.'
      USING ERRCODE = 'not_null_violation';
  END IF;

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
        fecha_expiracion_plan IS NULL
        OR fecha_expiracion_plan > NOW()
      );

    IF v_duplicado_count > 0 THEN
      RAISE EXCEPTION
        'publicar_vehiculo: ya tienes una publicación activa con las placas "%" en Plan BASICO. '
        'Espera a que expire o actualiza al Plan DESTACADO.',
        v_placas
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- ── e) REGLAS DE MONETIZACIÓN PARA PARTICULARES ───────────────────────────
  IF v_vendedor_tipo = 'PARTICULAR' THEN
    -- Contar vehículos activos del particular
    SELECT COUNT(*) INTO v_activos_count
    FROM vehiculos
    WHERE 
      creado_por_auth_id = v_auth_uid
      AND vendedor_tipo = 'PARTICULAR'
      AND deleted_at IS NULL
      AND estado IN ('ACTIVO', 'PAUSADO');
      
    IF v_activos_count >= 1 THEN
      RAISE EXCEPTION 'Límite alcanzado, registra un concesionario.'
        USING ERRCODE = 'raise_exception';
    END IF;
    
    -- Contar histórico total de vehículos (eliminados incluidos)
    SELECT COUNT(*) INTO v_historico_count
    FROM vehiculos
    WHERE 
      creado_por_auth_id = v_auth_uid
      AND vendedor_tipo = 'PARTICULAR';
  END IF;

  -- ── f) Calcular fecha de expiración y precio por plan ─────────────────────
  CASE v_tipo_plan
    WHEN 'BASICO' THEN
      v_expiracion  := NOW() + INTERVAL '15 days';
      -- Override monetización particular
      IF v_vendedor_tipo = 'PARTICULAR' THEN
        IF v_historico_count = 0 THEN
          v_precio_plan := 0.00;
        ELSE
          v_precio_plan := 1.00;
        END IF;
      ELSE
        v_precio_plan := 0.00;
      END IF;
    WHEN 'DESTACADO' THEN
      v_expiracion  := NOW() + INTERVAL '45 days';
      -- Override monetización particular si aplica (aunque DESTACADO sea 5.00 base, mantenemos la lógica)
      -- En este requerimiento, DESTACADO ya cuesta dinero, por lo que el precio base es 5.00.
      -- Si es particular y su primera vez, ¿el destacado cuesta 5.00 o 6.00?
      -- Usaremos 5.00 base, y si es particular cobramos 5.00 (el requerimiento habla explícitamente del segundo vehículo costando $1.00).
      -- Asumiremos que el DESTACADO cuesta $5.00 fijo independientemente de si es 1ero o 2do.
      v_precio_plan := 5.00;
  END CASE;

  -- ── g) Insertar el vehículo ───────────────────────────────────────────────
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
    v_vendedor_tipo,
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
