-- ==============================================================================
-- 011_add_product_images.sql
-- Agregar soporte de imágenes múltiples para Vehículos y Repuestos
-- ==============================================================================

-- 1. Agregar columnas a las tablas
ALTER TABLE vehiculos 
ADD COLUMN imagenes_url TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE repuestos 
ADD COLUMN imagenes_url TEXT[] NOT NULL DEFAULT '{}';

-- 2. Actualizar la función RPC de repuestos para que acepte las imágenes
CREATE OR REPLACE FUNCTION insertar_repuesto_con_compatibilidad(
  p_repuesto_data     JSONB,
  p_compatibilidades  JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_repuesto_id   UUID;
  v_compat        JSONB;
  v_auth_uid      UUID;
BEGIN
  IF p_repuesto_data IS NULL OR p_repuesto_data = '{}'::JSONB THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: p_repuesto_data no puede estar vacío.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF (p_repuesto_data->>'categoria_id')    IS NULL
  OR (p_repuesto_data->>'vendedor_tipo')   IS NULL
  OR (p_repuesto_data->>'nombre_repuesto') IS NULL
  OR (p_repuesto_data->>'es_nuevo')        IS NULL
  OR (p_repuesto_data->>'precio')          IS NULL THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: categoria_id, vendedor_tipo, nombre_repuesto, es_nuevo y precio son obligatorios.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  IF p_compatibilidades IS NULL THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: p_compatibilidades no puede ser NULL. Use [] para repuesto universal.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF jsonb_typeof(p_compatibilidades) != 'array' THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: p_compatibilidades debe ser un JSON array.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  FOR v_compat IN SELECT jsonb_array_elements(p_compatibilidades)
  LOOP
    IF (v_compat->>'marca_vehiculo')   IS NULL
    OR (v_compat->>'modelo_vehiculo')  IS NULL
    OR (v_compat->>'anio_desde')       IS NULL
    OR (v_compat->>'anio_hasta')       IS NULL THEN
      RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: cada elemento de p_compatibilidades debe tener marca_vehiculo, modelo_vehiculo, anio_desde y anio_hasta. Elemento inválido: %', v_compat
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF (v_compat->>'anio_hasta')::INTEGER < (v_compat->>'anio_desde')::INTEGER THEN
      RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: anio_hasta (%) no puede ser menor que anio_desde (%) en el elemento: %',
        (v_compat->>'anio_hasta'), (v_compat->>'anio_desde'), v_compat
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;

  v_auth_uid := auth.uid();

  INSERT INTO repuestos (
    categoria_id,
    vendedor_tipo,
    vendedor_persona_id,
    vendedor_empresa_id,
    nombre_repuesto,
    marca_repuesto,
    numero_parte,
    es_nuevo,
    precio,
    negociable,
    observacion,
    ubicacion,
    imagenes_url,
    creado_por_auth_id
  )
  VALUES (
    (p_repuesto_data->>'categoria_id')::UUID,
    (p_repuesto_data->>'vendedor_tipo')::vendedor_tipo_enum,
    (p_repuesto_data->>'vendedor_persona_id')::UUID,
    (p_repuesto_data->>'vendedor_empresa_id')::UUID,
    p_repuesto_data->>'nombre_repuesto',
    p_repuesto_data->>'marca_repuesto',
    p_repuesto_data->>'numero_parte',
    (p_repuesto_data->>'es_nuevo')::BOOLEAN,
    (p_repuesto_data->>'precio')::DECIMAL(12,2),
    COALESCE((p_repuesto_data->>'negociable')::BOOLEAN, FALSE),
    p_repuesto_data->>'observacion',
    COALESCE(p_repuesto_data->'ubicacion', '{}'::JSONB),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_repuesto_data->'imagenes_url')),
      '{}'::TEXT[]
    ),
    v_auth_uid
  )
  RETURNING id INTO v_repuesto_id;

  FOR v_compat IN SELECT jsonb_array_elements(p_compatibilidades)
  LOOP
    INSERT INTO compatibilidad_repuestos (
      repuesto_id,
      marca_vehiculo,
      modelo_vehiculo,
      anio_desde,
      anio_hasta
    )
    VALUES (
      v_repuesto_id,
      v_compat->>'marca_vehiculo',
      v_compat->>'modelo_vehiculo',
      (v_compat->>'anio_desde')::INTEGER,
      (v_compat->>'anio_hasta')::INTEGER
    );
  END LOOP;

  RETURN v_repuesto_id;

END;
$$;
