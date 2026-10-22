-- =============================================================================
-- database/036_admin_publicaciones_rls.sql
-- Descripción: Añade políticas RLS que permiten a los superadmins
--              hacer UPDATE (soft delete) sobre vehículos y repuestos.
--              Usa subquery directa sobre `personas` para no depender
--              de la función `public.is_superadmin()`.
-- Nota: La Server Action también usa el Service Role Key como medida
--       de defensa en profundidad, por lo que este archivo es un
--       respaldo de buenas prácticas RLS.
-- =============================================================================

-- ─── Vehículos ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "vehiculos_update_admin" ON vehiculos;

CREATE POLICY "vehiculos_update_admin"
  ON vehiculos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM personas
      WHERE personas.auth_user_id = auth.uid()
        AND personas.is_superadmin = TRUE
        AND personas.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM personas
      WHERE personas.auth_user_id = auth.uid()
        AND personas.is_superadmin = TRUE
        AND personas.deleted_at IS NULL
    )
  );

-- ─── Repuestos ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "repuestos_update_admin" ON repuestos;

CREATE POLICY "repuestos_update_admin"
  ON repuestos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM personas
      WHERE personas.auth_user_id = auth.uid()
        AND personas.is_superadmin = TRUE
        AND personas.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM personas
      WHERE personas.auth_user_id = auth.uid()
        AND personas.is_superadmin = TRUE
        AND personas.deleted_at IS NULL
    )
  );
