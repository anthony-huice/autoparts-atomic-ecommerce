-- =============================================================================
-- Migration: 014_add_vehiculo_specs.sql
-- Description: Agrega los campos obligatorios de venta: versión, motor y tracción.
-- Estos campos permiten nulos (NULL) para no afectar la integridad de los
-- vehículos ya publicados anteriormente.
-- =============================================================================

ALTER TABLE public.vehiculos 
ADD COLUMN version VARCHAR(100),
ADD COLUMN motor VARCHAR(100),
ADD COLUMN traccion VARCHAR(50);
