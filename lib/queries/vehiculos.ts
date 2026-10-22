import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export const getVehiculo = cache(async (id: string) => {
  const supabase = await createClient();
  return supabase
    .from("vehiculos")
    .select(
      "id, propietario_id, creado_por_auth_id, marca, modelo, version, anio, color, motor, traccion, tipo_vehiculo, transmision, kilometraje, combustible, cantidad_puertas, cantidad_ejes, cantidad_duenos, papeles_al_dia, precio, negociable, observacion, ubicacion, imagenes_url, vendedor_tipo, vendedor_persona_id, vendedor_empresa_id, estado, fecha_venta, vistas"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();
});
