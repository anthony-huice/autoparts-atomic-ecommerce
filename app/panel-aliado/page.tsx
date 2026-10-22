import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  Car,
  Wrench,
  ArrowRight,
  AlertCircle,
  XCircle,
  CheckCircle,
  Info,
  Eye,
  MessageSquare,
  LayoutList,
  TrendingUp,
} from "lucide-react";

export default async function PanelInicio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasProfile = false;
  let estadoVerificacion: string | null = null;
  let isParticular = false;
  let fotoCedulaUrl: string | null = null;
  let empresaId: string | null = null;
  let personaId: string | null = null;
  let fechaExpiracionPlan: Date | null = null;
  let tienePlanActivo = false;

  if (user) {
    const { data: persona } = await supabase
      .from("personas")
      .select("id, estado_verificacion, foto_cedula_url, fecha_expiracion_plan")
      .eq("auth_user_id", user.id)
      .single();

    if (persona) {
      if (persona.fecha_expiracion_plan) {
        const exp = new Date(persona.fecha_expiracion_plan);
        if (exp > new Date()) {
          tienePlanActivo = true;
          fechaExpiracionPlan = exp;
        }
      }
      hasProfile = true;
      personaId = persona.id;
      fotoCedulaUrl = persona.foto_cedula_url;

      const { data: empleado } = await supabase
        .from("empleados_empresa")
        .select(`empresa_id, empresas ( estado_verificacion )`)
        .eq("persona_id", persona.id)
        .limit(1)
        .single();

      if (empleado?.empresas) {
        empresaId = empleado.empresa_id;
        const empresaData = Array.isArray(empleado.empresas)
          ? empleado.empresas[0]
          : empleado.empresas;
        estadoVerificacion = (empresaData as any)?.estado_verificacion || null;
      } else {
        isParticular = true;
        estadoVerificacion = persona.estado_verificacion || null;
        if (estadoVerificacion === null && fotoCedulaUrl) {
          estadoVerificacion = "PENDIENTE";
        }
      }
    }
  }

  const canPublish = estadoVerificacion === "APROBADO";

  // ── KPIs reales (solo si el usuario puede publicar) ──────────────────────
  let totalVistasVehiculos = 0;
  let totalVistasRepuestos = 0;
  let vehiculosActivos = 0;
  let repuestosActivos = 0;
  let preguntasSinResponder = 0;

  if (canPublish && user) {
    // ── Filtro de ownership: por auth_user o por empresa ──────────────────
    //    Usamos consultas separadas para vehiculos y repuestos porque
    //    el or() con columnas de distintos tipos en Supabase JS
    //    requiere construir el filtro en servidor.

    // Vehículos del usuario (propios o de su empresa)
    let vQuery = supabase
      .from("vehiculos")
      .select("estado, vistas")
      .is("deleted_at", null);

    if (empresaId) {
      vQuery = vQuery.eq("vendedor_empresa_id", empresaId);
    } else {
      vQuery = vQuery.eq("creado_por_auth_id", user.id);
    }

    const { data: vehiculosData } = await vQuery;

    if (vehiculosData) {
      vehiculosActivos = vehiculosData.filter((v) => v.estado === "ACTIVO").length;
      totalVistasVehiculos = vehiculosData.reduce(
        (sum, v) => sum + (v.vistas ?? 0),
        0
      );
    }

    // Repuestos del usuario (propios o de su empresa)
    let rQuery = supabase
      .from("repuestos")
      .select("estado, vistas")
      .is("deleted_at", null);

    if (empresaId) {
      rQuery = rQuery.eq("vendedor_empresa_id", empresaId);
    } else {
      rQuery = rQuery.eq("creado_por_auth_id", user.id);
    }

    const { data: repuestosData } = await rQuery;

    if (repuestosData) {
      repuestosActivos = repuestosData.filter((r) => r.estado === "ACTIVO").length;
      totalVistasRepuestos = repuestosData.reduce(
        (sum, r) => sum + (r.vistas ?? 0),
        0
      );
    }

    // Preguntas sin responder sobre los productos del usuario
    // Obtenemos IDs de vehículos activos del usuario
    let vIdsQuery = supabase
      .from("vehiculos")
      .select("id")
      .is("deleted_at", null);
    if (empresaId) {
      vIdsQuery = vIdsQuery.eq("vendedor_empresa_id", empresaId);
    } else {
      vIdsQuery = vIdsQuery.eq("creado_por_auth_id", user.id);
    }
    const { data: vIds } = await vIdsQuery;

    let rIdsQuery = supabase
      .from("repuestos")
      .select("id")
      .is("deleted_at", null);
    if (empresaId) {
      rIdsQuery = rIdsQuery.eq("vendedor_empresa_id", empresaId);
    } else {
      rIdsQuery = rIdsQuery.eq("creado_por_auth_id", user.id);
    }
    const { data: rIds } = await rIdsQuery;

    const vehiculoIds = (vIds ?? []).map((v) => v.id);
    const repuestoIds = (rIds ?? []).map((r) => r.id);

    if (vehiculoIds.length > 0 || repuestoIds.length > 0) {
      // Construimos el filtro OR manualmente
      const filters: string[] = [];
      if (vehiculoIds.length > 0)
        filters.push(`vehiculo_id.in.(${vehiculoIds.join(",")})`);
      if (repuestoIds.length > 0)
        filters.push(`repuesto_id.in.(${repuestoIds.join(",")})`);

      const { count } = await supabase
        .from("preguntas")
        .select("id", { count: "exact", head: true })
        .is("respuesta", null)
        .or(filters.join(","));

      preguntasSinResponder = count ?? 0;
    }
  }

  const totalVistas = totalVistasVehiculos + totalVistasRepuestos;
  const totalActivos = vehiculosActivos + repuestosActivos;

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="pb-6 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Centro de Mando</h1>
      </div>

      {!hasProfile ? (
        /* ESTADO 1: SIN PERFIL */
        <div className="bg-amber-50 rounded-none p-6 sm:p-8 max-w-3xl border border-amber-200/60">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900 mb-2">
                Paso obligatorio para empezar
              </h3>
              <p className="text-amber-800 text-sm leading-relaxed mb-6">
                Para mantener la seguridad de nuestra red de aliados, requerimos
                que completes tu información personal básica antes de poder
                publicar tu inventario.
              </p>
              <Link href="/panel-aliado/perfil">
                <Button className="rounded-none font-semibold bg-amber-600 hover:bg-amber-700 text-white h-10 px-6">
                  Completar Mi Perfil Ahora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ESTADO 2: PERFIL COMPLETADO */
        <div className="space-y-8">

          {/* ── BANNERS KYC & PLANES ─────────────────────────────────────────────── */}
          {tienePlanActivo && isParticular && fechaExpiracionPlan && (
            <div className="bg-blue-50 border border-blue-200 rounded-none p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-blue-900 uppercase tracking-wider text-sm">
                    Plan Destacado Activo
                  </h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Tienes 1 publicación con exposición prioritaria habilitada. Válido hasta el <strong>{fechaExpiracionPlan.toLocaleDateString('es-VE')}</strong>.
                  </p>
                </div>
              </div>
              <Link href="/panel-aliado/vehiculos/nuevo" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-none bg-blue-700 hover:bg-blue-800 text-white font-bold h-10 px-6 shrink-0">
                  Publicar ahora
                </Button>
              </Link>
            </div>
          )}

          {isParticular && estadoVerificacion === null && !fotoCedulaUrl && (
            <div className="bg-blue-50 border border-blue-200 rounded-none p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-blue-900">
                  Verificación de Identidad Requerida
                </h4>
                <p className="text-sm text-blue-800 mt-1 mb-3">
                  Para empezar a publicar vehículos o repuestos, debes subir una
                  fotografía de tu documento de identidad.
                </p>
                <Link href="/panel-aliado/perfil">
                  <Button className="rounded-none bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 px-3 text-xs">
                    Subir Cédula / Pasaporte
                  </Button>
                </Link>
              </div>
            </div>
          )}
          {estadoVerificacion === "PENDIENTE" && (
            <div className="bg-amber-50 border border-amber-200 rounded-none p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900">
                  Validación en Progreso
                </h4>
                <p className="text-sm text-amber-800 mt-1">
                  {isParticular
                    ? "Estamos validando tu documento de identidad (KYC)."
                    : "Estamos auditando tu información comercial (KYC)."}{" "}
                  Pronto podrás publicar inventario.
                </p>
              </div>
            </div>
          )}
          {estadoVerificacion === "RECHAZADO" && (
            <div className="bg-red-50 border border-red-200 rounded-none p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-red-900">Solicitud Rechazada</h4>
                <p className="text-sm text-red-800 mt-1">
                  {isParticular
                    ? "Hemos encontrado inconsistencias en tu documento de identidad."
                    : "Hemos encontrado inconsistencias en tus documentos legales."}{" "}
                  Por favor, revisa y actualiza tus datos.
                </p>
              </div>
            </div>
          )}


          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* KPI: Publicaciones Activas */}
            <Link
              href={canPublish ? "/panel-aliado/mis-publicaciones" : "#"}
              className={`group bg-white border border-gray-200 rounded-none flex flex-col justify-between p-6 transition-colors ${canPublish ? "hover:border-blue-400 cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">
                  Publicaciones Activas
                </span>
                <div className="w-9 h-9 bg-blue-50 flex items-center justify-center">
                  <LayoutList className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-bold text-slate-900 tabular-nums">
                  {canPublish ? totalActivos : "—"}
                </span>
                {canPublish && (
                  <p className="text-xs text-slate-400 mt-1">
                    {vehiculosActivos} veh. · {repuestosActivos} rep.
                  </p>
                )}
              </div>
            </Link>

            {/* KPI: Vistas Totales */}
            <Link
              href={canPublish ? "/panel-aliado/mis-publicaciones" : "#"}
              className={`group bg-white border border-gray-200 rounded-none flex flex-col justify-between p-6 transition-colors ${canPublish ? "hover:border-violet-400 cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">
                  Vistas Totales
                </span>
                <div className="w-9 h-9 bg-violet-50 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-bold text-slate-900 tabular-nums">
                  {canPublish ? totalVistas.toLocaleString("es-VE") : "—"}
                </span>
                {canPublish && (
                  <p className="text-xs text-slate-400 mt-1">
                    acumuladas en todos tus anuncios
                  </p>
                )}
              </div>
            </Link>

            {/* KPI: Preguntas Sin Responder */}
            <Link
              href={canPublish ? "/panel-aliado/buzon" : "#"}
              className={`group bg-white border border-gray-200 rounded-none flex flex-col justify-between p-6 transition-colors ${canPublish ? "hover:border-amber-400 cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">
                  Sin Responder
                </span>
                <div className={`w-9 h-9 flex items-center justify-center ${preguntasSinResponder > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                  <MessageSquare className={`w-4 h-4 ${preguntasSinResponder > 0 ? "text-amber-500" : "text-slate-400"}`} />
                </div>
              </div>
              <div>
                <span className={`text-3xl font-bold tabular-nums ${preguntasSinResponder > 0 ? "text-amber-600" : "text-slate-900"}`}>
                  {canPublish ? preguntasSinResponder : "—"}
                </span>
                {canPublish && (
                  <p className="text-xs text-slate-400 mt-1">
                    {preguntasSinResponder === 1 ? "pregunta pendiente" : "preguntas pendientes"}
                  </p>
                )}
              </div>
            </Link>
          </div>

          {/* ── Acciones Rápidas ─────────────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones Rápidas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Publicar Vehículo */}
              <Link
                href="/panel-aliado/vehiculos/nuevo"
                className={`group flex items-center bg-white border border-gray-200 p-6 transition-all ${
                  !canPublish
                    ? "pointer-events-none opacity-50 grayscale"
                    : "hover:border-blue-600 hover:shadow-sm"
                }`}
                tabIndex={!canPublish ? -1 : 0}
                aria-disabled={!canPublish}
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center mr-4 transition-colors ${
                    !canPublish
                      ? "bg-slate-200 text-slate-500"
                      : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600"
                  }`}
                >
                  <Car className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Publicar Vehículo
                  </h3>
                  <p className="text-sm text-gray-500">
                    Crea un nuevo anuncio para un auto, moto o camioneta.
                  </p>
                </div>
                <ArrowRight
                  className={`w-5 h-5 transition-colors ${
                    !canPublish
                      ? "text-transparent"
                      : "text-gray-400 group-hover:text-blue-600"
                  }`}
                />
              </Link>

              {/* Publicar Repuesto */}
              <Link
                href="/panel-aliado/repuestos/nuevo"
                className={`group flex items-center bg-white border border-gray-200 p-6 transition-all ${
                  !canPublish
                    ? "pointer-events-none opacity-50 grayscale"
                    : "hover:border-blue-600 hover:shadow-sm"
                }`}
                tabIndex={!canPublish ? -1 : 0}
                aria-disabled={!canPublish}
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center mr-4 transition-colors ${
                    !canPublish
                      ? "bg-slate-200 text-slate-500"
                      : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600"
                  }`}
                >
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Publicar Repuesto
                  </h3>
                  <p className="text-sm text-gray-500">
                    Añade piezas, accesorios o repuestos a tu catálogo.
                  </p>
                </div>
                <ArrowRight
                  className={`w-5 h-5 transition-colors ${
                    !canPublish
                      ? "text-transparent"
                      : "text-gray-400 group-hover:text-blue-600"
                  }`}
                />
              </Link>

              {/* Ver Mis Publicaciones */}
              <Link
                href="/panel-aliado/mis-publicaciones"
                className={`group flex items-center bg-white border border-gray-200 p-6 transition-all ${
                  !canPublish
                    ? "pointer-events-none opacity-50 grayscale"
                    : "hover:border-slate-600 hover:shadow-sm"
                }`}
                tabIndex={!canPublish ? -1 : 0}
                aria-disabled={!canPublish}
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center mr-4 transition-colors ${
                    !canPublish
                      ? "bg-slate-200 text-slate-500"
                      : "bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white"
                  }`}
                >
                  <LayoutList className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Gestionar Publicaciones
                  </h3>
                  <p className="text-sm text-gray-500">
                    Pausa, marca como vendido o elimina tus anuncios.
                  </p>
                </div>
                <ArrowRight
                  className={`w-5 h-5 transition-colors ${
                    !canPublish
                      ? "text-transparent"
                      : "text-gray-400 group-hover:text-slate-700"
                  }`}
                />
              </Link>

              {/* Buzón */}
              <Link
                href="/panel-aliado/buzon"
                className={`group flex items-center bg-white border border-gray-200 p-6 transition-all ${
                  !canPublish
                    ? "pointer-events-none opacity-50 grayscale"
                    : "hover:border-amber-500 hover:shadow-sm"
                }`}
                tabIndex={!canPublish ? -1 : 0}
                aria-disabled={!canPublish}
              >
                <div
                  className={`relative w-12 h-12 flex items-center justify-center mr-4 transition-colors ${
                    !canPublish
                      ? "bg-slate-200 text-slate-500"
                      : "bg-amber-50 text-amber-600 group-hover:bg-amber-100"
                  }`}
                >
                  <MessageSquare className="w-6 h-6" />
                  {preguntasSinResponder > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                      {preguntasSinResponder > 9 ? "9+" : preguntasSinResponder}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Buzón de Preguntas
                  </h3>
                  <p className="text-sm text-gray-500">
                    Responde consultas de compradores desde un solo lugar.
                  </p>
                </div>
                <ArrowRight
                  className={`w-5 h-5 transition-colors ${
                    !canPublish
                      ? "text-transparent"
                      : "text-gray-400 group-hover:text-amber-600"
                  }`}
                />
              </Link>
            </div>
          </div>

          {/* Banner registrar empresa (solo particulares) */}
          {isParticular && (
            <Link
              href="/panel-aliado/empresa/nueva"
              className="group flex items-center justify-between bg-slate-50 border border-slate-200 p-4 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 text-slate-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  ¿Eres un concesionario o taller? Desbloquea más funciones
                  registrando tu empresa.
                </p>
              </div>
              <div className="text-sm font-bold text-blue-600 flex items-center gap-1 group-hover:underline shrink-0">
                Registrar <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
