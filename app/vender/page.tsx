"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useUIStore } from "@/store/useUIStore";
import { PricingPlanes, TipoPlan } from "@/components/ui/PricingPlanes";
import { ArrowRight, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function VenderPage() {
  const router = useRouter();
  const { data: user, isLoading } = useSession();
  const { openAuthModal } = useUIStore();
  const [planSeleccionado, setPlanSeleccionado] = useState<TipoPlan>("BASICO");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activePlanDate, setActivePlanDate] = useState<Date | null>(null);
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkActivePlan() {
      if (!user) {
        setIsCheckingPlan(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("personas")
          .select("fecha_expiracion_plan")
          .eq("auth_user_id", user.id)
          .single();

        if (error) throw error;
        
        if (data?.fecha_expiracion_plan) {
          const expiracion = new Date(data.fecha_expiracion_plan);
          if (expiracion > new Date()) {
            setActivePlanDate(expiracion);
          }
        }
      } catch (error) {
        console.error("Error validando plan activo:", error);
      } finally {
        setIsCheckingPlan(false);
      }
    }
    
    if (!isLoading) {
      checkActivePlan();
    }
  }, [user, isLoading, supabase]);

  const handleContinuar = async () => {
    if (isLoading || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (!user) {
        openAuthModal("login");
      } else {
        if (planSeleccionado === "DESTACADO") {
          router.push(`/pagos?plan=DESTACADO`);
        } else {
          router.push(`/panel-aliado/vehiculos/nuevo?plan=BASICO`);
        }
      }
    } catch (error) {
      console.error("Error al continuar:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#ebebeb] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-start items-center">
      <div className="w-full max-w-5xl bg-white border border-gray-200 p-6 md:p-10 shadow-sm rounded-none">
        
        {/* Encabezado Principal de Conversión */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1e40af] bg-blue-50 px-3 py-1 border border-blue-200 rounded-none inline-block mb-3">
            Publicación en simples pasos
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Vende tu vehículo rápido y al mejor precio
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Elige el plan ideal para publicar tu carro en AutoParts Pro. Nuestro plan destacado te ayuda a vender hasta 3 veces más rápido gracias a su posición prioritaria.
          </p>
        </div>

        {isCheckingPlan ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#1e40af]" />
          </div>
        ) : activePlanDate ? (
          <div className="mb-4 animate-in fade-in duration-300">
            <div className="bg-blue-50 border border-blue-200 p-8 shadow-sm rounded-none text-center">
              <CheckCircle2 className="w-12 h-12 text-[#1e40af] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-2">¡Plan Activo!</h2>
              <p className="text-sm text-slate-700">
                Ya posees un plan activo válido hasta el <span className="font-bold">{activePlanDate.toLocaleDateString()}</span>. Tienes permitido publicar 1 vehículo.
              </p>
            </div>
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => router.push('/panel-aliado/vehiculos/nuevo?plan=DESTACADO')}
                className="w-full max-w-md mx-auto py-4 px-6 bg-[#1e40af] hover:bg-blue-900 text-white font-bold text-base transition-colors duration-150 flex items-center justify-center gap-2 rounded-none focus:outline-none shadow-md"
              >
                <span>Publicar Vehículo</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Componente PricingPlanes */}
            <div className="mb-4">
              <PricingPlanes
                planSeleccionado={planSeleccionado}
                onSeleccionar={(plan) => setPlanSeleccionado(plan)}
                porcentajeIva={16}
              />
            </div>

            {/* Zona Transaccional CTA */}
            <div className="border-t border-slate-200 pt-4 flex flex-col items-center">
              <div className="w-full max-w-md mx-auto text-center mb-2">
                <p className="text-xs text-slate-500 mb-2">
                  Plan seleccionado actualmente:{" "}
                  <span className="font-bold text-[#1e40af] uppercase">
                    {planSeleccionado}
                  </span>
                </p>
              </div>

              <button
                id="btn-continuar-publicacion"
                onClick={handleContinuar}
                disabled={isLoading || isSubmitting}
                className="w-full max-w-md mx-auto py-4 px-6 bg-[#1e40af] hover:bg-blue-900 text-white font-bold text-base transition-colors duration-150 flex items-center justify-center gap-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isLoading || isSubmitting ? (
                  <span>Cargando...</span>
                ) : (
                  <>
                    <span>Continuar con Plan {planSeleccionado === "BASICO" ? "Básico" : "Destacado"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#777]">
                <Lock className="w-3.5 h-3.5" />
                <span>Pago seguro y cifrado. Verificamos a los compradores para prevenir fraudes.</span>
              </div>

              {!user && !isLoading && (
                <p className="text-xs text-slate-500 mt-3 text-center">
                  * Se te solicitará iniciar sesión o crear una cuenta antes de llenar los datos del vehículo.
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
