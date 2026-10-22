-- ==============================================================================
-- 027_limite_empresas.sql
-- Restringe a máximo 1 empresa de cada tipo (CONCESIONARIO o ALIADO_COMERCIAL)
-- por cuenta de usuario (persona).
-- ==============================================================================

CREATE OR REPLACE FUNCTION crear_empresa_con_representante(
  p_empresa_data  JSONB,
  p_persona_id    UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id    UUID;
  v_auth_uid      UUID;
  v_persona_count INTEGER;
  v_tipo_empresa  VARCHAR;
  v_empresas_del_tipo INTEGER;
BEGIN
  IF p_empresa_data IS NULL OR p_empresa_data = '{}'::JSONB THEN
    RAISE EXCEPTION 'crear_empresa_con_representante: p_empresa_data no puede estar vacío.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF (p_empresa_data->>'tipo_empresa') IS NULL
  OR (p_empresa_data->>'razon_social')  IS NULL
  OR (p_empresa_data->>'rif')           IS NULL THEN
    RAISE EXCEPTION 'crear_empresa_con_representante: tipo_empresa, razon_social y rif son obligatorios en p_empresa_data.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  v_auth_uid := auth.uid();

  SELECT COUNT(*) INTO v_persona_count
  FROM   personas
  WHERE  id           = p_persona_id
    AND  auth_user_id = v_auth_uid
    AND  deleted_at   IS NULL;

  IF v_persona_count = 0 THEN
    RAISE EXCEPTION 'crear_empresa_con_representante: p_persona_id no corresponde al usuario autenticado o el perfil no existe/está inactivo.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- NUEVA REGLA: Verificar límite de 1 empresa por tipo
  v_tipo_empresa := p_empresa_data->>'tipo_empresa';

  SELECT COUNT(*) INTO v_empresas_del_tipo
  FROM empleados_empresa ee
  JOIN empresas e ON e.id = ee.empresa_id
  WHERE ee.persona_id = p_persona_id
    AND e.tipo_empresa = v_tipo_empresa::tipo_empresa_enum
    AND e.deleted_at IS NULL;

  IF v_empresas_del_tipo >= 1 THEN
    RAISE EXCEPTION 'Ya posees una empresa del tipo % registrada en tu cuenta.', v_tipo_empresa;
  END IF;

  INSERT INTO empresas (
    tipo_empresa,
    razon_social,
    nombre_comercial,
    rif,
    direccion,
    telefonos,
    correo,
    pagina_web,
    foto_establecimiento_url,
    ubicacion,
    documentos_legales
  )
  VALUES (
    v_tipo_empresa::tipo_empresa_enum,
    p_empresa_data->>'razon_social',
    p_empresa_data->>'nombre_comercial',
    p_empresa_data->>'rif',
    p_empresa_data->>'direccion',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_empresa_data->'telefonos')),
      '{}'::TEXT[]
    ),
    p_empresa_data->>'correo',
    p_empresa_data->>'pagina_web',
    p_empresa_data->>'foto_establecimiento_url',
    COALESCE(p_empresa_data->'ubicacion',           '{}'::JSONB),
    COALESCE(p_empresa_data->'documentos_legales',  '{}'::JSONB)
  )
  RETURNING id INTO v_empresa_id;

  INSERT INTO empleados_empresa (
    empresa_id,
    persona_id,
    cargo,
    es_representante_legal
  )
  VALUES (
    v_empresa_id,
    p_persona_id,
    'Representante Legal',
    TRUE
  );

  RETURN v_empresa_id;

END;
$$;
