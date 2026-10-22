-- =============================================================================
-- database/021_admin_empresas_update.sql
-- Descripción: Permite a los superadmins actualizar empresas (estado KYC).
--              Sin esto, la Server Action "aprobarEmpresa" falla en RLS porque
--              la política empresas_update_representante solo permite al rep. legal.
-- =============================================================================

CREATE POLICY "empresas_update_admin"
  ON empresas
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
