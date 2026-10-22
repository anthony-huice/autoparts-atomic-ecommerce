-- =============================================================================
-- database/022_fix_auth_users_deletion.sql
-- Descripción: Agrega ON DELETE CASCADE a las referencias de auth.users en 
--              las tablas vehiculos y repuestos.
--              Esto soluciona el error "Failed to delete selected users" 
--              en el panel de Supabase causado por violación de Foreign Key.
-- =============================================================================

-- 1. Arreglar tabla vehiculos
ALTER TABLE vehiculos 
DROP CONSTRAINT IF EXISTS vehiculos_creado_por_auth_id_fkey;

ALTER TABLE vehiculos 
ADD CONSTRAINT vehiculos_creado_por_auth_id_fkey 
FOREIGN KEY (creado_por_auth_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 2. Arreglar tabla repuestos
ALTER TABLE repuestos 
DROP CONSTRAINT IF EXISTS repuestos_creado_por_auth_id_fkey;

ALTER TABLE repuestos 
ADD CONSTRAINT repuestos_creado_por_auth_id_fkey 
FOREIGN KEY (creado_por_auth_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;
