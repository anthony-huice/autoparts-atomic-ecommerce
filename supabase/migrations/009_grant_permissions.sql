-- ==============================================================================
-- 009_grant_permissions.sql
-- Otorgar permisos básicos a los roles de Supabase
-- ==============================================================================
-- En ocasiones, al crear tablas manualmente desde el editor SQL, los roles 
-- `anon` y `authenticated` no reciben automáticamente los permisos de uso 
-- sobre el esquema o las tablas recién creadas, lo que genera el error:
-- "permission denied for table X".
--
-- Estos comandos restablecen y garantizan los privilegios base. 
-- El control de acceso real y granular sigue estando dictado por las 
-- políticas de RLS en el archivo 006_rls_policies.sql.

-- 1. Otorgar permisos de uso sobre el esquema público
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Otorgar permisos CRUD completos en todas las tablas a los roles base
-- (RLS se encargará de limitar quién puede hacer qué)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 3. Otorgar permisos en las secuencias (necesario para campos serial/UUID auto-generados si aplica)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
