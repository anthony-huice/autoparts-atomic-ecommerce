-- Migration: 030_create_notificaciones.sql
-- Description: Crea la tabla de notificaciones para los usuarios.

CREATE TABLE public.notificaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'pregunta',
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- 1. Los usuarios pueden ver sus propias notificaciones
CREATE POLICY "Usuarios pueden ver sus propias notificaciones"
ON public.notificaciones FOR SELECT
USING (auth.uid() = user_id);

-- 2. Los usuarios pueden actualizar sus propias notificaciones (ej. marcar como leída)
CREATE POLICY "Usuarios pueden actualizar sus propias notificaciones"
ON public.notificaciones FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Cualquier usuario autenticado puede insertar notificaciones
CREATE POLICY "Usuarios autenticados pueden insertar notificaciones"
ON public.notificaciones FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Otorgar Permisos de API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones TO service_role;
