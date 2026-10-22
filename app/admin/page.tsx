import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertCircle, Building2, ChevronRight } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Contar empresas pendientes
  const { count: empresasPendientes } = await supabase
    .from("empresas")
    .select("*", { count: "exact", head: true })
    .eq("estado_verificacion", "PENDIENTE");

  // Contar particulares pendientes
  const { count: personasPendientes } = await supabase
    .from("personas")
    .select("*", { count: "exact", head: true })
    .eq("estado_verificacion", "PENDIENTE");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
        <p className="text-slate-500 mt-2">Visión general del estado operativo de la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Empresas Pendientes */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Empresas Pendientes</p>
              <h3 className="text-4xl font-bold text-slate-900 mt-2">{empresasPendientes || 0}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-none flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link 
              href="/admin/verificaciones"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
            >
              Ir a Auditoría
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Card Particulares Pendientes */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Particulares Pendientes</p>
              <h3 className="text-4xl font-bold text-slate-900 mt-2">{personasPendientes || 0}</h3>
            </div>
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-none flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link 
              href="/admin/verificaciones"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
            >
              Ir a Auditoría
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Card Empresas Activas (Placeholder) */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Empresas Activas</p>
              <h3 className="text-4xl font-bold text-slate-900 mt-2">--</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-none flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-400">Próximamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
