"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { PlanPricingCards } from "@/components/panel/PlanPricingCards";
import { toast } from "sonner";

export default function MiPlanPage() {
  const supabase = createClient();
  const { data: user, isLoading: sessionLoading } = useSession();
  
  const [empresas, setEmpresas] = useState<{id: string, nombre: string, tipo: string}[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [planActual, setPlanActual] = useState<string>("BASICO");
  const [vehiculosPublicados, setVehiculosPublicados] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlanInfo = useCallback(async (selectedEmpresaId: string) => {
    try {
      setLoading(true);
      // Obtener plan actual
      const { data: suscripcion } = await supabase
        .from("empresa_suscripciones")
        .select("tipo_plan")
        .eq("empresa_id", selectedEmpresaId)
        .single();

      if (suscripcion && suscripcion.tipo_plan) {
        setPlanActual(suscripcion.tipo_plan);
      } else {
        setPlanActual("BASICO");
      }

      // Obtener vehículos publicados por esta empresa
      const { count } = await supabase
        .from("vehiculos")
        .select("*", { count: 'exact', head: true })
        .eq("vendedor_empresa_id", selectedEmpresaId)
        .is("deleted_at", null)
        .neq("estado", "VENDIDO"); // asumiendo que los vendidos no cuentan, o si cuentan, quita esto.

      setVehiculosPublicados(count || 0);
    } catch (error) {
      console.error("Error cargando datos de suscripción:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // Obtener persona_id
        const { data: persona } = await supabase
          .from("personas")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (!persona) {
          setLoading(false);
          return;
        }

        // Obtener empresas vinculadas
        const { data: empleados } = await supabase
          .from("empleados_empresa")
          .select("empresa_id, empresas(razon_social, nombre_comercial, tipo_empresa)")
          .eq("persona_id", persona.id);

        if (!empleados || empleados.length === 0) {
          setLoading(false);
          return;
        }

        const empresasMap = empleados.map((e: any) => {
          const empData = Array.isArray(e.empresas) ? e.empresas[0] : e.empresas;
          return {
            id: e.empresa_id,
            nombre: empData?.nombre_comercial || empData?.razon_social || "Empresa",
            tipo: empData?.tipo_empresa || "CONCESIONARIO"
          };
        });

        setEmpresas(empresasMap);
        setEmpresaId(empresasMap[0].id);
      } catch (error) {
        console.error("Error inicializando:", error);
        setLoading(false);
      }
    }

    if (!sessionLoading) {
      loadData();
    }
  }, [user, sessionLoading, supabase]);

  useEffect(() => {
    if (empresaId) {
      fetchPlanInfo(empresaId);
    }
  }, [empresaId, fetchPlanInfo]);

  const handleUpgrade = async (nuevoPlan: string) => {
    if (!empresaId) return;
    
    setSubmitting(true);
    // TODO: Redirigir a pasarela de pago (MercadoPago / Stripe) o abrir modal.
    // Por ahora, lo simulamos directo para testear UI.
    toast.info("Redirigiendo a pasarela de pago...");
    
    setTimeout(async () => {
      try {
        const d = new Date();
        const dias = nuevoPlan === "PREMIUM" ? 60 : (nuevoPlan === "DESTACADO" ? 45 : 30);
        d.setDate(d.getDate() + dias);
        const precio = nuevoPlan === "PREMIUM" ? 50.00 : (nuevoPlan === "DESTACADO" ? 20.00 : 0);

        const { error } = await supabase
          .from("empresa_suscripciones")
          .upsert({
            empresa_id: empresaId,
            tipo_plan: nuevoPlan,
            fecha_fin: d.toISOString(),
            precio_pagado_usd: precio,
            updated_at: new Date().toISOString(),
          }, { onConflict: "empresa_id" });

        if (error) throw error;
        
        toast.success("¡Felicidades! Has mejorado tu plan a " + nuevoPlan);
        setPlanActual(nuevoPlan);
      } catch (e: any) {
        toast.error("Error al mejorar el plan: " + e.message);
      } finally {
        setSubmitting(false);
      }
    }, 1500);
  };

  const empresaActual = empresas.find(e => e.id === empresaId);
  const isAliado = empresaActual?.tipo === "ALIADO_COMERCIAL";
  const tipoEmpresa = empresaActual?.tipo || "CONCESIONARIO";

  const maxPublicaciones = isAliado
    ? (planActual === "BRONCE" ? 20 : planActual === "PLATA" ? 50 : planActual === "ORO" ? 999999 : 5)
    : (planActual === "PREMIUM" ? 30 : planActual === "DESTACADO" ? 10 : 5);
  
  const maxDisplay = maxPublicaciones === 999999 ? "Ilimitado" : maxPublicaciones;
  const porcentajeUso = maxPublicaciones === 999999 ? 0 : Math.min((vehiculosPublicados / maxPublicaciones) * 100, 100);
  
  // Lógica de color de barra: rojo si está lleno, azul normal.
  const colorBarra = porcentajeUso >= 100 ? "bg-red-600" : porcentajeUso >= 80 ? "bg-yellow-500" : "bg-blue-600";

  if (loading && !empresaId) {
    return <div className="p-8 text-gray-500">Cargando datos de facturación...</div>;
  }

  if (!empresaId && !loading) {
    return (
      <div className="p-8 text-red-600 border border-red-200 bg-red-50">
        Debes registrar una empresa para acceder a los planes.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mi Suscripción</h1>
          <p className="text-gray-500 mt-2 text-lg">Gestiona tu plan actual y supervisa los límites de tu cuenta.</p>
        </div>
        {empresas.length > 1 && (
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Empresa</label>
            <select
              value={empresaId || ""}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="w-full border-gray-300 rounded-none shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.tipo === 'ALIADO_COMERCIAL' ? 'Repuestos' : 'Vehículos'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tarjeta de Consumo (Progressive Disclosure) */}
      <div className="bg-white border border-gray-200 p-6 mb-12 rounded-none shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">
              Plan Actual <span className="ml-2 text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 border border-gray-200">{isAliado ? 'ALIADO COMERCIAL' : 'CONCESIONARIO'}</span>
            </h2>
            <span className="text-2xl font-bold text-gray-900 mt-2 block">{planActual || 'BÁSICO'}</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Estado</span>
            <div className="text-gray-900 font-medium uppercase">Activo</div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Publicaciones activas</span>
            <span>{vehiculosPublicados} de {maxDisplay} publicaciones</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-none">
            <div className={`h-2 rounded-none ${colorBarra} transition-all duration-500`} style={{ width: `${porcentajeUso}%` }}></div>
          </div>
          {vehiculosPublicados >= maxPublicaciones && (
            <p className="text-sm text-red-600 font-bold mt-3">
              Has alcanzado el límite de tu plan actual. Por favor, mejora tu plan para continuar publicando.
            </p>
          )}
        </div>
      </div>

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mejora tu alcance y ventas</h2>
        <p className="text-gray-600">Pasa al siguiente nivel y obtén herramientas exclusivas para potenciar tu {isAliado ? 'tienda de repuestos' : 'concesionario'}.</p>
      </div>

      {/* Pricing Cards */}
      <PlanPricingCards 
        planActual={planActual}
        tipoEmpresa={tipoEmpresa} 
        onUpgrade={handleUpgrade}
        isSubmitting={submitting}
      />
    </div>
  );
}
