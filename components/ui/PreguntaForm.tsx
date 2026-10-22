"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/store/useUIStore";

export function PreguntaForm({ vehiculoId, repuestoId, propietarioId }: { vehiculoId?: string, repuestoId?: string, propietarioId: string }) {
  const [pregunta, setPregunta] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { openAuthModal } = useUIStore();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pregunta.trim()) return;

    // --- Capa de Seguridad y Moderación de Contenido ---
    const textoLower = pregunta.toLowerCase();
    const palabrasProhibidas = ["estafa", "estafador", "robo", "mierda", "fraude", "coño", "puto", "puta", "marico", "guevon", "hijo de puta"];
    const contienePalabraProhibida = palabrasProhibidas.some(palabra => 
      new RegExp(`\\b${palabra}\\b`, 'i').test(textoLower)
    );
    
    if (contienePalabraProhibida) {
      alert("Tu pregunta contiene palabras no permitidas o lenguaje inapropiado.");
      return;
    }

    const regexEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const regexURL = /(https?:\/\/|www\.)\S+/i;
    if (regexEmail.test(pregunta) || regexURL.test(pregunta)) {
      alert("No está permitido incluir enlaces (URLs) o correos electrónicos en las preguntas.");
      return;
    }

    const regexTelefono = /(\d[\s-]*){10,}/;
    if (regexTelefono.test(pregunta)) {
      alert("No está permitido incluir números de teléfono en las preguntas.");
      return;
    }
    // ----------------------------------------------------

    setIsSubmitting(true);

    try {
      // 1. Validar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        openAuthModal("login");
        setIsSubmitting(false);
        return;
      }

      const userId = session.user.id;

      // 2. Validar que no sea el propio vendedor
      if (userId === propietarioId) {
        alert("No puedes hacer preguntas en tus propias publicaciones.");
        setIsSubmitting(false);
        return;
      }

      // 3. Inserción en la tabla de preguntas
      const { error } = await supabase.from("preguntas").insert({
        ...(vehiculoId ? { vehiculo_id: vehiculoId } : {}),
        ...(repuestoId ? { repuesto_id: repuestoId } : {}),
        user_id: userId,
        texto: pregunta.trim(),
      });

      if (error) {
        console.error("Error al enviar pregunta (detalles):", JSON.stringify(error, null, 2), error.message, error.details);
        alert(`Error al enviar: ${error.message || "Revisa la consola"}`);
      } else {
        // Enviar notificación al dueño del vehículo/repuesto (propietarioId)
        if (propietarioId && propietarioId !== userId) {
          const { error: notifError } = await supabase.from("notificaciones").insert({
            user_id: propietarioId,
            titulo: "Nueva pregunta",
            mensaje: vehiculoId 
              ? "Has recibido una nueva pregunta sobre tu vehículo publicado."
              : "Has recibido una nueva pregunta sobre tu repuesto publicado.",
            tipo: "pregunta",
            metadata: {
              vehiculo_id: vehiculoId || null,
              repuesto_id: repuestoId || null,
            }
          });
          if (notifError) {
            console.error("Error al insertar la notificación:", notifError);
          }
        }

        alert("¡Pregunta enviada con éxito! El vendedor te responderá pronto.");
        setPregunta("");
      }
    } catch (err) {
      console.error("Error inesperado:", err);
      alert("Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-gray-200 p-6 rounded-none bg-white">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Pregúntale al vendedor</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={isSubmitting}
          className="w-full p-3 border border-gray-300 rounded-none focus:border-blue-600 focus:ring-0 resize-none h-24 text-sm text-slate-900"
          placeholder="Escribe tu pregunta..."
        />
        <button
          type="submit"
          disabled={isSubmitting || !pregunta.trim()}
          className="w-full mt-4 py-3 bg-[#3483fa] hover:bg-blue-600 disabled:bg-blue-400 text-white font-semibold rounded-none transition-colors"
        >
          {isSubmitting ? "Enviando..." : "Preguntar"}
        </button>
      </form>
    </div>
  );
}
