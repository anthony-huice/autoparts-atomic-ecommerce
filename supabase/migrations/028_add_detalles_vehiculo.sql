-- =============================================================================
-- MIGRACIÓN 028: Detalles adicionales para vehículos
-- Descripción: Añade las columnas faltantes en la tabla vehiculos para
--              almacenar información detallada (Versión, Motor, Tracción).
--              El campo cantidad_ejes ya existía previamente.
-- =============================================================================

ALTER TABLE vehiculos 
  ADD COLUMN IF NOT EXISTS version VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS motor VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS traccion VARCHAR NULL;
