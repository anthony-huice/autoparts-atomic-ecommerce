-- =========================================================================================
-- 013_create_favoritos.sql
-- Descripción: Creación de la tabla de vehículos guardados (Favoritos) y sus políticas RLS
-- =========================================================================================

CREATE TABLE public.favoritos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, vehiculo_id)
);

ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios favoritos" 
ON public.favoritos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios favoritos" 
ON public.favoritos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios favoritos" 
ON public.favoritos FOR DELETE USING (auth.uid() = user_id);

-- Permisos base para los roles de la API
GRANT ALL ON TABLE public.favoritos TO anon, authenticated;
