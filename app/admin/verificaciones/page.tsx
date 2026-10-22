import { createClient } from "@/lib/supabase/server";
import { ModerationCard } from "@/components/admin/ModerationCard";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VerificacionesPage() {
  const supabase = await createClient();

  // Validar sesión del administrador
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/auth");
  }

  // 1. Obtener Personas pendientes
  const { data: personasData } = await supabase
    .from("personas")
    .select("id, nombres, apellidos, nacionalidad, cedula_pasaporte, created_at")
    .eq("estado_verificacion", "PENDIENTE")
    .order("created_at", { ascending: false });

  // 2. Obtener Empresas pendientes
  const { data: empresasData } = await supabase
    .from("empresas")
    .select("id, razon_social, nombre_comercial, rif, created_at")
    .eq("estado_verificacion", "PENDIENTE")
    .order("created_at", { ascending: false });

  // 3. Obtener vehículos pendientes con join a vendedor
  const { data: vehiculosData, error: errorV } = await supabase
    .from("vehiculos")
    .select("*, empresas(nombre_comercial, razon_social), personas!vehiculos_vendedor_persona_id_fkey(nombres, apellidos)")
    .eq("estado_verificacion", "PENDIENTE")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (errorV) console.error("Error cargando vehiculos (admin):", errorV);

  // 4. Obtener repuestos pendientes con join a vendedor
  const { data: repuestosData, error: errorR } = await supabase
    .from("repuestos")
    .select("*, empresas(nombre_comercial, razon_social), personas!repuestos_vendedor_persona_id_fkey(nombres, apellidos)")
    .eq("estado_verificacion", "PENDIENTE")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (errorR) console.error("Error cargando repuestos (admin):", errorR);

  // Mapear los datos para adaptarlos a ItemModeracion
  const vehiculos = (vehiculosData || []).map((v) => ({ ...v, tipo_item: "vehiculo" as const }));
  const repuestos = (repuestosData || []).map((r) => ({ ...r, tipo_item: "repuesto" as const }));

  const pendientesPublicaciones = [...vehiculos, ...repuestos];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
      <div className="mb-10 border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 uppercase">Panel de Moderación KYC</h1>
        <p className="text-gray-500 mt-2">
          Revisa y aprueba la identidad de los usuarios, la legalidad de las empresas y las publicaciones de inventario.
        </p>
      </div>

      {/* SECCIÓN 1: USUARIOS PARTICULARES */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
          1. Usuarios Particulares (KYC)
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-1 rounded-full">{personasData?.length || 0}</span>
        </h2>
        {!personasData || personasData.length === 0 ? (
          <div className="bg-gray-50 p-6 text-center border border-gray-200 text-gray-500 italic">No hay usuarios particulares pendientes.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personasData.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 p-5 flex flex-col justify-between shadow-sm">
                <div className="mb-4">
                  <p className="font-bold text-lg text-gray-900">{p.nombres} {p.apellidos}</p>
                  <p className="text-sm text-gray-600 font-mono mt-1">{p.nacionalidad}-{p.cedula_pasaporte}</p>
                </div>
                <Link href={`/admin/verificaciones/persona/${p.id}`} className="w-full text-center bg-[#1e40af] hover:bg-blue-900 text-white px-4 py-3 text-sm font-bold transition-colors">
                  Revisar Identidad
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: EMPRESAS */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
          2. Empresas / Concesionarios (KYC)
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-1 rounded-full">{empresasData?.length || 0}</span>
        </h2>
        {!empresasData || empresasData.length === 0 ? (
          <div className="bg-gray-50 p-6 text-center border border-gray-200 text-gray-500 italic">No hay empresas pendientes de verificación.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresasData.map((e) => (
              <div key={e.id} className="bg-white border border-gray-200 p-5 flex flex-col justify-between shadow-sm">
                <div className="mb-4">
                  <p className="font-bold text-lg text-gray-900 line-clamp-1">{e.nombre_comercial || e.razon_social}</p>
                  <p className="text-sm text-gray-600 font-mono mt-1">RIF: {e.rif}</p>
                </div>
                <Link href={`/admin/verificaciones/${e.id}`} className="w-full text-center bg-[#1e40af] hover:bg-blue-900 text-white px-4 py-3 text-sm font-bold transition-colors">
                  Revisar Documentos Legales
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: PUBLICACIONES DE INVENTARIO */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
          3. Publicaciones de Inventario
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-1 rounded-full">{pendientesPublicaciones.length}</span>
        </h2>
        {pendientesPublicaciones.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-700 uppercase">Todo al día</h3>
            <p className="text-gray-500 mt-2">No hay publicaciones de vehículos ni repuestos en cola.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendientesPublicaciones.map((item: any) => (
              <ModerationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
