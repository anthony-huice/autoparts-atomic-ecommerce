"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { PricingPlanesConcesionario, TipoPlanConcesionario } from "@/components/ui/PricingPlanesConcesionario";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function PlanesConcesionarioPage() {
  const router = useRouter();
  const supabase = createClient();
  const { data: user, isLoading: sessionLoading } = useSession();
  
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [planSeleccionado, setPlanSeleccionado] = useState<TipoPlanConcesionario>("DESTACADO");
  const [submitting, setSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Obtener la relación de la empresa del usuario
  useEffect(() => {
    async function loadEmpresa() {
      if (!user) {
        if (!sessionLoading) {
          router.push("/");
        }
        return;
      }

      try {
        // Obtener persona_id
        const { data: persona, error: personaError } = await supabase
          .from("personas")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (personaError || !persona) {
          toast.error("Debes completar tu perfil personal antes.");
          router.push("/panel-aliado/perfil");
          return;
        }

        // Obtener empresa vinculada
        const { data: empleado, error: empleadoError } = await supabase
          .from("empleados_empresa")
          .select("empresa_id")
          .eq("persona_id", persona.id)
          .single();

        if (empleadoError || !empleado) {
          toast.error("Debes registrar tu empresa primero.");
          router.push("/panel-aliado/empresa/nueva");
          return;
        }

        setEmpresaId(empleado.empresa_id);

        // Obtener suscripción actual si existe
        const { data: suscripcion } = await supabase
          .from("empresa_suscripciones")
          .select("tipo_plan")
          .eq("empresa_id", empleado.empresa_id)
          .single();

        if (suscripcion) {
          setPlanSeleccionado(suscripcion.tipo_plan as TipoPlanConcesionario);
          setIsUpdating(true);
        }
      } catch (error) {
        console.error("Error al cargar datos del plan:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!sessionLoading) {
      loadEmpresa();
    }
  }, [user, sessionLoading, supabase, router]);

  const handleConfirmar = async () => {
    if (!empresaId || submitting) return;

    setSubmitting(true);
    try {
      let fechaFin: string | null = null;
      let precio = 0.00;

      if (planSeleccionado === "DESTACADO") {
        const d = new Date();
        d.setDate(d.getDate() + 45);
        fechaFin = d.toISOString();
        precio = 20.00;
      } else if (planSeleccionado === "PREMIUM") {
        const d = new Date();
        d.setDate(d.getDate() + 60);
        fechaFin = d.toISOString();
        precio = 50.00;
      }

      // Upsert suscripción
      const { error } = await supabase
        .from("empresa_suscripciones")
        .upsert({
          empresa_id: empresaId,
          tipo_plan: planSeleccionado,
          fecha_fin: fechaFin,
          precio_pagado_usd: precio,
          updated_at: new Date().toISOString(),
        }, { onConflict: "empresa_id" });

      if (error) throw error;

      toast.success(isUpdating ? "Suscripción actualizada exitosamente" : "Plan seleccionado exitosamente");
      router.push("/panel-aliado");
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la suscripción");
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ebebeb]">
        <div className="text-center">
          <p className="text-slate-600 font-bold">Cargando planes de suscripción...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#ebebeb] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-start items-center">
      <div className="w-full max-w-6xl bg-white border border-gray-200 p-6 md:p-10 shadow-sm rounded-none">
        
        {/* Paso indicador del flujo Onboarding */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-8 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
          <span>Paso 1: Datos Personales</span>
          <span>&rarr;</span>
          <span>Paso 2: Datos de Empresa</span>
          <span>&rarr;</span>
          <span className="text-[#1e40af] font-black border-b-2 border-[#1e40af] pb-0.5">Paso 3: Selección de Plan</span>
        </div>

        {/* Componente PricingPlanesConcesionario */}
        <div className="mb-10">
          <PricingPlanesConcesionario
            planSeleccionado={planSeleccionado}
            onSeleccionar={(plan) => setPlanSeleccionado(plan)}
            porcentajeIva={16}
          />
        </div>

        {/* Zona CTA Principal */}
        <div className="border-t border-slate-200 pt-8 flex flex-col items-center">
          <div className="w-full max-w-md mx-auto text-center mb-6">
            <p className="text-xs text-slate-500 mb-2">
              Plan seleccionado:{" "}
              <span className="font-bold text-[#1e40af] uppercase">
                {planSeleccionado}
              </span>
            </p>
          </div>

          <button
            id="btn-confirmar-plan"
            onClick={handleConfirmar}
            disabled={submitting}
            className="w-full max-w-md mx-auto py-4 px-6 bg-[#1e40af] hover:bg-blue-900 text-white font-bold text-base transition-colors duration-150 flex items-center justify-center gap-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 shadow-md"
          >
            {submitting ? (
              <span>Procesando...</span>
            ) : (
              <>
                <span>Confirmar Plan {planSeleccionado === "DESTACADO" ? "Destacado" : "Premium"}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Zona de Confianza */}
        <div className="mt-12 border-t border-slate-100 pt-8 flex items-center justify-center gap-4 text-xs text-slate-500 max-w-xl mx-auto text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
          <p>
            Procesamiento seguro garantizado. Puedes cambiar de plan en cualquier momento sin penalizaciones.
          </p>
        </div>

      </div>
    </main>
  );
}
