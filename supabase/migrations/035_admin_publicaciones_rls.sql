-- =============================================================================
-- database/035_admin_publicaciones_rls.sql
-- Descripción: Permite a los superadministradores realizar UPDATEs en las 
--              publicaciones (vehículos y repuestos) para poder hacer 
--              Soft Delete (deleted_at = NOW()).
-- =============================================================================

-- Vehículos
DROP POLICY IF EXISTS "vehiculos_update_admin" ON vehiculos;

CREATE POLICY "vehiculos_update_admin"
  ON vehiculos
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- Repuestos
DROP POLICY IF EXISTS "repuestos_update_admin" ON repuestos;

CREATE POLICY "repuestos_update_admin"
  ON repuestos
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));
