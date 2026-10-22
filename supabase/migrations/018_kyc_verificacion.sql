-- =============================================================================
-- database/018_kyc_verificacion.sql
-- Descripción: Agrega el sistema de KYC (Know Your Customer) y permisos admin.
-- =============================================================================

-- 1. Crear el ENUM para el estado de verificación
DO $$ BEGIN
    CREATE TYPE estado_verificacion AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Modificar la tabla 'empresas' para incluir el estado de verificación
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS estado_verificacion estado_verificacion DEFAULT 'PENDIENTE' NOT NULL;

-- 3. Modificar la tabla 'personas' para incluir el flag de superadmin
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS is_superadmin boolean DEFAULT false NOT NULL;
