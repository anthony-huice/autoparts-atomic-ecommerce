import Link from "next/link";
import { LayoutList, MessageSquare, Lock, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let hasProfile = false;
  let canPublish = false;
  let isParticular = true;

  if (user) {
    const { data: persona } = await supabase
      .from("personas")
      .select("id, estado_verificacion, foto_cedula_url")
      .eq("auth_user_id", user.id)
      .single();
      
    if (persona) {
      hasProfile = true;
      let estadoVerificacion = null;
      
      const { data: empleado } = await supabase
        .from("empleados_empresa")
        .select(`
          empresa_id,
          empresas (
            estado_verificacion
          )
        `)
        .eq("persona_id", persona.id)
        .limit(1)
        .single();
        
        if (empleado?.empresas) {
        isParticular = false;
        const empresaData = Array.isArray(empleado.empresas) 
          ? empleado.empresas[0] 
          : empleado.empresas;
        estadoVerificacion = (empresaData as any)?.estado_verificacion || null;
      } else {
        estadoVerificacion = persona.estado_verificacion || null;
        if (estadoVerificacion === null && persona.foto_cedula_url) {
          estadoVerificacion = 'PENDIENTE';
        }
      }
      
      canPublish = estadoVerificacion === 'APROBADO';
    }
  }
  const linkDisabledClass =
    "pointer-events-none opacity-50 cursor-not-allowed select-none block px-4 py-2 text-sm font-medium text-gray-700 rounded-none";
  const linkEnabledClass =
    "block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-none transition-colors flex items-center gap-2";
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-10 relative">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-gray-900">
          <span className="text-xl font-bold text-white tracking-tight">
            Panel Aliado
          </span>
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto">

          {/* ── Principal ─────────────────────────────────────── */}
          <div className="pb-4 mb-4 border-b border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Principal
            </p>
            <Link href="/panel-aliado" className={linkEnabledClass}>
              Inicio
            </Link>
            <Link href="/panel-aliado/perfil" className={linkEnabledClass}>
              Mi Perfil
            </Link>
          </div>

          {/* ── Negocio ───────────────────────────────────────── */}
          <div className="pb-4 mb-4 border-b border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Negocio
            </p>
            <Link
              href={hasProfile ? "/panel-aliado/empresa/nueva" : "#"}
              className={hasProfile ? linkEnabledClass : linkDisabledClass}
              tabIndex={hasProfile ? 0 : -1}
            >
              Registrar Empresa
            </Link>
          </div>

          {/* ── Publicar ──────────────────────────────────────── */}
          <div className="pb-4 mb-4 border-b border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Publicar
            </p>
            <Link
              href={canPublish ? "/panel-aliado/vehiculos/nuevo" : "#"}
              className={canPublish ? linkEnabledClass : linkDisabledClass}
              tabIndex={canPublish ? 0 : -1}
              aria-disabled={!canPublish}
            >
              Vehículos
            </Link>
            {isParticular ? (
              <div
                className="opacity-50 pointer-events-none cursor-not-allowed select-none flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 rounded-none"
                aria-disabled="true"
              >
                Repuestos <Lock className="w-3.5 h-3.5 text-gray-400" />
              </div>
            ) : (
              <Link
                href={canPublish ? "/panel-aliado/repuestos/nuevo" : "#"}
                className={canPublish ? linkEnabledClass : linkDisabledClass}
                tabIndex={canPublish ? 0 : -1}
                aria-disabled={!canPublish}
              >
                Repuestos
              </Link>
            )}
          </div>

          {/* ── Gestión ───────────────────────────────────────── */}
          <div className="pb-4 mb-4 border-b border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Gestión
            </p>
            <Link
              href={canPublish ? "/panel-aliado/mis-publicaciones" : "#"}
              className={canPublish ? linkEnabledClass : linkDisabledClass}
              tabIndex={canPublish ? 0 : -1}
              aria-disabled={!canPublish}
            >
              <LayoutList className="w-4 h-4" />
              Mis Publicaciones
            </Link>
            <Link
              href={hasProfile && !isParticular ? "/panel-aliado/mi-plan" : "#"}
              className={hasProfile && !isParticular ? linkEnabledClass : linkDisabledClass}
              tabIndex={hasProfile && !isParticular ? 0 : -1}
              aria-disabled={!hasProfile || isParticular}
            >
              <CreditCard className="w-4 h-4" />
              Mi Plan / Facturación
            </Link>
          </div>

          {/* ── Comunicaciones ────────────────────────────────── */}
          <div>
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Comunicaciones
            </p>
            <Link
              href={canPublish ? "/panel-aliado/buzon" : "#"}
              className={canPublish ? linkEnabledClass : linkDisabledClass}
              tabIndex={canPublish ? 0 : -1}
              aria-disabled={!canPublish}
            >
              <MessageSquare className="w-4 h-4" />
              Buzón
            </Link>
          </div>

        </nav>
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center gap-2 justify-center w-full px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors rounded-none"
          >
            Volver a la Tienda
          </Link>
        </div>
      </aside>
      {/* Main content area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:px-12 bg-gray-50/50">
          {children}
        </div>
      </main>
    </div>
  );
}
