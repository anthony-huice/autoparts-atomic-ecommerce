"use server";

/**
 * app/panel-aliado/buzon/actions.ts
 * Server Action para responder preguntas desde el Buzón.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RespuestaResultado = {
  ok: boolean;
  error?: string;
};

export async function responderPregunta(
  preguntaId: string,
  respuesta: string
): Promise<RespuestaResultado> {
  if (!respuesta.trim()) {
    return { ok: false, error: "La respuesta no puede estar vacía." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("preguntas")
    .update({
      respuesta: respuesta.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", preguntaId);

  if (error) {
    console.error("[responderPregunta]", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/panel-aliado/buzon");
  return { ok: true };
}
