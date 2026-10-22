"use client";

/**
 * components/panel/PublicacionesManager.tsx
 *
 * Client Component que gestiona la lista de publicaciones del usuario.
 * Usa TanStack Query para el estado asíncrono (DIRECTRICES §3: Gestión de Estado).
 *
 * Flujo:
 *   1. Recibe los datos iniciales del Server Component padre (SSR).
 *   2. TanStack Query los hidrata y mantiene el caché sincronizado.
 *   3. Las acciones (Pausar / Vendido / Eliminar) llaman Server Actions.
 *   4. Tras cada mutación: invalidate + revalidatePath (server-side ISR).
 */

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  Pause,
  Play,
  Tag,
  Trash2,
  Car,
  Wrench,
  ExternalLink,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { Vehiculo, Repuesto, EstadoPublicacion } from "@/types/database";
import {
  cambiarEstadoVehiculo,
  cambiarEstadoRepuesto,
  eliminarVehiculo,
  eliminarRepuesto,
} from "@/app/panel-aliado/mis-publicaciones/actions";
import { ConfirmacionVentaModal } from "@/components/panel/ConfirmacionVentaModal";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TabActiva = "vehiculos" | "repuestos";

interface Props {
  vehiculosIniciales: Vehiculo[];
  repuestosIniciales: Repuesto[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatUSD = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? v : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
};

const formatNum = (n: number) => new Intl.NumberFormat("es-VE").format(n);

const ESTADO_LABELS: Record<EstadoPublicacion, { label: string; classes: string }> = {
  ACTIVO:  { label: "Activo",  classes: "bg-emerald-100 text-emerald-800" },
  PAUSADO: { label: "Pausado", classes: "bg-amber-100 text-amber-800" },
  VENDIDO: { label: "Vendido", classes: "bg-red-100 text-red-800" },
};

// ─── Subcomponente: Modal de confirmación de eliminación ─────────────────────

function ModalConfirmarEliminar({
  titulo,
  onConfirmar,
  onCancelar,
  loading,
}: {
  titulo: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white border border-gray-200 shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              ¿Eliminar esta publicación?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">{titulo}</span> quedará oculta del
              catálogo. Esta acción usa Soft Delete (el registro no se borra
              físicamente).
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponente: Fila de vehículo ─────────────────────────────────────────

function FilaVehiculo({ vehiculo, onRefresh }: { vehiculo: Vehiculo; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [modalVentaAbierto, setModalVentaAbierto] = useState(false);

  const imageUrl = vehiculo.imagenes_url?.[0] ?? null;
  const estadoInfo = ESTADO_LABELS[vehiculo.estado];

  const fechaExpiracion = vehiculo.fecha_expiracion_plan ? new Date(vehiculo.fecha_expiracion_plan) : null;
  let diasRestantes: number | null = null;
  if (fechaExpiracion) {
    const msDiff = fechaExpiracion.getTime() - Date.now();
    diasRestantes = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  }

  const ejecutarCambioEstado = (nuevoEstado: EstadoPublicacion, razon?: string) => {
    setPendingAction(nuevoEstado);
    startTransition(async () => {
      const res = await cambiarEstadoVehiculo(vehiculo.id, nuevoEstado, razon);
      if (res.ok) {
        toast.success(
          nuevoEstado === "PAUSADO"
            ? "Publicación pausada."
            : nuevoEstado === "VENDIDO"
            ? "¡Marcado como vendido! El lazo aparecerá en el catálogo."
            : "Publicación reactivada."
        );
        setModalVentaAbierto(false);
        onRefresh();
      } else {
        toast.error(`Error: ${res.error}`);
      }
      setPendingAction(null);
    });
  };

  const ejecutarEliminar = () => {
    setPendingAction("ELIMINAR");
    startTransition(async () => {
      const res = await eliminarVehiculo(vehiculo.id);
      if (res.ok) {
        toast.success("Publicación eliminada.");
        setConfirmarEliminar(false);
        onRefresh();
      } else {
        toast.error(`Error: ${res.error}`);
      }
      setPendingAction(null);
    });
  };

  return (
    <>
      {modalVentaAbierto && (
        <ConfirmacionVentaModal
          onConfirmar={(razon) => ejecutarCambioEstado("VENDIDO", razon)}
          onCancelar={() => setModalVentaAbierto(false)}
          loading={pendingAction === "VENDIDO"}
        />
      )}
      {confirmarEliminar && (
        <ModalConfirmarEliminar
          titulo={`${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`}
          onConfirmar={ejecutarEliminar}
          onCancelar={() => setConfirmarEliminar(false)}
          loading={pendingAction === "ELIMINAR"}
        />
      )}

      <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 hover:border-gray-300 transition-colors">
        {/* Imagen */}
        <div className="relative w-20 h-16 shrink-0 bg-slate-100 overflow-hidden">
          {imageUrl ? (
            <Image src={imageUrl} alt={vehiculo.marca} fill className="object-cover" sizes="80px" placeholder="blur" blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg==" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
              <Car className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm truncate">
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${estadoInfo.classes}`}>
              {estadoInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{formatUSD(vehiculo.precio)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatNum(vehiculo.vistas ?? 0)} vistas
            </span>
            <span>·</span>
            <span>{formatNum(vehiculo.kilometraje)} km</span>
            {vehiculo.vendedor_tipo === "PARTICULAR" && diasRestantes !== null && vehiculo.estado !== "VENDIDO" && (
              <>
                <span>·</span>
                <span className={`flex items-center gap-1 font-semibold ${diasRestantes > 3 ? "text-slate-600" : "text-red-600"}`}>
                  <Clock className="w-3 h-3" />
                  {diasRestantes > 0 ? `${diasRestantes} días restantes` : "Expirado"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ver en catálogo */}
          <Link
            href={`/vehiculos/${vehiculo.id}`}
            target="_blank"
            className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            title="Ver en catálogo"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* Pausar / Reactivar */}
          {vehiculo.estado === "ACTIVO" ? (
            <button
              onClick={() => ejecutarCambioEstado("PAUSADO")}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
              title="Pausar publicación"
            >
              <Pause className="w-3.5 h-3.5" />
              {pendingAction === "PAUSADO" ? "..." : "Pausar"}
            </button>
          ) : vehiculo.estado === "PAUSADO" ? (
            <button
              onClick={() => ejecutarCambioEstado("ACTIVO")}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              title="Reactivar publicación"
            >
              <Play className="w-3.5 h-3.5" />
              {pendingAction === "ACTIVO" ? "..." : "Activar"}
            </button>
          ) : null}

          {/* Marcar Vendido */}
          {vehiculo.estado !== "VENDIDO" && (
            <button
              onClick={() => setModalVentaAbierto(true)}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 border border-red-300 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              title="Marcar como vendido"
            >
              <Tag className="w-3.5 h-3.5" />
              {pendingAction === "VENDIDO" ? "..." : "Vendido"}
            </button>
          )}

          {/* Eliminar */}
          <button
            onClick={() => setConfirmarEliminar(true)}
            disabled={isPending}
            className="p-2 border border-red-200 hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
            title="Eliminar (Soft Delete)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Subcomponente: Fila de repuesto ─────────────────────────────────────────

function FilaRepuesto({ repuesto, onRefresh }: { repuesto: Repuesto; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [modalVentaAbierto, setModalVentaAbierto] = useState(false);

  const imageUrl = repuesto.imagenes_url?.[0] ?? null;
  const estadoInfo = ESTADO_LABELS[repuesto.estado];

  const ejecutarCambioEstado = (nuevoEstado: EstadoPublicacion, razon?: string) => {
    setPendingAction(nuevoEstado);
    startTransition(async () => {
      const res = await cambiarEstadoRepuesto(repuesto.id, nuevoEstado, razon);
      if (res.ok) {
        toast.success(
          nuevoEstado === "PAUSADO" ? "Repuesto pausado." :
          nuevoEstado === "VENDIDO" ? "Marcado como vendido." : "Repuesto reactivado."
        );
        setModalVentaAbierto(false);
        onRefresh();
      } else {
        toast.error(`Error: ${res.error}`);
      }
      setPendingAction(null);
    });
  };

  const ejecutarEliminar = () => {
    setPendingAction("ELIMINAR");
    startTransition(async () => {
      const res = await eliminarRepuesto(repuesto.id);
      if (res.ok) {
        toast.success("Repuesto eliminado.");
        setConfirmarEliminar(false);
        onRefresh();
      } else {
        toast.error(`Error: ${res.error}`);
      }
      setPendingAction(null);
    });
  };

  return (
    <>
      {modalVentaAbierto && (
        <ConfirmacionVentaModal
          onConfirmar={(razon) => ejecutarCambioEstado("VENDIDO", razon)}
          onCancelar={() => setModalVentaAbierto(false)}
          loading={pendingAction === "VENDIDO"}
        />
      )}
      {confirmarEliminar && (
        <ModalConfirmarEliminar
          titulo={repuesto.nombre_repuesto}
          onConfirmar={ejecutarEliminar}
          onCancelar={() => setConfirmarEliminar(false)}
          loading={pendingAction === "ELIMINAR"}
        />
      )}

      <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 hover:border-gray-300 transition-colors">
        {/* Imagen */}
        <div className="relative w-20 h-16 shrink-0 bg-slate-100 overflow-hidden">
          {imageUrl ? (
            <Image src={imageUrl} alt={repuesto.nombre_repuesto} fill className="object-cover" sizes="80px" placeholder="blur" blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg==" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
              <Wrench className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm truncate">
              {repuesto.nombre_repuesto}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${estadoInfo.classes}`}>
              {estadoInfo.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${repuesto.es_nuevo ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
              {repuesto.es_nuevo ? "Nuevo" : "Usado"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{formatUSD(repuesto.precio)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatNum(repuesto.vistas ?? 0)} vistas
            </span>
            {repuesto.marca_repuesto && (
              <>
                <span>·</span>
                <span>{repuesto.marca_repuesto}</span>
              </>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/repuestos/${repuesto.id}`}
            target="_blank"
            className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            title="Ver en catálogo"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {repuesto.estado === "ACTIVO" ? (
            <button
              onClick={() => ejecutarCambioEstado("PAUSADO")}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5" />
              {pendingAction === "PAUSADO" ? "..." : "Pausar"}
            </button>
          ) : repuesto.estado === "PAUSADO" ? (
            <button
              onClick={() => ejecutarCambioEstado("ACTIVO")}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {pendingAction === "ACTIVO" ? "..." : "Activar"}
            </button>
          ) : null}

          {repuesto.estado !== "VENDIDO" && (
            <button
              onClick={() => setModalVentaAbierto(true)}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 border border-red-300 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Tag className="w-3.5 h-3.5" />
              {pendingAction === "VENDIDO" ? "..." : "Vendido"}
            </button>
          )}

          <button
            onClick={() => setConfirmarEliminar(true)}
            disabled={isPending}
            className="p-2 border border-red-200 hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PublicacionesManager({ vehiculosIniciales, repuestosIniciales }: Props) {
  const [tab, setTab] = useState<TabActiva>("vehiculos");
  const router = useRouter();
  const queryClient = useQueryClient();

  // Datos locales hidratados desde el SSR inicial.
  // Tras cada acción, router.refresh() + revalidatePath hace que el Server Component
  // vuelva a correr y re-hidrate este componente con datos frescos.
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(vehiculosIniciales);
  const [repuestos, setRepuestos] = useState<Repuesto[]>(repuestosIniciales);

  // Función de refresco: pide al router que re-ejecute el Server Component padre.
  // También invalida cualquier query de TanStack que pueda estar cacheando datos.
  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["mis-publicaciones"] });
    router.refresh();
  };

  const tabClass = (activa: TabActiva) =>
    `px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
      tab === activa
        ? "border-slate-900 text-slate-900"
        : "border-transparent text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="space-y-6">

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 flex">
        <button
          id="tab-vehiculos"
          onClick={() => setTab("vehiculos")}
          className={tabClass("vehiculos")}
        >
          <span className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            Vehículos
            <span className="ml-1 bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5">
              {vehiculos.length}
            </span>
          </span>
        </button>
        <button
          id="tab-repuestos"
          onClick={() => setTab("repuestos")}
          className={tabClass("repuestos")}
        >
          <span className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Repuestos
            <span className="ml-1 bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5">
              {repuestos.length}
            </span>
          </span>
        </button>
      </div>

      {/* ── Lista de Vehículos ────────────────────────────────────────────── */}
      {tab === "vehiculos" && (
        <div className="space-y-2">
          {vehiculos.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-200">
              <Car className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No tienes vehículos publicados.</p>
              <Link
                href="/panel-aliado/vehiculos/nuevo"
                className="inline-block mt-4 px-5 py-2 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Publicar primer vehículo
              </Link>
            </div>
          ) : (
            vehiculos.map((v) => (
              <FilaVehiculo key={v.id} vehiculo={v} onRefresh={onRefresh} />
            ))
          )}
        </div>
      )}

      {/* ── Lista de Repuestos ────────────────────────────────────────────── */}
      {tab === "repuestos" && (
        <div className="space-y-2">
          {repuestos.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-200">
              <Wrench className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No tienes repuestos publicados.</p>
              <Link
                href="/panel-aliado/repuestos/nuevo"
                className="inline-block mt-4 px-5 py-2 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Publicar primer repuesto
              </Link>
            </div>
          ) : (
            repuestos.map((r) => (
              <FilaRepuesto key={r.id} repuesto={r} onRefresh={onRefresh} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
