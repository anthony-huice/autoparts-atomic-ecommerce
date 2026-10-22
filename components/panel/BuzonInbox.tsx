"use client";

/**
 * components/panel/BuzonInbox.tsx
 *
 * Inbox de preguntas estilo cliente de correo:
 *   - Lista de conversaciones a la izquierda (panel compacto).
 *   - Detalle de la conversación seleccionada a la derecha.
 *
 * Características:
 *   - Selección de pregunta sin navegación de página (SPA-like).
 *   - Filtro visual: Todas | Sin Responder.
 *   - Formulario de respuesta inline con useTransition.
 *   - Responsive: en móvil, la lista ocupa toda la pantalla y el detalle
 *     abre como una vista nueva (con botón Volver).
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageSquare,
  Car,
  Wrench,
  ArrowLeft,
  Clock,
  CheckCircle,
  Send,
  ExternalLink,
} from "lucide-react";
import { responderPregunta } from "@/app/panel-aliado/buzon/actions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Pregunta {
  id: string;
  texto: string;
  respuesta: string | null;
  created_at: string;
  vehiculo_id: string | null;
  repuesto_id: string | null;
  // campos enriquecidos que vienen del Server Component
  titulo_publicacion: string;
  tipo_publicacion: "vehiculo" | "repuesto";
  url_publicacion: string;
}

interface Props {
  preguntasIniciales: Pregunta[];
}

type Filtro = "todas" | "sin_responder";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const d = new Date(iso);
  const ahora = new Date();
  const diffMs = ahora.getTime() - d.getTime();
  const diffHoras = diffMs / 1000 / 60 / 60;
  if (diffHoras < 1) return "Hace menos de 1 hora";
  if (diffHoras < 24) return `Hace ${Math.floor(diffHoras)} horas`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias === 1) return "Ayer";
  if (diffDias < 7) return `Hace ${diffDias} días`;
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Componente: Panel de Detalle ─────────────────────────────────────────────

function PanelDetalle({
  pregunta,
  onRespuestaEnviada,
  onVolver,
}: {
  pregunta: Pregunta;
  onRespuestaEnviada: () => void;
  onVolver: () => void;
}) {
  const [texto, setTexto] = useState(pregunta.respuesta ?? "");
  const [isPending, startTransition] = useTransition();

  const enviarRespuesta = () => {
    if (!texto.trim()) return;
    startTransition(async () => {
      const res = await responderPregunta(pregunta.id, texto);
      if (res.ok) {
        toast.success("Respuesta publicada. El comprador la verá en el anuncio.");
        onRespuestaEnviada();
      } else {
        toast.error(`Error: ${res.error}`);
      }
    });
  };

  const IconTipo = pregunta.tipo_publicacion === "vehiculo" ? Car : Wrench;

  return (
    <div className="flex flex-col h-full">
      {/* Header del detalle */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <button
          onClick={onVolver}
          className="md:hidden flex items-center gap-1.5 text-sm text-gray-600 mb-3 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-slate-100 flex items-center justify-center shrink-0">
            <IconTipo className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-0.5 capitalize">
              {pregunta.tipo_publicacion === "vehiculo" ? "Vehículo" : "Repuesto"}
            </p>
            <h2 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
              {pregunta.titulo_publicacion}
            </h2>
          </div>
          <Link
            href={pregunta.url_publicacion}
            target="_blank"
            className="p-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors shrink-0"
            title="Ver publicación"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Conversación */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* Burbuja del comprador */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 bg-slate-200 shrink-0 flex items-center justify-center text-slate-600">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div className="max-w-[85%]">
            <div className="bg-white border border-gray-200 p-3 text-sm text-slate-800 leading-relaxed">
              {pregunta.texto}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {formatFecha(pregunta.created_at)}
            </p>
          </div>
        </div>

        {/* Burbuja de respuesta (si ya existe) */}
        {pregunta.respuesta && (
          <div className="flex items-start gap-2.5 flex-row-reverse">
            <div className="w-7 h-7 bg-slate-800 shrink-0 flex items-center justify-center text-white">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[85%]">
              <div className="bg-slate-900 text-white p-3 text-sm leading-relaxed">
                {pregunta.respuesta}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 text-right">
                Tu respuesta
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Área de respuesta */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {pregunta.respuesta ? (
          <p className="text-xs text-slate-500 text-center py-1">
            Esta pregunta ya fue respondida. La respuesta es visible en el anuncio.
          </p>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              rows={2}
              disabled={isPending}
              className="flex-1 text-sm border border-gray-300 p-2.5 resize-none focus:outline-none focus:border-slate-700 bg-white text-slate-900 placeholder-slate-400 disabled:opacity-60"
            />
            <button
              onClick={enviarRespuesta}
              disabled={isPending || !texto.trim()}
              className="px-4 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center"
              title="Enviar respuesta"
            >
              {isPending ? (
                <span className="text-xs">...</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function BuzonInbox({ preguntasIniciales }: Props) {
  const router = useRouter();
  const [preguntas, setPreguntas] = useState<Pregunta[]>(preguntasIniciales);
  const [seleccionada, setSeleccionada] = useState<Pregunta | null>(
    preguntasIniciales[0] ?? null
  );
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [mostrandoDetalle, setMostrandoDetalle] = useState(false);

  const preguntasFiltradas =
    filtro === "sin_responder"
      ? preguntas.filter((p) => !p.respuesta)
      : preguntas;

  const sinResponder = preguntas.filter((p) => !p.respuesta).length;

  const handleRespuestaEnviada = () => {
    // Marca la pregunta como respondida localmente (optimistic)
    if (seleccionada) {
      setPreguntas((prev) =>
        prev.map((p) =>
          p.id === seleccionada.id ? { ...p, respuesta: "✓ Respondida" } : p
        )
      );
    }
    router.refresh();
  };

  const handleSeleccionar = (pregunta: Pregunta) => {
    setSeleccionada(pregunta);
    setMostrandoDetalle(true);
  };

  if (preguntas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <MessageSquare className="w-14 h-14 mb-4 text-slate-200" />
        <p className="font-bold text-slate-600 text-base">Buzón vacío</p>
        <p className="text-sm mt-1">
          Aquí aparecerán las preguntas de los compradores sobre tus anuncios.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] border border-gray-200 bg-white overflow-hidden">

      {/* ── Panel Izquierdo: Lista ─────────────────────────────────────── */}
      <aside
        className={`w-full md:w-80 md:flex flex-col border-r border-gray-200 shrink-0 bg-white ${
          mostrandoDetalle ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Filtros */}
        <div className="p-3 border-b border-gray-100 flex gap-2">
          <button
            onClick={() => setFiltro("todas")}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              filtro === "todas"
                ? "bg-slate-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todas ({preguntas.length})
          </button>
          <button
            onClick={() => setFiltro("sin_responder")}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              filtro === "sin_responder"
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Sin responder
            {sinResponder > 0 && (
              <span className="ml-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5">
                {sinResponder}
              </span>
            )}
          </button>
        </div>

        {/* Lista de preguntas */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {preguntasFiltradas.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              No hay preguntas sin responder.
            </div>
          ) : (
            preguntasFiltradas.map((p) => {
              const IconTipo = p.tipo_publicacion === "vehiculo" ? Car : Wrench;
              const estaSeleccionada = seleccionada?.id === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => handleSeleccionar(p)}
                  className={`w-full text-left p-3.5 transition-colors hover:bg-slate-50 ${
                    estaSeleccionada ? "bg-slate-50 border-l-2 border-l-slate-900" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Punto no leído */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <div className={`w-2 h-2 ${!p.respuesta ? "bg-amber-500" : "bg-transparent border border-slate-200"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Título publicación */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <IconTipo className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-400 truncate">
                          {p.titulo_publicacion}
                        </span>
                      </div>

                      {/* Texto pregunta */}
                      <p className="text-sm text-slate-800 line-clamp-2 leading-snug">
                        {p.texto}
                      </p>

                      {/* Fecha + estado */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {formatFecha(p.created_at)}
                        </span>
                        {p.respuesta ? (
                          <span className="text-[11px] text-emerald-600 flex items-center gap-0.5 font-medium">
                            <CheckCircle className="w-3 h-3" /> Respondida
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Panel Derecho: Detalle ──────────────────────────────────────── */}
      <main
        className={`flex-1 flex flex-col min-w-0 ${
          mostrandoDetalle ? "flex" : "hidden md:flex"
        }`}
      >
        {seleccionada ? (
          <PanelDetalle
            key={seleccionada.id}
            pregunta={seleccionada}
            onRespuestaEnviada={handleRespuestaEnviada}
            onVolver={() => setMostrandoDetalle(false)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                Selecciona una pregunta para responder
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
