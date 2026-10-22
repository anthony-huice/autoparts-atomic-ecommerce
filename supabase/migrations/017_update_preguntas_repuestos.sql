-- =============================================================================
-- MIGRACIÓN 017: Adaptar tabla de preguntas para soportar repuestos
-- =============================================================================

-- 1. Hacer que vehiculo_id sea opcional
ALTER TABLE public.preguntas ALTER COLUMN vehiculo_id DROP NOT NULL;

-- 2. Agregar columna repuesto_id
ALTER TABLE public.preguntas ADD COLUMN repuesto_id UUID REFERENCES public.repuestos(id) ON DELETE CASCADE;

-- 3. Validar que la pregunta pertenezca a un vehículo o a un repuesto, pero no a ambos
ALTER TABLE public.preguntas ADD CONSTRAINT check_vehiculo_or_repuesto CHECK (
  (vehiculo_id IS NOT NULL AND repuesto_id IS NULL) OR 
  (vehiculo_id IS NULL AND repuesto_id IS NOT NULL)
);
