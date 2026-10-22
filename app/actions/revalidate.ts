"use server";

import { revalidatePath } from "next/cache";

/**
 * Revalida quirúrgicamente la ruta de un vehículo específico.
 * Útil para Server Actions donde el cliente muta datos (ej. responder una pregunta)
 * y necesitamos purgar la caché ISR estática de esa única página sin hacer router.refresh().
 */
export async function revalidarRutaVehiculo(vehiculoId: string) {
  revalidatePath(`/vehiculos/${vehiculoId}`);
}
