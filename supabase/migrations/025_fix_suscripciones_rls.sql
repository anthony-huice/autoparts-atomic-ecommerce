-- 1. Otorgar permisos básicos a los roles
GRANT SELECT, INSERT, UPDATE ON TABLE empresa_suscripciones TO authenticated;
-- Nota: anon normalmente solo necesita SELECT, pero podemos dejarlo según necesidad.
GRANT SELECT ON TABLE empresa_suscripciones TO anon;

-- 2. Asegurar RLS habilitado
ALTER TABLE empresa_suscripciones ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas anteriores (creadas en 025_suscripciones_concesionario.sql)
DROP POLICY IF EXISTS "Permitir lectura publica de suscripciones" ON empresa_suscripciones;
DROP POLICY IF EXISTS "Permitir a empleados ver suscripcion de su empresa" ON empresa_suscripciones;

-- 4. Política de SELECT
DROP POLICY IF EXISTS "Permitir lectura de suscripciones" ON empresa_suscripciones;
CREATE POLICY "Permitir lectura de suscripciones" ON empresa_suscripciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados_empresa ee
      JOIN personas p ON ee.persona_id = p.id
      WHERE ee.empresa_id = empresa_suscripciones.empresa_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- También permitimos lectura pública si es requerido (dependiendo de si los planes de empresas son públicos, como se definió originalmente)
-- Recreamos la lectura pública por si acaso era necesaria para el perfil de concesionario público.
CREATE POLICY "Permitir lectura publica de suscripciones"
  ON empresa_suscripciones
  FOR SELECT
  USING (true);

-- 5. Política de INSERT/UPDATE
DROP POLICY IF EXISTS "Permitir modificación de suscripción propia" ON empresa_suscripciones;
CREATE POLICY "Permitir modificación de suscripción propia" ON empresa_suscripciones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados_empresa ee
      JOIN personas p ON ee.persona_id = p.id
      WHERE ee.empresa_id = empresa_suscripciones.empresa_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados_empresa ee
      JOIN personas p ON ee.persona_id = p.id
      WHERE ee.empresa_id = empresa_suscripciones.empresa_id
        AND p.auth_user_id = auth.uid()
    )
  );
