/**
 * app/panel-aliado/mis-publicaciones/page.tsx
 *
 * Server Component: carga las publicaciones del usuario autenticado
 * (propias o de la empresa a la que pertenece) y las pasa como prop
 * de hidratación al Client Component PublicacionesManager.
 *
 * Patrón de renderizado: SSR con revalidatePath desde Server Actions.
 * El Client Component refrescará la página con router.refresh() tras
 * cada mutación exitosa.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LayoutList } from "lucide-react";
import type { Vehiculo, Repuesto } from "@/types/database";
import { PublicacionesManager } from "@/components/panel/PublicacionesManager";

export const metadata = {
  title: "Mis Publicaciones | Panel Aliado",
  description: "Gestiona tus vehículos y repuestos publicados.",
};

export default async function MisPublicacionesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ── Determinar si el usuario pertenece a una empresa ────────────────────
  const { data: persona } = await supabase
    .from("personas")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .single();

  let empresaId: string | null = null;

  if (persona) {
    const { data: empleado } = await supabase
      .from("empleados_empresa")
      .select("empresa_id")
      .eq("persona_id", persona.id)
      .limit(1)
      .single();

    empresaId = empleado?.empresa_id ?? null;
  }

  // ── Consultar vehículos ──────────────────────────────────────────────────
  let vQuery = supabase
    .from("vehiculos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (empresaId) {
    vQuery = vQuery.eq("vendedor_empresa_id", empresaId);
  } else {
    vQuery = vQuery.eq("creado_por_auth_id", user.id);
  }

  const { data: vehiculosData } = await vQuery;
  const vehiculos = (vehiculosData ?? []) as Vehiculo[];

  // ── Consultar repuestos ──────────────────────────────────────────────────
  let rQuery = supabase
    .from("repuestos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (empresaId) {
    rQuery = rQuery.eq("vendedor_empresa_id", empresaId);
  } else {
    rQuery = rQuery.eq("creado_por_auth_id", user.id);
  }

  const { data: repuestosData } = await rQuery;
  const repuestos = (repuestosData ?? []) as Repuesto[];

  // ── Métricas de resumen para el header ──────────────────────────────────
  const totalVistas =
    vehiculos.reduce((s, v) => s + (v.vistas ?? 0), 0) +
    repuestos.reduce((s, r) => s + (r.vistas ?? 0), 0);

  const totalActivos =
    vehiculos.filter((v) => v.estado === "ACTIVO").length +
    repuestos.filter((r) => r.estado === "ACTIVO").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 flex items-center justify-center">
              <LayoutList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mis Publicaciones
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestiona el estado de tu inventario en tiempo real.
              </p>
            </div>
          </div>
          <Link
            href="/panel-aliado"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Volver
          </Link>
        </div>

        {/* Métricas de resumen */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {vehiculos.length + repuestos.length}
            </span>
            <span className="text-sm text-slate-500">publicaciones totales</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {totalActivos}
            </span>
            <span className="text-sm text-slate-500">activas</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalVistas.toLocaleString("es-VE")}
            </span>
            <span className="text-sm text-slate-500">vistas totales</span>
          </div>
        </div>
      </div>

      {/* ── Gestor de Publicaciones (Client Component) ───────────────────── */}
      <PublicacionesManager
        vehiculosIniciales={vehiculos}
        repuestosIniciales={repuestos}
      />
    </div>
  );
}
