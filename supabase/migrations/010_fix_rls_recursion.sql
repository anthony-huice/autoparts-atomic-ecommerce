-- ==============================================================================
-- 010_fix_rls_recursion.sql
-- Solución al error de recursión infinita en las políticas RLS de empleados_empresa
-- y ajuste para permitir la creación inicial (bootstrap) de la empresa.
-- ==============================================================================

-- 1. Funciones SECURITY DEFINER para chequear permisos sin disparar RLS recursivo
-- Al ser SECURITY DEFINER, estas funciones bypassean RLS al leer la tabla, rompiendo
-- el ciclo de recursión infinito de PostgreSQL.
CREATE OR REPLACE FUNCTION public.is_miembro_empresa(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM empleados_empresa ee
    JOIN personas p ON p.id = ee.persona_id
    WHERE ee.empresa_id = p_empresa_id
      AND p.auth_user_id = auth.uid()
      AND p.deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_representante_empresa(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM empleados_empresa ee
    JOIN personas p ON p.id = ee.persona_id
    WHERE ee.empresa_id = p_empresa_id
      AND ee.es_representante_legal = TRUE
      AND p.auth_user_id = auth.uid()
      AND p.deleted_at IS NULL
  );
END;
$$;

-- 2. Actualizar políticas de empleados_empresa
DROP POLICY IF EXISTS "empleados_select_miembros" ON empleados_empresa;
CREATE POLICY "empleados_select_miembros"
  ON empleados_empresa
  FOR SELECT
  TO authenticated
  USING (is_miembro_empresa(empresa_id));

DROP POLICY IF EXISTS "empleados_insert_representante" ON empleados_empresa;
CREATE POLICY "empleados_insert_representante"
  ON empleados_empresa
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permite insertar si es el representante actual O si la empresa no tiene empleados (bootstrap)
    is_representante_empresa(empresa_id) OR
    NOT EXISTS (SELECT 1 FROM empleados_empresa WHERE empresa_id = empleados_empresa.empresa_id)
  );

DROP POLICY IF EXISTS "empleados_update_representante" ON empleados_empresa;
CREATE POLICY "empleados_update_representante"
  ON empleados_empresa
  FOR UPDATE
  TO authenticated
  USING (is_representante_empresa(empresa_id))
  WITH CHECK (is_representante_empresa(empresa_id));

-- 3. Actualizar política de UPDATE de empresas
DROP POLICY IF EXISTS "empresas_update_representante" ON empresas;
CREATE POLICY "empresas_update_representante"
  ON empresas
  FOR UPDATE
  TO authenticated
  USING (is_representante_empresa(id))
  WITH CHECK (is_representante_empresa(id));

-- 4. Actualizar el RPC crear_empresa_con_representante a SECURITY DEFINER
-- Esto garantiza que no haya bloqueos de RLS durante las transacciones iniciales.
-- Al usar SECURITY DEFINER la función se ejecuta con permisos de administrador, 
-- PERO es segura porque valida internamente que p_persona_id pertenece a auth.uid()
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
    (p_empresa_data->>'tipo_empresa')::tipo_empresa_enum,
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
