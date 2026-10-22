-- =============================================================================
-- MIGRACIÓN 041: Soporte para Pagos Corporativos y Personales
-- Descripción: Expande el sistema de pagos manuales para distinguir
--              pagos particulares de pagos hechos por Aliados (Empresas).
-- =============================================================================

-- 1. Agregar columnas para contexto empresarial
ALTER TABLE solicitudes_pago
ADD COLUMN IF NOT EXISTS empresa_id UUID NULL REFERENCES empresas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS plan_solicitado TEXT NULL;

-- 2. Sobrescribir función RPC para aprobación inteligente
CREATE OR REPLACE FUNCTION aprobar_pago(solicitud_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_solicitud solicitudes_pago%ROWTYPE;
    v_fecha_actual_persona TIMESTAMPTZ;
    v_fecha_actual_empresa TIMESTAMPTZ;
    v_tipo_plan_final TEXT;
BEGIN
    -- Validar que la persona que ejecuta sea admin o superadmin
    IF NOT (
        (auth.jwt() ->> 'role') = 'admin' OR 
        EXISTS (SELECT 1 FROM personas WHERE auth_user_id = auth.uid() AND is_superadmin = true)
    ) THEN
        RAISE EXCEPTION 'No tienes permisos para aprobar pagos';
    END IF;

    -- Bloquear la fila de la solicitud para evitar condiciones de carrera
    SELECT * INTO v_solicitud
    FROM solicitudes_pago
    WHERE id = solicitud_id_param
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud de pago no encontrada';
    END IF;

    -- Prevenir aprobar algo que ya fue aprobado
    IF v_solicitud.estado = 'APROBADO' THEN
        RAISE EXCEPTION 'Esta solicitud ya ha sido aprobada previamente';
    END IF;

    -- Actualizar el estado de la solicitud
    UPDATE solicitudes_pago
    SET estado = 'APROBADO',
        updated_at = NOW()
    WHERE id = solicitud_id_param;

    -- LÓGICA DE DOBLE CONTEXTO
    IF v_solicitud.empresa_id IS NOT NULL THEN
        -- Contexto: PAGO CORPORATIVO (Aliado)

        -- Obtener fecha de expiración actual de la empresa
        SELECT fecha_fin INTO v_fecha_actual_empresa
        FROM empresa_suscripciones
        WHERE empresa_id = v_solicitud.empresa_id;

        -- Añadir un mes a la fecha actual o a la de expiración si aún tiene días vigentes
        IF v_fecha_actual_empresa IS NULL OR v_fecha_actual_empresa < NOW() THEN
            v_fecha_actual_empresa := NOW() + INTERVAL '1 month';
        ELSE
            v_fecha_actual_empresa := v_fecha_actual_empresa + INTERVAL '1 month';
        END IF;

        -- Determinar tipo_plan (fallback seguro)
        v_tipo_plan_final := COALESCE(v_solicitud.plan_solicitado, 'PREMIUM');

        -- Hacer UPSERT en empresa_suscripciones
        INSERT INTO empresa_suscripciones (
            empresa_id, 
            tipo_plan, 
            fecha_inicio, 
            fecha_fin, 
            created_at, 
            updated_at
        )
        VALUES (
            v_solicitud.empresa_id,
            v_tipo_plan_final,
            NOW(),
            v_fecha_actual_empresa,
            NOW(),
            NOW()
        )
        ON CONFLICT (empresa_id) 
        DO UPDATE SET 
            tipo_plan = EXCLUDED.tipo_plan,
            fecha_fin = EXCLUDED.fecha_fin,
            updated_at = EXCLUDED.updated_at;

    ELSE
        -- Contexto: PAGO PERSONAL (Particular)

        -- Obtener fecha de expiración actual del usuario
        SELECT fecha_expiracion_plan INTO v_fecha_actual_persona
        FROM personas
        WHERE auth_user_id = v_solicitud.usuario_id;

        -- Añadir un mes a la fecha actual o a la de expiración si aún tiene días vigentes
        IF v_fecha_actual_persona IS NULL OR v_fecha_actual_persona < NOW() THEN
            v_fecha_actual_persona := NOW() + INTERVAL '1 month';
        ELSE
            v_fecha_actual_persona := v_fecha_actual_persona + INTERVAL '1 month';
        END IF;

        -- Actualizar tabla del usuario
        UPDATE personas
        SET fecha_expiracion_plan = v_fecha_actual_persona
        WHERE auth_user_id = v_solicitud.usuario_id;
    END IF;
END;
$$;
