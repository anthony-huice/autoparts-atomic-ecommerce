-- =============================================================================
-- database/019_kyc_personas.sql
-- Descripción: Agrega el estado de verificación a la tabla personas.
-- =============================================================================

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS estado_verificacion estado_verificacion DEFAULT NULL;
