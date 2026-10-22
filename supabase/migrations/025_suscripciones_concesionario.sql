-- =============================================================================
-- MIGRACIÓN 025: Sistema de Suscripciones para Concesionarios y Aliados
-- Descripción: Implementa los planes de suscripción para empresas (BASICO,
--              DESTACADO y PREMIUM) con cuotas globales de vehículos y límites.
--
-- Cambios:
--   1. Enum `tipo_plan_empresa_enum`  → BASICO | DESTACADO | PREMIUM
--   2. Tabla `empresa_suscripciones`  → Control global del plan de la empresa
--   3. Modificación de constraints    → Se adaptan límites de fotos y precios
--                                       en vehiculos para vendedores de tipo EMPRESA
--   4. Trigger de consistencia        → Asignación inmediata de plan BASICO al crear empresa
--   5. Trigger de validación          → Valida cuota de vehículos y límites de fotos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM: tipo_plan_empresa_enum
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'tipo_plan_empresa_enum'
  ) THEN
    CREATE TYPE tipo_plan_empresa_enum AS ENUM ('BASICO', 'DESTACADO', 'PREMIUM');
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. TABLA: empresa_suscripciones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_suscripciones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  tipo_plan           tipo_plan_empresa_enum NOT NULL DEFAULT 'BASICO',
  fecha_inicio        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_fin           TIMESTAMPTZ NULL, -- NULL para BASICO (indefinido)
  precio_pagado_usd   DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (precio_pagado_usd >= 0.00),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en la tabla empresa_suscripciones
ALTER TABLE empresa_suscripciones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para empresa_suscripciones
-- Permitir lectura pública de suscripciones
CREATE POLICY "Permitir lectura publica de suscripciones"
  ON empresa_suscripciones
  FOR SELECT
  USING (true);

-- Permitir a los empleados de la empresa ver su suscripción
CREATE POLICY "Permitir a empleados ver suscripcion de su empresa"
  ON empresa_suscripciones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM empleados_empresa ee
      JOIN personas p ON ee.persona_id = p.id
      WHERE ee.empresa_id = empresa_suscripciones.empresa_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. AJUSTE DE CONSTRAINTS EN LA TABLA VEHICULOS
-- -----------------------------------------------------------------------------

-- Modificar chk_fotos_por_plan para que no limite a las empresas (se valida en trigger)
ALTER TABLE vehiculos DROP CONSTRAINT IF EXISTS chk_fotos_por_plan;

ALTER TABLE vehiculos ADD CONSTRAINT chk_fotos_por_plan CHECK (
  vendedor_tipo = 'EMPRESA'
  OR (
    tipo_plan = 'BASICO'
    AND COALESCE(array_length(imagenes_url, 1), 0) <= 4
  )
  OR (
    tipo_plan = 'DESTACADO'
    AND COALESCE(array_length(imagenes_url, 1), 0) <= 10
  )
);

-- Modificar chk_precio_plan_coherente para que no restrinja cobro individual a empresas
ALTER TABLE vehiculos DROP CONSTRAINT IF EXISTS chk_precio_plan_coherente;

ALTER TABLE vehiculos ADD CONSTRAINT chk_precio_plan_coherente CHECK (
  vendedor_tipo = 'EMPRESA'
  OR (tipo_plan = 'BASICO' AND precio_plan_usd = 0.00)
  OR (tipo_plan = 'DESTACADO' AND precio_plan_usd >= 5.00)
);

-- -----------------------------------------------------------------------------
-- 4. TRIGGER: Asignación automática de Plan Básico al registrar Empresa
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crear_suscripcion_defecto_empresa()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO empresa_suscripciones (empresa_id, tipo_plan, fecha_fin, precio_pagado_usd)
  VALUES (NEW.id, 'BASICO', NULL, 0.00)
  ON CONFLICT (empresa_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tg_crear_suscripcion_defecto_empresa ON empresas;

CREATE TRIGGER tg_crear_suscripcion_defecto_empresa
AFTER INSERT ON empresas
FOR EACH ROW
EXECUTE FUNCTION crear_suscripcion_defecto_empresa();

-- -----------------------------------------------------------------------------
-- 5. TRIGGER: Validación de cuota y fotos de publicación para Empresas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_publicacion_empresa()
RETURNS TRIGGER AS $$
DECLARE
  v_sub_plan          tipo_plan_empresa_enum;
  v_active_count      INT;
  v_foto_count        INT;
  v_max_fotos         INT;
  v_max_vehiculos     INT;
BEGIN
  -- Solo validar si es vendedor empresa
  IF NEW.vendedor_tipo = 'EMPRESA' THEN
    -- Buscar suscripción activa de la empresa
    SELECT tipo_plan INTO v_sub_plan
    FROM empresa_suscripciones
    WHERE empresa_id = NEW.vendedor_empresa_id;

    -- Si no tiene suscripción, por defecto es BASICO
    IF v_sub_plan IS NULL THEN
      v_sub_plan := 'BASICO';
    END IF;

    -- Validar cantidad de fotos según el plan de la empresa
    v_foto_count := COALESCE(array_length(NEW.imagenes_url, 1), 0);
    CASE v_sub_plan
      WHEN 'BASICO' THEN v_max_fotos := 4;
      WHEN 'DESTACADO' THEN v_max_fotos := 6;
      WHEN 'PREMIUM' THEN v_max_fotos := 12;
    END CASE;

    IF v_foto_count > v_max_fotos THEN
      RAISE EXCEPTION 'validar_publicacion_empresa: El plan % de concesionario permite máximo % fotos. Recibidas: %.',
        v_sub_plan, v_max_fotos, v_foto_count
        USING ERRCODE = 'check_violation';
    END IF;

    -- Validar cuota global de vehículos para planes pagados
    IF v_sub_plan IN ('DESTACADO', 'PREMIUM') THEN
      CASE v_sub_plan
        WHEN 'DESTACADO' THEN v_max_vehiculos := 10;
        WHEN 'PREMIUM' THEN v_max_vehiculos := 30;
      END CASE;

      -- Contar vehículos activos de la empresa
      SELECT COUNT(*) INTO v_active_count
      FROM vehiculos
      WHERE vendedor_empresa_id = NEW.vendedor_empresa_id
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

      IF v_active_count >= v_max_vehiculos THEN
        RAISE EXCEPTION 'validar_publicacion_empresa: Límite de vehículos alcanzado para el plan % de concesionario (% vehículos).',
          v_sub_plan, v_max_vehiculos
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tg_validar_publicacion_empresa ON vehiculos;

CREATE TRIGGER tg_validar_publicacion_empresa
BEFORE INSERT OR UPDATE ON vehiculos
FOR EACH ROW
EXECUTE FUNCTION validar_publicacion_empresa();
