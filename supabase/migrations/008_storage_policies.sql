-- ==============================================================================
-- 008_storage_policies.sql
-- Políticas de Seguridad RLS para los Buckets de Supabase Storage
-- ==============================================================================

-- 1. Asegurarnos que la tabla storage.objects tiene RLS habilitado 
-- (Por defecto viene habilitado en los proyectos de Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Permitir que CUALQUIER USUARIO pueda LEER las imágenes del bucket 'inventario'
-- (Esto también se puede configurar al marcar el bucket como Público en la UI)
CREATE POLICY "Permitir lectura pública de imágenes" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'inventario');

-- 3. Permitir que SÓLO USUARIOS AUTENTICADOS puedan SUBIR archivos al bucket
CREATE POLICY "Permitir subida a usuarios autenticados" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'inventario');

-- 4. Permitir que los usuarios puedan ACTUALIZAR solo sus propios archivos
CREATE POLICY "Permitir actualización a dueños" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'inventario' AND owner = auth.uid());

-- 5. Permitir que los usuarios puedan ELIMINAR solo sus propios archivos
CREATE POLICY "Permitir borrado a dueños" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'inventario' AND owner = auth.uid());
