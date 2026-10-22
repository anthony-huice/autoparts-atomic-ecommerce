import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, Store, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Directorio de Empresas | SuperAdmin",
};

export default async function AdminEmpresasPage() {
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

  // Fetch all companies
  const { data: empresas, error } = await supabase
    .from("empresas")
    .select(
      "id, tipo_empresa, razon_social, nombre_comercial, rif, correo, telefonos, created_at, deleted_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching empresas:", error);
  }

  // Fetch owners (Representantes Legales)
  const { data: owners } = await supabase
    .from("empleados_empresa")
    .select(`
      empresa_id,
      personas (
        id, nombre, apellido, email
      )
    `)
    .eq("es_representante_legal", true);

  // Group by owner
  const groupedData: Record<
    string,
    {
      persona: any;
      empresas: any[];
    }
  > = {};

  const empresaToOwner = new Map();
  if (owners) {
    owners.forEach((o: any) => {
      empresaToOwner.set(o.empresa_id, o.personas);
    });
  }

  if (empresas) {
    empresas.forEach((emp) => {
      const owner = empresaToOwner.get(emp.id) || {
        id: "unknown",
        nombre: "Sin",
        apellido: "Asignar",
        email: "N/A",
      };
      const ownerId = owner.id;

      if (!groupedData[ownerId]) {
        groupedData[ownerId] = {
          persona: owner,
          empresas: [],
        };
      }
      groupedData[ownerId].empresas.push(emp);
    });
  }

  const groupedArray = Object.values(groupedData);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Directorio de Empresas
        </h1>
        <p className="text-gray-500 mt-2">
          Listado de empresas agrupadas por su Representante Legal. Haz clic en
          una empresa para ver su detalle y opciones de control.
        </p>
      </div>

      <div className="space-y-8">
        {groupedArray.length > 0 ? (
          groupedArray.map((group) => (
            <div
              key={group.persona.id}
              className="bg-white border border-gray-200 rounded-none shadow-sm"
            >
              <div className="bg-slate-50 border-b border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 flex items-center justify-center rounded-none shrink-0">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {group.persona.nombre} {group.persona.apellido}
                  </h2>
                  <p className="text-sm text-gray-500">{group.persona.email}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-white border-b border-gray-100 text-gray-400 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">RIF</th>
                      <th className="px-6 py-4">Contacto</th>
                      <th className="px-6 py-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.empresas.map((empresa) => {
                      const isActive = empresa.deleted_at === null;
                      return (
                        <tr
                          key={empresa.id}
                          className="hover:bg-blue-50/50 transition-colors group/row cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/admin/empresas/${empresa.id}`}
                              className="block h-full w-full"
                            >
                              <div className="flex items-center gap-3">
                                <Store className="w-4 h-4 text-gray-400 group-hover/row:text-blue-500" />
                                <div>
                                  <div className="font-bold text-gray-900 group-hover/row:text-blue-600 transition-colors">
                                    {empresa.razon_social}
                                  </div>
                                  {empresa.nombre_comercial && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {empresa.nombre_comercial}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/admin/empresas/${empresa.id}`}
                              className="block h-full w-full"
                            >
                              <span
                                className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                                  empresa.tipo_empresa === "CONCESIONARIO"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-purple-50 text-purple-700 border-purple-200"
                                }`}
                              >
                                {empresa.tipo_empresa === "CONCESIONARIO"
                                  ? "Concesionario"
                                  : "Aliado Comercial"}
                              </span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">
                            <Link
                              href={`/admin/empresas/${empresa.id}`}
                              className="block h-full w-full"
                            >
                              {empresa.rif}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <Link
                              href={`/admin/empresas/${empresa.id}`}
                              className="block h-full w-full"
                            >
                              <div className="text-gray-900">
                                {empresa.correo}
                              </div>
                              <div className="text-gray-500 mt-1">
                                {empresa.telefonos &&
                                empresa.telefonos.length > 0
                                  ? empresa.telefonos[0]
                                  : ""}
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/admin/empresas/${empresa.id}`}
                              className="block h-full w-full"
                            >
                              <span
                                className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                                  isActive
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {isActive ? "Activa" : "Suspendida"}
                              </span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-none text-gray-500">
            No se encontraron empresas registradas.
          </div>
        )}
      </div>
    </div>
  );
}
