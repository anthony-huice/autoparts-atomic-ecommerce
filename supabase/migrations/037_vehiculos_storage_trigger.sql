-- ==============================================================================
-- Funciones y Triggers para eliminar imágenes de Storage al borrar un vehículo
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.funcion_eliminar_imagenes_vehiculo()
RETURNS TRIGGER AS $$
DECLARE
    url text;
    extracted_path text;
    paths text[] := '{}';
BEGIN
    -- Si el array de imágenes está vacío o es nulo, terminamos silenciosamente
    IF OLD.imagenes_url IS NULL OR array_length(OLD.imagenes_url, 1) IS NULL THEN
        RETURN OLD;
    END IF;

    BEGIN
        -- Recorremos cada URL pública para extraer su path relativo dentro del bucket
        FOREACH url IN ARRAY OLD.imagenes_url LOOP
            -- Se usa regex para eliminar toda la primera parte de la URL hasta el nombre del bucket
            -- Ejemplo de URL: https://[proyecto].supabase.co/storage/v1/object/public/inventario/carpeta/img.webp
            extracted_path := regexp_replace(url, '^.*/public/inventario/', '');
            
            -- Si el regex hizo un reemplazo (es decir, la URL contenía el patrón esperado), la agregamos
            IF extracted_path <> url THEN
                paths := array_append(paths, extracted_path);
            END IF;
        END LOOP;

        -- Si logramos extraer paths válidos, procedemos con el DELETE atómico
        IF array_length(paths, 1) > 0 THEN
            DELETE FROM storage.objects 
            WHERE bucket_id = 'inventario' 
            AND name = ANY(paths);
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Captura de errores para evitar que un fallo en Storage bloquee el hard delete del vehículo
        RAISE WARNING 'Error al intentar eliminar imágenes del Storage para el vehículo %: %', OLD.id, SQLERRM;
    END;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos el trigger si existe previamente para asegurar idempotencia
DROP TRIGGER IF EXISTS trigger_eliminar_imagenes_vehiculo ON public.vehiculos;

-- Creamos el trigger asociado al evento AFTER DELETE
CREATE TRIGGER trigger_eliminar_imagenes_vehiculo
AFTER DELETE ON public.vehiculos
FOR EACH ROW
EXECUTE FUNCTION public.funcion_eliminar_imagenes_vehiculo();
