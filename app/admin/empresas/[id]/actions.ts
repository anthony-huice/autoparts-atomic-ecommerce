"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function toggleSuspendCompany(empresaId: string, currentDeletedAt: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Verificación de superadmin (con cliente normal, RLS sobre personas aplica)
  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona || persona.is_superadmin !== true) {
    throw new Error("Sin permisos");
  }

  // Si currentDeletedAt es null, la suspendemos (le ponemos NOW()).
  // Si no, la reactivamos (le ponemos null).
  const newValue = currentDeletedAt === null ? new Date().toISOString() : null;

  // Usamos el cliente admin para bypassear RLS en la escritura
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("empresas")
    .update({ deleted_at: newValue })
    .eq("id", empresaId);

  if (error) {
    console.error("Error toggling company status:", error);
    throw new Error("No se pudo actualizar el estado de la empresa");
  }

  revalidatePath("/admin/empresas");
  revalidatePath(`/admin/empresas/${empresaId}`);
}

export async function moderarPublicacion(id: string, tipo: "vehiculo" | "repuesto", empresaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // 1. Verificar identidad y permisos con el cliente normal (respeta RLS)
  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona || persona.is_superadmin !== true) {
    throw new Error("Sin permisos de superadmin");
  }

  // 2. Ejecutar el UPDATE usando el cliente admin (bypasea RLS)
  const adminClient = createAdminClient();
  const tabla = tipo === "vehiculo" ? "vehiculos" : "repuestos";

  const { error } = await adminClient
    .from(tabla)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error(`Error moderando ${tipo}:`, error);
    throw new Error(`No se pudo moderar el ${tipo}: ${error.message || JSON.stringify(error)}`);
  }

  revalidatePath(`/admin/empresas/${empresaId}`);
}
