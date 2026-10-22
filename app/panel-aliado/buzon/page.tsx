/**
 * app/panel-aliado/buzon/page.tsx
 *
 * Server Component: carga todas las preguntas del usuario autenticado
 * (propias o de su empresa) junto con la info de la publicación relacionada,
 * y las pasa al Client Component BuzonInbox.
 *
 * Estructura de datos enriquecida:
 *   - Para cada pregunta se resuelve: título de la publicación, tipo y URL
 *     → el Inbox puede renderizarlas sin sub-fetches adicionales.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { BuzonInbox } from "@/components/panel/BuzonInbox";

export const metadata = {
  title: "Buzón de Preguntas | Panel Aliado",
  description: "Responde las consultas de compradores sobre tus publicaciones.",
};

export default async function BuzonPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ── Determinar scope: particular vs empresa ──────────────────────────────
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

  // ── IDs de publicaciones del usuario (vehículos) ─────────────────────────
  let vQuery = supabase
    .from("vehiculos")
    .select("id, marca, modelo, anio")
    .is("deleted_at", null);

  if (empresaId) {
    vQuery = vQuery.eq("vendedor_empresa_id", empresaId);
  } else {
    vQuery = vQuery.eq("creado_por_auth_id", user.id);
  }

  const { data: misVehiculos } = await vQuery;

  // ── IDs de publicaciones del usuario (repuestos) ─────────────────────────
  let rQuery = supabase
    .from("repuestos")
    .select("id, nombre_repuesto")
    .is("deleted_at", null);

  if (empresaId) {
    rQuery = rQuery.eq("vendedor_empresa_id", empresaId);
  } else {
    rQuery = rQuery.eq("creado_por_auth_id", user.id);
  }

  const { data: misRepuestos } = await rQuery;

  // ── Mapas de lookup para enriquecer las preguntas ────────────────────────
  const vehiculosMap = new Map<string, { titulo: string; url: string }>();
  for (const v of misVehiculos ?? []) {
    vehiculosMap.set(v.id, {
      titulo: `${v.marca} ${v.modelo} ${v.anio}`,
      url: `/vehiculos/${v.id}`,
    });
  }

  const repuestosMap = new Map<string, { titulo: string; url: string }>();
  for (const r of misRepuestos ?? []) {
    repuestosMap.set(r.id, {
      titulo: r.nombre_repuesto,
      url: `/repuestos/${r.id}`,
    });
  }

  const vehiculoIds = [...vehiculosMap.keys()];
  const repuestoIds = [...repuestosMap.keys()];

  // Sin publicaciones → Buzón vacío
  if (vehiculoIds.length === 0 && repuestoIds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <PageHeader sinResponder={0} total={0} />
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-dashed border-gray-200 mt-8">
          <MessageSquare className="w-12 h-12 mb-3 text-slate-200" />
          <p className="font-bold text-slate-600 text-base">Buzón vacío</p>
          <p className="text-sm mt-1">
            Aún no tienes publicaciones con preguntas de compradores.
          </p>
        </div>
      </div>
    );
  }

  // ── Consultar preguntas relacionadas con las publicaciones del usuario ────
  const filters: string[] = [];
  if (vehiculoIds.length > 0)
    filters.push(`vehiculo_id.in.(${vehiculoIds.join(",")})`);
  if (repuestoIds.length > 0)
    filters.push(`repuesto_id.in.(${repuestoIds.join(",")})`);

  const { data: preguntasRaw } = await supabase
    .from("preguntas")
    .select("id, texto, respuesta, created_at, vehiculo_id, repuesto_id")
    .or(filters.join(","))
    .order("created_at", { ascending: false });

  // ── Enriquecer preguntas con datos de la publicación ─────────────────────
  const preguntas = (preguntasRaw ?? []).map((p) => {
    if (p.vehiculo_id && vehiculosMap.has(p.vehiculo_id)) {
      const info = vehiculosMap.get(p.vehiculo_id)!;
      return {
        ...p,
        titulo_publicacion: info.titulo,
        tipo_publicacion: "vehiculo" as const,
        url_publicacion: info.url,
      };
    }
    if (p.repuesto_id && repuestosMap.has(p.repuesto_id)) {
      const info = repuestosMap.get(p.repuesto_id)!;
      return {
        ...p,
        titulo_publicacion: info.titulo,
        tipo_publicacion: "repuesto" as const,
        url_publicacion: info.url,
      };
    }
    return {
      ...p,
      titulo_publicacion: "Publicación eliminada",
      tipo_publicacion: "vehiculo" as const,
      url_publicacion: "#",
    };
  });

  const sinResponder = preguntas.filter((p) => !p.respuesta).length;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader sinResponder={sinResponder} total={preguntas.length} />
      <BuzonInbox preguntasIniciales={preguntas} />
    </div>
  );
}

// ─── Subcomponente: Header de página ─────────────────────────────────────────

function PageHeader({
  sinResponder,
  total,
}: {
  sinResponder: number;
  total: number;
}) {
  return (
    <div className="pb-6 border-b border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-900 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Buzón de Preguntas
          </h1>
          <p className="text-sm text-slate-500">
            Responde consultas de compradores directamente desde aquí.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {total}
          </span>
          <span className="text-sm text-slate-500">preguntas totales</span>
        </div>
        {sinResponder > 0 && (
          <>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-600 tabular-nums">
                {sinResponder}
              </span>
              <span className="text-sm text-slate-500">sin responder</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
