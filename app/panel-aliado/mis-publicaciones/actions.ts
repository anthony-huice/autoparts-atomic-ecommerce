"use server";

/**
 * app/panel-aliado/mis-publicaciones/actions.ts
 *
 * Server Actions para la gestión transaccional de publicaciones.
 * Todas las mutaciones se canalizan aquí, nunca desde el cliente directamente.
 *
 * SEGURIDAD:
 *   - Usan el cliente Supabase de servidor (@supabase/ssr), que resuelve la
 *     sesión del usuario desde las cookies de la petición. El auth.uid() que
 *     recibe el RPC es el del usuario real — no puede ser falsificado.
 *   - Los RPC son SECURITY INVOKER (excepto vistas), por lo que las políticas
 *     RLS se aplican adicionalmente a las validaciones internas del RPC.
 *
 * DIRECTRICES:
 *   - Nunca DELETE físico: se usa soft_delete_vehiculo / soft_delete_repuesto.
 *   - Consistencia transaccional: todo cambio de estado va por RPC atómico.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EstadoPublicacion } from "@/types/database";

// ─── Tipo de resultado homogéneo para todas las acciones ──────────────────────
export type AccionResultado = {
  ok: boolean;
  error?: string;
};

// =============================================================================
// ACTION: cambiarEstadoVehiculo
// Cambia el estado (ACTIVO / PAUSADO / VENDIDO) de un vehículo.
// Internamente llama al RPC actualizar_estado_publicacion_vehiculo que verifica
// que el usuario es propietario O miembro de la empresa vendedora.
// =============================================================================
export async function cambiarEstadoVehiculo(
  vehiculoId: string,
  nuevoEstado: EstadoPublicacion,
  razonBaja?: string
): Promise<AccionResultado> {
  if (nuevoEstado === "VENDIDO" && razonBaja) {
    console.log(`[cambiarEstadoVehiculo] Vehículo marcado como VENDIDO. Razón: ${razonBaja}`);
  }
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "actualizar_estado_publicacion_vehiculo",
    {
      p_vehiculo_id: vehiculoId,
      p_nuevo_estado: nuevoEstado,
    }
  );

  if (error) {
    console.error("[cambiarEstadoVehiculo]", error);
    return { ok: false, error: error.message };
  }

  // Invalida la caché del catálogo público y del panel
  revalidatePath("/vehiculos");
  revalidatePath("/panel-aliado/mis-publicaciones");
  revalidatePath("/panel-aliado");

  return { ok: true };
}

// =============================================================================
// ACTION: cambiarEstadoRepuesto
// =============================================================================
export async function cambiarEstadoRepuesto(
  repuestoId: string,
  nuevoEstado: EstadoPublicacion,
  razonBaja?: string
): Promise<AccionResultado> {
  if (nuevoEstado === "VENDIDO" && razonBaja) {
    console.log(`[cambiarEstadoRepuesto] Repuesto marcado como VENDIDO. Razón: ${razonBaja}`);
  }
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "actualizar_estado_publicacion_repuesto",
    {
      p_repuesto_id: repuestoId,
      p_nuevo_estado: nuevoEstado,
    }
  );

  if (error) {
    console.error("[cambiarEstadoRepuesto]", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/repuestos");
  revalidatePath("/panel-aliado/mis-publicaciones");
  revalidatePath("/panel-aliado");

  return { ok: true };
}

// =============================================================================
// ACTION: eliminarVehiculo
// Soft Delete: establece deleted_at = NOW() via RPC autorizado por empresa/autor.
// NUNCA elimina el registro físicamente (DIRECTRICES §2).
// =============================================================================
export async function eliminarVehiculo(
  vehiculoId: string
): Promise<AccionResultado> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("soft_delete_vehiculo", {
    p_vehiculo_id: vehiculoId,
  });

  if (error) {
    console.error("[eliminarVehiculo]", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/vehiculos");
  revalidatePath("/panel-aliado/mis-publicaciones");
  revalidatePath("/panel-aliado");

  return { ok: true };
}

// =============================================================================
// ACTION: eliminarRepuesto
// =============================================================================
export async function eliminarRepuesto(
  repuestoId: string
): Promise<AccionResultado> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("soft_delete_repuesto", {
    p_repuesto_id: repuestoId,
  });

  if (error) {
    console.error("[eliminarRepuesto]", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/repuestos");
  revalidatePath("/panel-aliado/mis-publicaciones");
  revalidatePath("/panel-aliado");

  return { ok: true };
}
