import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Building2, Car, Wrench, ShieldAlert } from "lucide-react";
import { toggleSuspendCompany } from "./actions";
import DeletePublicationButton from "./DeletePublicationButton";

export const metadata = {
  title: "Detalle de Empresa | SuperAdmin",
};

export default async function AdminEmpresaDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona || persona.is_superadmin !== true) {
    redirect("/");
  }

  // Fetch empresa info
  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !empresa) {
    console.error("Error fetching empresa:", error);
    return (
      <div className="p-8 text-center text-gray-500">
        Empresa no encontrada.
      </div>
    );
  }

  // Fetch vehículos de la empresa
  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("id, marca, modelo, anio, precio, estado, created_at, deleted_at")
    .eq("vendedor_empresa_id", params.id)
    .order("created_at", { ascending: false });

  // Fetch repuestos de la empresa
  const { data: repuestos } = await supabase
    .from("repuestos")
    .select("id, nombre_repuesto, precio, estado, created_at, deleted_at")
    .eq("vendedor_empresa_id", params.id)
    .order("created_at", { ascending: false });

  const isSuspended = empresa.deleted_at !== null;
  const suspendAction = toggleSuspendCompany.bind(
    null,
    empresa.id,
    empresa.deleted_at
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Botón de volver */}
      <div>
        <Link
          href="/admin/empresas"
          className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Directorio
        </Link>
      </div>

      {/* Tarjeta principal de la empresa */}
      <div className="bg-white border border-gray-200 rounded-none shadow-sm p-6 relative overflow-hidden">
        {isSuspended && (
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        )}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-none shrink-0 border border-slate-200">
              <Building2 className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                {empresa.razon_social}
                {isSuspended && (
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-800 rounded-none border border-red-200">
                    SUSPENDIDA
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                {empresa.nombre_comercial && `${empresa.nombre_comercial} • `}
                RIF: {empresa.rif}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <form action={suspendAction}>
              <button
                type="submit"
                className={`inline-flex items-center px-6 py-3 text-sm font-bold tracking-widest uppercase rounded-none border transition-colors ${
                  isSuspended
                    ? "bg-white text-green-700 border-green-200 hover:bg-green-50"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
                }`}
              >
                {isSuspended && <ShieldAlert className="w-4 h-4 mr-2" />}
                {isSuspended ? "Reactivar Empresa" : "Suspender Empresa"}
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Correo Electrónico
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {empresa.correo}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Teléfonos
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {empresa.telefonos && empresa.telefonos.length > 0
                ? empresa.telefonos.join(" / ")
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Dirección
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {empresa.estado}, {empresa.ciudad}. {empresa.direccion}
            </p>
          </div>
        </div>
      </div>

      {/* Inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vehículos */}
        <div className="bg-white border border-gray-200 rounded-none shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <Car className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Vehículos Publicados
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {vehiculos && vehiculos.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {vehiculos.map((v) => (
                  <li key={v.id} className="hover:bg-slate-50 transition-colors flex items-stretch border-b border-gray-100 last:border-b-0">
                    <Link href={`/vehiculos/${v.id}`} target="_blank" className="p-4 flex-1 flex justify-between items-center w-full">
                      <div>
                        <p className="font-bold text-gray-900">
                          {v.marca} {v.modelo} {v.anio}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Estado: {v.estado}
                          {v.deleted_at && " (Eliminado)"}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        ${v.precio}
                      </div>
                    </Link>
                    {v.deleted_at === null && (
                      <div className="flex items-center p-4 border-l border-gray-100">
                        <DeletePublicationButton id={v.id} tipo="vehiculo" empresaId={params.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                No hay vehículos publicados.
              </div>
            )}
          </div>
        </div>

        {/* Repuestos */}
        <div className="bg-white border border-gray-200 rounded-none shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Repuestos Publicados
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {repuestos && repuestos.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {repuestos.map((r) => (
                  <li key={r.id} className="hover:bg-slate-50 transition-colors flex items-stretch border-b border-gray-100 last:border-b-0">
                    <Link href={`/repuestos/${r.id}`} target="_blank" className="p-4 flex-1 flex justify-between items-center w-full">
                      <div>
                        <p className="font-bold text-gray-900">
                          {r.nombre_repuesto}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Estado: {r.estado}
                          {r.deleted_at && " (Eliminado)"}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        ${r.precio}
                      </div>
                    </Link>
                    {r.deleted_at === null && (
                      <div className="flex items-center p-4 border-l border-gray-100">
                        <DeletePublicationButton id={r.id} tipo="repuesto" empresaId={params.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                No hay repuestos publicados.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
