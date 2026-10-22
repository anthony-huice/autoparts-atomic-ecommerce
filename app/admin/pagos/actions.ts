"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Obtener URL firmada para ver comprobante
export async function getComprobanteUrlAction(solicitud_id: string, filePath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // Verificar admin
  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona?.is_superadmin) {
    return { error: "Permisos insuficientes" };
  }

  const { data, error } = await supabase.storage
    .from("comprobantes")
    .createSignedUrl(filePath, 60 * 5); // 5 minutos de validez

  if (error || !data) {
    return { error: "No se pudo generar la url del comprobante" };
  }

  return { url: data.signedUrl };
}

// 2. Aprobar Pago
export async function aprobarPagoAction(solicitud_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona?.is_superadmin) {
    return { error: "Permisos insuficientes" };
  }

  const { error } = await supabase.rpc("aprobar_pago", { solicitud_id_param: solicitud_id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/pagos");
  return { success: true };
}

// 3. Rechazar Pago
export async function rechazarPagoAction(solicitud_id: string, motivo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona?.is_superadmin) {
    return { error: "Permisos insuficientes" };
  }

  // Update table (Never DELETE)
  const { error } = await supabase
    .from("solicitudes_pago")
    .update({ 
      estado: "RECHAZADO",
      motivo_rechazo: motivo,
      updated_at: new Date().toISOString()
    })
    .eq("id", solicitud_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/pagos");
  return { success: true };
}
