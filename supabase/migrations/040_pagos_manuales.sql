-- =============================================================================
-- MIGRACIÓN 040: Sistema de Verificación de Pagos Manuales
-- Descripción: Implementa la tabla de solicitudes de pago, RLS y función RPC
--              para aprobar pagos y extender automáticamente la membresía.
-- =============================================================================

-- 1. Asegurar la columna de expiración en la tabla del usuario (personas)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS fecha_expiracion_plan TIMESTAMPTZ NULL;

-- 2. Crear tipo ENUM para los estados de la solicitud
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_solicitud_pago') THEN
        CREATE TYPE estado_solicitud_pago AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');
    END IF;
END
$$;

-- 3. Crear tabla de solicitudes de pago
CREATE TABLE IF NOT EXISTS solicitudes_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID, -- Opcional, puede referenciar a un plan específico si aplica
    comprobante_url TEXT NOT NULL,
    emisor TEXT NOT NULL,
    referencia TEXT NOT NULL,
    fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado estado_solicitud_pago NOT NULL DEFAULT 'PENDIENTE',
    motivo_rechazo TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Habilitar RLS en la tabla solicitudes_pago
ALTER TABLE solicitudes_pago ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para solicitudes_pago
-- Los usuarios regulares solo pueden INSERTAR y LEER sus propios registros
CREATE POLICY "Los usuarios pueden ver sus propias solicitudes"
    ON solicitudes_pago FOR SELECT
    TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden insertar sus propias solicitudes"
    ON solicitudes_pago FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

-- Los administradores pueden ACTUALIZAR estados y LEER todas
CREATE POLICY "Admins pueden ver todas las solicitudes"
    ON solicitudes_pago FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        EXISTS (SELECT 1 FROM personas WHERE auth_user_id = auth.uid() AND is_superadmin = true)
    );

CREATE POLICY "Admins pueden actualizar todas las solicitudes"
    ON solicitudes_pago FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        EXISTS (SELECT 1 FROM personas WHERE auth_user_id = auth.uid() AND is_superadmin = true)
    );

-- 6. Función RPC para aprobar pago de manera atómica
CREATE OR REPLACE FUNCTION aprobar_pago(solicitud_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_solicitud solicitudes_pago%ROWTYPE;
    v_fecha_actual TIMESTAMPTZ;
BEGIN
    -- Validar que la persona que ejecuta sea admin o superadmin (opcional, la lógica de negocio la invoca)
    IF NOT (
        (auth.jwt() ->> 'role') = 'admin' OR 
        EXISTS (SELECT 1 FROM personas WHERE auth_user_id = auth.uid() AND is_superadmin = true)
    ) THEN
        RAISE EXCEPTION 'No tienes permisos para aprobar pagos';
    END IF;

    -- Bloquear la fila de la solicitud para evitar condiciones de carrera (SELECT FOR UPDATE)
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

    -- Obtener fecha de expiración actual del usuario
    SELECT fecha_expiracion_plan INTO v_fecha_actual
    FROM personas
    WHERE auth_user_id = v_solicitud.usuario_id;

    -- Añadir un mes a la fecha actual o a la de expiración si aún tiene días vigentes
    IF v_fecha_actual IS NULL OR v_fecha_actual < NOW() THEN
        v_fecha_actual := NOW() + INTERVAL '1 month';
    ELSE
        v_fecha_actual := v_fecha_actual + INTERVAL '1 month';
    END IF;

    -- Actualizar tabla del usuario
    UPDATE personas
    SET fecha_expiracion_plan = v_fecha_actual
    WHERE auth_user_id = v_solicitud.usuario_id;
END;
$$;

-- 7. Configuración de Storage para bucket privado "comprobantes"
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para "comprobantes"
CREATE POLICY "Usuarios pueden subir comprobantes"
    ON storage.objects FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'comprobantes' AND auth.uid() = owner);

CREATE POLICY "Usuarios pueden leer sus propios comprobantes"
    ON storage.objects FOR SELECT 
    TO authenticated
    USING (bucket_id = 'comprobantes' AND auth.uid() = owner);

CREATE POLICY "Admins pueden leer todos los comprobantes"
    ON storage.objects FOR SELECT 
    TO authenticated
    USING (
        bucket_id = 'comprobantes' AND (
            (auth.jwt() ->> 'role') = 'admin' OR 
            EXISTS (SELECT 1 FROM personas WHERE auth_user_id = auth.uid() AND is_superadmin = true)
        )
    );
