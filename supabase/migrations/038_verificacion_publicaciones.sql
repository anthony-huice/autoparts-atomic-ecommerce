-- ==============================================================================
-- Migración: Sistema de Verificación/Moderación de Publicaciones (Vehículos y Repuestos)
-- ==============================================================================

-- 1. Añadir columna a tabla vehiculos
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS estado_verificacion VARCHAR(20) 
CHECK (estado_verificacion IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')) 
DEFAULT 'PENDIENTE';

-- 2. Añadir columna a tabla repuestos
ALTER TABLE public.repuestos 
ADD COLUMN IF NOT EXISTS estado_verificacion VARCHAR(20) 
CHECK (estado_verificacion IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')) 
DEFAULT 'PENDIENTE';

-- 3. Actualizar todos los registros existentes a 'APROBADO' para no afectar la producción actual
UPDATE public.vehiculos SET estado_verificacion = 'APROBADO' WHERE estado_verificacion = 'PENDIENTE';
UPDATE public.repuestos SET estado_verificacion = 'APROBADO' WHERE estado_verificacion = 'PENDIENTE';
