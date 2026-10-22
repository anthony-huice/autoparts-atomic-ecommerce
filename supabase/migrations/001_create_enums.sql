-- =============================================================================
-- MIGRACIÓN 001: Creación de Tipos ENUM
-- Descripción: Define todos los dominios de valor fijo usados en el esquema.
--              Deben crearse antes que las tablas que los referencian.
-- =============================================================================

-- Tipo de empresa (ente jurídico)
CREATE TYPE tipo_empresa_enum AS ENUM (
  'ALIADO_COMERCIAL',
  'CONCESIONARIO'
);

-- Tipo de vendedor (para inventario polimórfico)
-- 'PARTICULAR' = persona natural vendiendo por cuenta propia
-- 'EMPRESA'    = cualquier ente jurídico (ALIADO_COMERCIAL o CONCESIONARIO)
--               Deliberadamente genérico para no colisionar con tipo_empresa_enum.
CREATE TYPE vendedor_tipo_enum AS ENUM (
  'PARTICULAR',
  'EMPRESA'
);

-- Tipo de transmisión de vehículo
CREATE TYPE transmision_enum AS ENUM (
  'AUTOMATICO',
  'SINCRONICO',
  'DUAL'
);

-- Tipo de combustible de vehículo
CREATE TYPE combustible_enum AS ENUM (
  'DIESEL',
  'GASOLINA',
  'GAS',
  'ELECTRICO'
);

-- Tipo de carrocería / categoría del vehículo
-- Originado del campo "TIPO" del formulario de tu jefe
CREATE TYPE tipo_vehiculo_enum AS ENUM (
  'CARGA',
  'SEDAN',
  'SUV',
  'MINIVAN',
  'PICKUP',
  'MOTO'
);
