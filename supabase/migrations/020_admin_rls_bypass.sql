-- =============================================================================
-- database/020_admin_rls_bypass.sql
-- Descripción: Permite a los superadmins leer TODAS las personas para la
--              auditoría KYC. Sin esto, la política personas_select_propio
--              bloquea la consulta del panel de admin (0 filas devueltas).
-- =============================================================================

-- Política: Superadmin puede leer TODOS los perfiles de personas
-- NOTA: Usa is_superadmin desde la propia tabla personas (sin recursión porque
--       la fila filtrada es distinta a la fila consultada).
CREATE POLICY "personas_select_admin"
  ON personas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM personas admin_p
      WHERE admin_p.auth_user_id = auth.uid()
        AND admin_p.is_superadmin = TRUE
        AND admin_p.deleted_at IS NULL
    )
  );

-- Política: Superadmin puede actualizar TODOS los perfiles (para aprobar/rechazar KYC)
CREATE POLICY "personas_update_admin"
  ON personas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM personas admin_p
      WHERE admin_p.auth_user_id = auth.uid()
        AND admin_p.is_superadmin = TRUE
        AND admin_p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM personas admin_p
      WHERE admin_p.auth_user_id = auth.uid()
        AND admin_p.is_superadmin = TRUE
        AND admin_p.deleted_at IS NULL
    )
  );
