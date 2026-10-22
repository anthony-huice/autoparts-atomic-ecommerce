-- Agregar nuevos valores al enum tipo_plan_empresa_enum
ALTER TYPE tipo_plan_empresa_enum ADD VALUE IF NOT EXISTS 'BRONCE';
ALTER TYPE tipo_plan_empresa_enum ADD VALUE IF NOT EXISTS 'PLATA';
ALTER TYPE tipo_plan_empresa_enum ADD VALUE IF NOT EXISTS 'ORO';

-- Función para validar publicación de repuestos
CREATE OR REPLACE FUNCTION public.validar_publicacion_repuesto()
RETURNS TRIGGER AS $$
DECLARE
    v_plan tipo_plan_empresa_enum;
    v_cantidad_activa INT;
    v_limite INT;
BEGIN
    -- Solo validamos si pertenece a una empresa
    IF NEW.vendedor_empresa_id IS NOT NULL AND NEW.estado = 'ACTIVO' AND NEW.deleted_at IS NULL THEN
        -- Obtener el plan actual de la empresa
        SELECT tipo_plan INTO v_plan
        FROM public.empresa_suscripciones
        WHERE empresa_id = NEW.vendedor_empresa_id;

        -- Definir el límite según el plan
        IF v_plan = 'BRONCE' THEN
            v_limite := 20;
        ELSIF v_plan = 'PLATA' THEN
            v_limite := 50;
        ELSIF v_plan = 'ORO' THEN
            v_limite := 999999;
        ELSE
            -- Plan básico u otros (por retrocompatibilidad o por defecto)
            v_limite := 5;
        END IF;

        -- Contar los repuestos activos de la empresa
        SELECT count(*) INTO v_cantidad_activa
        FROM public.repuestos
        WHERE vendedor_empresa_id = NEW.vendedor_empresa_id
          AND estado = 'ACTIVO'
          AND deleted_at IS NULL
          AND id != NEW.id; -- Excluir el mismo registro en caso de UPDATE

        IF v_cantidad_activa >= v_limite THEN
            RAISE EXCEPTION 'Has alcanzado el límite de % repuestos activos para tu plan %.', v_limite, v_plan;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger asociado
DROP TRIGGER IF EXISTS trigger_validar_publicacion_repuesto_limite ON public.repuestos;
CREATE TRIGGER trigger_validar_publicacion_repuesto_limite
BEFORE INSERT OR UPDATE ON public.repuestos
FOR EACH ROW
EXECUTE FUNCTION public.validar_publicacion_repuesto();
