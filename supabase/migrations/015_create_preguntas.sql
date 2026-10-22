-- =============================================================================
-- Migration: 015_create_preguntas.sql
-- Description: Crea la tabla de preguntas para los vehículos.
-- =============================================================================

CREATE TABLE public.preguntas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    respuesta TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- 1. Cualquiera puede ver las preguntas
CREATE POLICY "Las preguntas son públicas" 
ON public.preguntas FOR SELECT 
USING (true);

-- 2. Usuarios autenticados pueden insertar (el cliente enviará su propio auth.uid())
CREATE POLICY "Usuarios autenticados pueden preguntar" 
ON public.preguntas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Nota: La lógica para que un publicador no se auto-comente y la lógica para responder 
-- se delegará a validaciones en la aplicación (o a políticas UPDATE en el futuro panel).

-- -----------------------------------------------------------------------------
-- Otorgar Permisos de API (PostgREST)
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.preguntas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preguntas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preguntas TO service_role;
