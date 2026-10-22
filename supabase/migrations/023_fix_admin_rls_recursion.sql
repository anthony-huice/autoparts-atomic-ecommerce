-- =============================================================================
-- database/023_fix_admin_rls_recursion.sql
-- Descripción: Soluciona el error "infinite recursion detected in policy"
--              al intentar leer la tabla personas dentro de la misma política
--              de seguridad para comprobar si alguien es superadmin.
-- =============================================================================

-- 1. Crear una función SECURITY DEFINER
-- Esta función lee la tabla omitiendo RLS para evitar el ciclo infinito
CREATE OR REPLACE FUNCTION public.is_superadmin(user_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM personas 
    WHERE auth_user_id = user_uid 
      AND is_superadmin = TRUE 
      AND deleted_at IS NULL
  );
END;
$$;

-- 2. Eliminar las políticas anteriores que causan la recursión
DROP POLICY IF EXISTS "personas_select_admin" ON personas;
DROP POLICY IF EXISTS "personas_update_admin" ON personas;

-- 3. Crear las políticas de nuevo usando la función segura
CREATE POLICY "personas_select_admin"
  ON personas
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "personas_update_admin"
  ON personas
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- Opcional: También aplicar esta función en las políticas de empresas 
-- (para evitar la misma recursión si se lee `personas`)
DROP POLICY IF EXISTS "empresas_update_admin" ON empresas;

CREATE POLICY "empresas_update_admin"
  ON empresas
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));
