-- 1. Crear la función del trigger para validación estricta
CREATE OR REPLACE FUNCTION trg_check_kilometraje_particular()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendedor_tipo = 'PARTICULAR' AND COALESCE(NEW.kilometraje, 0) <= 0 THEN
    RAISE EXCEPTION 'Un particular no puede publicar vehículos nuevos (0 km). El kilometraje debe ser mayor a 0.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Asignar el trigger a la tabla vehiculos
DROP TRIGGER IF EXISTS trg_valida_kilometraje_particular ON vehiculos;
CREATE TRIGGER trg_valida_kilometraje_particular
  BEFORE INSERT OR UPDATE ON vehiculos
  FOR EACH ROW
  EXECUTE FUNCTION trg_check_kilometraje_particular();
