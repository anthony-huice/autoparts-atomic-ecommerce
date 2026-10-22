-- ==============================================================================
-- 012_storage_privado.sql
-- Creación de Bucket Privado para Documentos Sensibles
-- ==============================================================================

-- 1. Insertar el nuevo bucket 'documentos_privados' (no público)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos_privados', 'documentos_privados', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Asegurar que storage.objects tiene RLS habilitado
-- (Por defecto viene habilitado en los proyectos de Supabase, evitamos error 42501)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para el bucket 'documentos_privados'

-- Permitir que el dueño lea sus propios documentos
CREATE POLICY "Lectura propia en documentos privados" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'documentos_privados' AND owner = auth.uid());

-- Permitir que el usuario suba documentos
CREATE POLICY "Subida en documentos privados" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'documentos_privados' AND owner = auth.uid());

-- Permitir actualización a sus propios documentos
CREATE POLICY "Actualizacion propia en documentos privados" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'documentos_privados' AND owner = auth.uid());

-- Permitir eliminación de sus propios documentos
CREATE POLICY "Borrado propio en documentos privados" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'documentos_privados' AND owner = auth.uid());
