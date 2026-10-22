"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { revalidarRutaVehiculo } from "@/app/actions/revalidate";

interface RespuestaFormProps {
  preguntaId: string;
  vehiculoId: string;
  respuestaInicial?: string | null;
}

export function RespuestaForm({ preguntaId, vehiculoId, respuestaInicial = "" }: RespuestaFormProps) {
  const [respuesta, setRespuesta] = useState(respuestaInicial || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(!respuestaInicial);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respuesta.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("preguntas")
        .update({
          respuesta: respuesta.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", preguntaId);

      if (error) {
        console.error("Error al responder pregunta:", error);
        alert(`Error al guardar respuesta: ${error.message}`);
      } else {
        setIsEditing(false);
        await revalidarRutaVehiculo(vehiculoId);
      }
    } catch (err) {
      console.error("Error inesperado al responder:", err);
      alert("Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (respuestaInicial) {
    return (
      <div className="mt-2 ml-4 flex items-start justify-between gap-4 bg-slate-50 p-3 border border-slate-100 rounded-none">
        <p className="text-slate-600 text-sm italic">
          <span className="font-bold text-slate-800 not-italic">Tu respuesta: </span>
          {respuestaInicial}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 ml-4 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          disabled={isSubmitting}
          placeholder="Escribe una respuesta para el comprador..."
          className="flex-1 p-2 text-sm border border-gray-300 rounded-none focus:border-blue-600 focus:outline-none text-slate-800"
        />
        <button
          type="submit"
          disabled={isSubmitting || !respuesta.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-none transition-colors"
        >
          {isSubmitting ? "Guardando..." : "Responder"}
        </button>
        {respuestaInicial && (
          <button
            type="button"
            onClick={() => {
              setRespuesta(respuestaInicial);
              setIsEditing(false);
            }}
            className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-none"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
