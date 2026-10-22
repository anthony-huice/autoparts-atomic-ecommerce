-- =============================================================================
-- MIGRACIÓN 006: Políticas de Row Level Security (RLS)
-- Descripción: Define el modelo de acceso completo para todas las tablas.
--              Veredicto técnico: APROBADO CON CAMBIOS sobre la propuesta original.
--
-- CORRECCIONES APLICADAS SOBRE LA PROPUESTA:
--   V-1: Todo UPDATE lleva USING + WITH CHECK para prevenir transferencia de propiedad.
--   V-2: La exposición pública de personas se resuelve con una VIEW (security definer),
--        NO con subconsultas dentro de políticas RLS.
--   V-3: Políticas añadidas para empresas, empleados_empresa, categorias_repuestos
--        y compatibilidad_repuestos (omitidas en la propuesta original).
--   V-4: Todas las políticas públicas especifican explícitamente TO anon, authenticated.
--
-- PRINCIPIO RECTOR: DELETE físico bloqueado en todas las tablas operativas.
-- El Soft Delete se ejerce únicamente mediante UPDATE SET deleted_at = NOW(),
-- que sí está cubierto por las políticas de UPDATE de cada propietario.
-- =============================================================================


-- =============================================================================
-- TABLA: vehiculos
-- =============================================================================

-- SELECT público: visitante anónimo y autenticado pueden leer el catálogo.
-- Condición única: deleted_at IS NULL. O(1) gracias al índice parcial.
CREATE POLICY "vehiculos_select_publico"
  ON vehiculos
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

-- INSERT: Solo usuarios autenticados. La sesión activa DEBE coincidir con
-- creado_por_auth_id — impide insertar registros en nombre de otro usuario.
CREATE POLICY "vehiculos_insert_propietario"
  ON vehiculos
  FOR INSERT
  TO authenticated
  WITH CHECK (creado_por_auth_id = auth.uid());

-- UPDATE: Evaluación O(1) en la misma fila (sin subconsulta).
--   USING     → quién puede intentar el UPDATE (acceso al registro)
--   WITH CHECK → a qué estado puede mutar el registro post-UPDATE
-- Sin WITH CHECK, un atacante podría cambiar creado_por_auth_id para transferir propiedad.
CREATE POLICY "vehiculos_update_propietario"
  ON vehiculos
  FOR UPDATE
  TO authenticated
  USING     (creado_por_auth_id = auth.uid())
  WITH CHECK (creado_por_auth_id = auth.uid());

-- DELETE: Sin política → bloqueado a nivel de motor (fuerza Soft Delete).
-- El Soft Delete se ejecuta como UPDATE SET deleted_at = NOW(), cubierto arriba.


-- =============================================================================
-- TABLA: repuestos
-- =============================================================================

CREATE POLICY "repuestos_select_publico"
  ON repuestos
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "repuestos_insert_propietario"
  ON repuestos
  FOR INSERT
  TO authenticated
  WITH CHECK (creado_por_auth_id = auth.uid());

CREATE POLICY "repuestos_update_propietario"
  ON repuestos
  FOR UPDATE
  TO authenticated
  USING     (creado_por_auth_id = auth.uid())
  WITH CHECK (creado_por_auth_id = auth.uid());

-- DELETE: Sin política → bloqueado.


-- =============================================================================
-- TABLA: empresas
-- =============================================================================

-- SELECT público: directorios de aliados y concesionarios son información pública.
CREATE POLICY "empresas_select_publico"
  ON empresas
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

-- INSERT: Cualquier usuario autenticado puede registrar una empresa.
-- La gestión de permisos posteriores la controla empleados_empresa.
CREATE POLICY "empresas_insert_autenticado"
  ON empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- UPDATE: Solo el representante legal activo de la empresa puede modificarla.
-- Esta subconsulta ES aceptable: se ejecuta solo en UPDATEs (operación poco frecuente)
-- y sobre empleados_empresa, que es pequeña por empresa.
CREATE POLICY "empresas_update_representante"
  ON empresas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id          = empresas.id
        AND  ee.es_representante_legal = TRUE
        AND  p.auth_user_id           = auth.uid()
        AND  p.deleted_at             IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id          = empresas.id
        AND  ee.es_representante_legal = TRUE
        AND  p.auth_user_id           = auth.uid()
        AND  p.deleted_at             IS NULL
    )
  );

-- DELETE: Sin política → bloqueado (Soft Delete obligatorio).


-- =============================================================================
-- TABLA: personas
-- =============================================================================

-- SELECT: Un usuario autenticado solo puede leer su propio perfil completo.
-- El acceso público a campos seguros de vendedores se gestiona mediante
-- la VIEW perfil_publico_vendedor definida al final de este archivo.
CREATE POLICY "personas_select_propio"
  ON personas
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- INSERT: Un usuario crea su propio perfil en el momento del registro.
-- Prohibido insertar perfiles de terceros desde el cliente.
CREATE POLICY "personas_insert_registro"
  ON personas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- UPDATE: Un usuario solo puede modificar su propio perfil.
-- WITH CHECK previene cambiar auth_user_id (suplantación de identidad).
CREATE POLICY "personas_update_propio"
  ON personas
  FOR UPDATE
  TO authenticated
  USING     (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- DELETE: Sin política → bloqueado (Soft Delete obligatorio en personas).


-- =============================================================================
-- TABLA: empleados_empresa
-- =============================================================================

-- SELECT: Un empleado puede ver a todos los compañeros de su misma empresa.
-- La subconsulta JOIN es aceptable: empleados por empresa = conjunto pequeño.
CREATE POLICY "empleados_select_miembros"
  ON empleados_empresa
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id    = empleados_empresa.empresa_id
        AND  p.auth_user_id   = auth.uid()
        AND  p.deleted_at     IS NULL
    )
  );

-- INSERT: Solo el representante legal puede agregar nuevos empleados.
CREATE POLICY "empleados_insert_representante"
  ON empleados_empresa
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id          = empleados_empresa.empresa_id
        AND  ee.es_representante_legal = TRUE
        AND  p.auth_user_id           = auth.uid()
        AND  p.deleted_at             IS NULL
    )
  );

-- UPDATE: Solo el representante legal puede modificar registros de empleados.
CREATE POLICY "empleados_update_representante"
  ON empleados_empresa
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id          = empleados_empresa.empresa_id
        AND  ee.es_representante_legal = TRUE
        AND  p.auth_user_id           = auth.uid()
        AND  p.deleted_at             IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   empleados_empresa ee
      JOIN   personas          p  ON p.id = ee.persona_id
      WHERE  ee.empresa_id          = empleados_empresa.empresa_id
        AND  ee.es_representante_legal = TRUE
        AND  p.auth_user_id           = auth.uid()
        AND  p.deleted_at             IS NULL
    )
  );

-- DELETE: Sin política → bloqueado (gestionar bajas vía UPDATE o service role).


-- =============================================================================
-- TABLA: categorias_repuestos  (catálogo estático, solo lectura pública)
-- =============================================================================

-- Solo SELECT público. INSERT/UPDATE/DELETE gestionados por service_role (admin).
CREATE POLICY "categorias_select_publico"
  ON categorias_repuestos
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);


-- =============================================================================
-- TABLA: compatibilidad_repuestos
-- =============================================================================

-- SELECT público: la compatibilidad es información del catálogo.
CREATE POLICY "compatibilidad_select_publico"
  ON compatibilidad_repuestos
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- INSERT / UPDATE / DELETE: el propietario del repuesto controla su compatibilidad.
-- Subconsulta aceptable: el JOIN es sobre repuestos por su PK (O(log n)).
CREATE POLICY "compatibilidad_insert_propietario"
  ON compatibilidad_repuestos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repuestos r
      WHERE  r.id                 = compatibilidad_repuestos.repuesto_id
        AND  r.creado_por_auth_id = auth.uid()
    )
  );

CREATE POLICY "compatibilidad_update_propietario"
  ON compatibilidad_repuestos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repuestos r
      WHERE  r.id                 = compatibilidad_repuestos.repuesto_id
        AND  r.creado_por_auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repuestos r
      WHERE  r.id                 = compatibilidad_repuestos.repuesto_id
        AND  r.creado_por_auth_id = auth.uid()
    )
  );

-- DELETE: Sin política → bloqueado (ON DELETE CASCADE en repuesto_id cubre limpieza).


-- =============================================================================
-- VIEW: perfil_publico_vendedor
-- Solución a V-2: exposición pública de datos de contacto de vendedores
-- particulares SIN exponer PII sensible (cédula, foto, dirección, auth_user_id).
--
-- MECANISMO DE SEGURIDAD:
--   - security_invoker = false (por defecto en PostgreSQL): la VIEW se ejecuta
--     con los privilegios del propietario (postgres = superuser), por lo que
--     bypass RLS de la tabla personas de forma controlada.
--   - La VIEW misma ES la barrera de seguridad: solo expone 5 campos seguros.
--   - El filtro EXISTS garantiza que solo aparezcan vendedores con publicaciones
--     activas (no cualquier persona del sistema).
--
-- USO EN FRONTEND:
--   En lugar de JOIN personas, el frontend consulta esta VIEW:
--   SELECT * FROM perfil_publico_vendedor WHERE id = $vendedor_persona_id
-- =============================================================================

CREATE OR REPLACE VIEW perfil_publico_vendedor AS
SELECT
  p.id,
  p.nombres,
  p.apellidos,
  p.telefonos,
  p.correo,
  p.redes_sociales
FROM  personas p
WHERE p.deleted_at IS NULL
  AND (
    -- Persona es vendedor particular de al menos un vehículo activo
    EXISTS (
      SELECT 1 FROM vehiculos v
      WHERE  v.vendedor_persona_id = p.id
        AND  v.deleted_at          IS NULL
    )
    OR
    -- Persona es vendedor particular de al menos un repuesto activo
    EXISTS (
      SELECT 1 FROM repuestos r
      WHERE  r.vendedor_persona_id = p.id
        AND  r.deleted_at          IS NULL
    )
  );

-- Exponer la VIEW a los roles de Supabase
GRANT SELECT ON perfil_publico_vendedor TO anon, authenticated;

-- NOTA: cedula_pasaporte, fecha_nacimiento, direccion_residencia,
--       foto_cedula_url y auth_user_id quedan FUERA de esta VIEW intencionalmente.
