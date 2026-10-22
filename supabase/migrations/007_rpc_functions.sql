-- =============================================================================
-- MIGRACIÓN 007: Funciones RPC Transaccionales (PL/pgSQL)
-- Descripción: Agrupa operaciones multi-tabla en transacciones atómicas.
--              Implementa la directriz de "Consistencia Transaccional" (DIRECTRICES §2):
--              "Prohibido realizar múltiples peticiones consecutivas desde el cliente
--               para operaciones que requieran consistencia."
--
-- SEGURIDAD:
--   Todas las funciones usan SECURITY INVOKER (comportamiento por defecto explícito).
--   Esto garantiza que las políticas RLS de la migración 006 sean respetadas:
--   la función se ejecuta con los privilegios del usuario que la invoca,
--   NO con los del propietario de la función (que sería SECURITY DEFINER).
--
-- MANEJO DE ERRORES:
--   PL/pgSQL envuelve automáticamente cada función en una transacción. Si ocurre
--   cualquier excepción no capturada, el motor hace ROLLBACK completo. Las
--   validaciones explícitas usan RAISE EXCEPTION para activar ese rollback.
--
-- USO DESDE EL FRONTEND (Supabase JS):
--   const { data, error } = await supabase.rpc('nombre_funcion', { param: valor })
-- =============================================================================


-- =============================================================================
-- FUNCIÓN 1: crear_empresa_con_representante
--
-- Propósito: Registrar una empresa y vincular al usuario creador como su
--            representante legal en una única operación atómica.
--
-- Problema que resuelve: Sin esta función, el frontend haría dos llamadas:
--   1. INSERT INTO empresas → obtiene empresa_id
--   2. INSERT INTO empleados_empresa con ese ID
--   Si la red falla entre (1) y (2), queda una empresa sin representante legal:
--   dato huérfano irrecuperable y violación del modelo de negocio.
--
-- Parámetros:
--   p_empresa_data  JSONB  → Campos de la tabla empresas. Campos obligatorios:
--                            tipo_empresa, razon_social, rif.
--                            Opcionales: nombre_comercial, direccion, telefonos,
--                            correo, pagina_web, foto_establecimiento_url,
--                            ubicacion, documentos_legales.
--   p_persona_id    UUID   → ID del perfil en `personas` del usuario que registra.
--                            Debe corresponder al auth.uid() activo (validado internamente).
--
-- Retorna: UUID del registro creado en `empresas`.
--
-- Políticas RLS activas durante la ejecución (SECURITY INVOKER):
--   - empresas: INSERT requiere authenticated (WITH CHECK TRUE)
--   - empleados_empresa: INSERT requiere ser representante_legal de la empresa
--     EXCEPCIÓN: el primer INSERT en empleados_empresa para una empresa nueva
--     no tiene representante previo, por lo que la política de 006 no puede
--     validarlo vía EXISTS. Esta función DEBE ejecutarse con service_role en
--     Supabase o la política de empleados_insert debe permitir el bootstrap.
--     Ver nota al pie de esta función.
-- =============================================================================

CREATE OR REPLACE FUNCTION crear_empresa_con_representante(
  p_empresa_data  JSONB,
  p_persona_id    UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_empresa_id    UUID;
  v_auth_uid      UUID;
  v_persona_count INTEGER;
BEGIN
  -- -------------------------------------------------------------------------
  -- VALIDACIÓN 1: El JSON de empresa no puede estar vacío ni ser nulo.
  -- -------------------------------------------------------------------------
  IF p_empresa_data IS NULL OR p_empresa_data = '{}'::JSONB THEN
    RAISE EXCEPTION 'crear_empresa_con_representante: p_empresa_data no puede estar vacío.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- -------------------------------------------------------------------------
  -- VALIDACIÓN 2: Los campos obligatorios del negocio deben estar presentes.
  -- -------------------------------------------------------------------------
  IF (p_empresa_data->>'tipo_empresa') IS NULL
  OR (p_empresa_data->>'razon_social')  IS NULL
  OR (p_empresa_data->>'rif')           IS NULL THEN
    RAISE EXCEPTION 'crear_empresa_con_representante: tipo_empresa, razon_social y rif son obligatorios en p_empresa_data.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- -------------------------------------------------------------------------
  -- VALIDACIÓN 3: El p_persona_id debe existir en la tabla personas, estar
  -- activo (deleted_at IS NULL) y pertenecer al usuario autenticado actual.
  -- Previene que un usuario registre una empresa en nombre de otra persona.
  -- -------------------------------------------------------------------------
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

  -- -------------------------------------------------------------------------
  -- OPERACIÓN 1: Insertar la empresa.
  -- Los campos opcionales se extraen con valor NULL si no están presentes en
  -- el JSON, respetando los DEFAULT de la tabla definidos en 003.
  -- -------------------------------------------------------------------------
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
    -- telefonos: extraer como TEXT[]. Si no viene, usar arreglo vacío (DEFAULT de la tabla).
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

  -- -------------------------------------------------------------------------
  -- OPERACIÓN 2: Vincular al creador como representante legal.
  -- Se ejecuta en la misma transacción: si falla, el INSERT de empresas
  -- también se revierte (ROLLBACK automático de PL/pgSQL).
  -- -------------------------------------------------------------------------
  INSERT INTO empleados_empresa (
    empresa_id,
    persona_id,
    cargo,
    es_representante_legal
  )
  VALUES (
    v_empresa_id,
    p_persona_id,
    'Representante Legal',  -- Cargo canónico para el fundador de la empresa
    TRUE
  );

  -- -------------------------------------------------------------------------
  -- RETORNO: El ID de la empresa recién creada para redirección en el frontend.
  -- -------------------------------------------------------------------------
  RETURN v_empresa_id;

END;
$$;

-- NOTA SOBRE RLS Y BOOTSTRAP DE empleados_empresa:
-- La política "empleados_insert_representante" de 006 requiere que el usuario
-- YA SEA representante_legal de la empresa para insertar empleados. Pero en la
-- creación inicial no existe ningún representante previo. Opciones:
--   A) Llamar a esta función desde un Route Handler usando service_role key
--      (recomendado para producción, la service_role bypasea RLS).
--   B) Agregar una política adicional en empleados_empresa que permita el INSERT
--      cuando la empresa no tiene representante aún:
--      WITH CHECK (NOT EXISTS (SELECT 1 FROM empleados_empresa ee WHERE ee.empresa_id = empresa_id))
--      Esto permite solo el primer empleado y luego la política normal toma control.

COMMENT ON FUNCTION crear_empresa_con_representante(JSONB, UUID) IS
  'RPC transaccional: crea una empresa y registra al creador como representante legal en una sola operación atómica. DIRECTRICES §2 — Consistencia Transaccional.';


-- =============================================================================
-- FUNCIÓN 2: insertar_repuesto_con_compatibilidad
--
-- Propósito: Publicar un repuesto con su lista de vehículos compatibles en una
--            única transacción atómica.
--
-- Problema que resuelve: Sin esta función, el frontend haría N+1 llamadas:
--   1. INSERT INTO repuestos → obtiene repuesto_id
--   2..N. INSERT INTO compatibilidad_repuestos (una por cada vehículo compatible)
--   Un fallo en cualquier iteración deja un repuesto publicado sin compatibilidades
--   o con compatibilidades parciales, corrompiendo el motor de búsqueda cruzada.
--
-- Parámetros:
--   p_repuesto_data       JSONB  → Campos de la tabla repuestos. Obligatorios:
--                                  categoria_id, vendedor_tipo, nombre_repuesto,
--                                  es_nuevo, precio.
--                                  Si vendedor_tipo = 'PARTICULAR': vendedor_persona_id.
--                                  Si vendedor_tipo = 'EMPRESA': vendedor_empresa_id.
--   p_compatibilidades    JSONB  → Array JSON de objetos de compatibilidad. Cada objeto:
--                                  { "marca_vehiculo": "Toyota",
--                                    "modelo_vehiculo": "Corolla",
--                                    "anio_desde": 2010,
--                                    "anio_hasta": 2018 }
--                                  Puede ser un arreglo vacío [] si no aplica
--                                  compatibilidad específica (repuesto universal).
--
-- Retorna: UUID del registro creado en `repuestos`.
-- =============================================================================

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
  -- -------------------------------------------------------------------------
  -- VALIDACIÓN 1: El JSON del repuesto no puede estar vacío ni ser nulo.
  -- -------------------------------------------------------------------------
  IF p_repuesto_data IS NULL OR p_repuesto_data = '{}'::JSONB THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: p_repuesto_data no puede estar vacío.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- -------------------------------------------------------------------------
  -- VALIDACIÓN 2: Campos obligatorios del negocio.
  -- -------------------------------------------------------------------------
  IF (p_repuesto_data->>'categoria_id')    IS NULL
  OR (p_repuesto_data->>'vendedor_tipo')   IS NULL
  OR (p_repuesto_data->>'nombre_repuesto') IS NULL
  OR (p_repuesto_data->>'es_nuevo')        IS NULL
  OR (p_repuesto_data->>'precio')          IS NULL THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: categoria_id, vendedor_tipo, nombre_repuesto, es_nuevo y precio son obligatorios.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- -------------------------------------------------------------------------
  -- VALIDACIÓN 3: El arreglo de compatibilidades debe ser un JSON array.
  -- Un arreglo vacío [] es válido (repuesto universal).
  -- -------------------------------------------------------------------------
  IF p_compatibilidades IS NULL THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: p_compatibilidades no puede ser NULL. Use [] para repuesto universal.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF jsonb_typeof(p_compatibilidades) != 'array' THEN
    RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: p_compatibilidades debe ser un JSON array.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- -------------------------------------------------------------------------
  -- VALIDACIÓN 4: Cada elemento del array de compatibilidades debe tener
  -- los 4 campos requeridos. Detectar errores antes de iniciar los INSERTs.
  -- -------------------------------------------------------------------------
  FOR v_compat IN SELECT jsonb_array_elements(p_compatibilidades)
  LOOP
    IF (v_compat->>'marca_vehiculo')   IS NULL
    OR (v_compat->>'modelo_vehiculo')  IS NULL
    OR (v_compat->>'anio_desde')       IS NULL
    OR (v_compat->>'anio_hasta')       IS NULL THEN
      RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: cada elemento de p_compatibilidades debe tener marca_vehiculo, modelo_vehiculo, anio_desde y anio_hasta. Elemento inválido: %', v_compat
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Validar coherencia de rango de años antes de tocar la BD
    IF (v_compat->>'anio_hasta')::INTEGER < (v_compat->>'anio_desde')::INTEGER THEN
      RAISE EXCEPTION 'insertar_repuesto_con_compatibilidad: anio_hasta (%) no puede ser menor que anio_desde (%) en el elemento: %',
        (v_compat->>'anio_hasta'), (v_compat->>'anio_desde'), v_compat
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- OPERACIÓN 1: Insertar el repuesto.
  -- creado_por_auth_id se toma de auth.uid() — nunca del JSON del cliente
  -- para prevenir que el frontend falsee la autoría del registro.
  -- -------------------------------------------------------------------------
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
    creado_por_auth_id
  )
  VALUES (
    (p_repuesto_data->>'categoria_id')::UUID,
    (p_repuesto_data->>'vendedor_tipo')::vendedor_tipo_enum,
    -- Patrón polimórfico: exactamente uno de los dos será NOT NULL (validado por CHECK CONSTRAINT de 005)
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
    -- CRÍTICO: auth.uid() fijado en el servidor, nunca desde el cliente
    v_auth_uid
  )
  RETURNING id INTO v_repuesto_id;

  -- -------------------------------------------------------------------------
  -- OPERACIÓN 2: Insertar las compatibilidades usando el ID recién generado.
  -- Si el array está vacío, el FOR no itera y se omite silenciosamente.
  -- Si cualquier INSERT falla (ej. duplicado por uq_compatibilidad),
  -- el ROLLBACK deshace también el INSERT de repuestos de la Operación 1.
  -- -------------------------------------------------------------------------
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

  -- -------------------------------------------------------------------------
  -- RETORNO: El ID del repuesto creado para redirección en el frontend.
  -- -------------------------------------------------------------------------
  RETURN v_repuesto_id;

END;
$$;

COMMENT ON FUNCTION insertar_repuesto_con_compatibilidad(JSONB, JSONB) IS
  'RPC transaccional: publica un repuesto e inserta su lista de compatibilidades vehiculares en una sola operación atómica. DIRECTRICES §2 — Consistencia Transaccional.';
