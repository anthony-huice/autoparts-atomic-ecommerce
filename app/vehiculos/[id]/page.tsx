import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getVehiculo } from "@/lib/queries/vehiculos";
import Image from "next/image";
import Link from "next/link";
import { type Vehiculo, type Empresa } from "@/types/database";
import { ContactBlock } from "@/components/ui/ContactBlock";
import { VehicleGallery } from "@/components/ui/VehicleGallery";
import { PreguntaForm } from "@/components/ui/PreguntaForm";
import { RespuestaForm } from "@/components/ui/RespuestaForm";
import { BotonVolver } from "@/components/ui/BotonVolver";
import { ViewTracker } from "@/components/ui/ViewTracker";
import { ShareButton } from "@/components/ui/ShareButton";
import { ChevronRight, CornerDownRight } from "lucide-react";

// Añadimos ISR (Incremental Static Regeneration). 
// 300 segundos (5 minutos) permite que Next.js devuelva la página desde su caché en memoria
// evitando golpear a la base de datos Supabase indiscriminadamente por cada visita,
// mientras se mantiene lo suficientemente fresca. La invalidación manual reescribe esto de inmediato.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await getVehiculo(id);
  if (!data) return { title: "Vehículo no encontrado | E-Commerce" };
  return {
    title: `${data.marca} ${data.modelo} ${data.anio} | E-Commerce Automotriz`,
    description: `Detalles completos del ${data.marca} ${data.modelo} del año ${data.anio}. Precio y contacto directo con el vendedor.`,
  };
}

const formatUSD = (monto: string) => {
  const parsed = parseFloat(monto);
  if (isNaN(parsed)) return monto;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("es-VE").format(num);
};

export default async function VehiculoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  
  const [
    vehiculoResult,
    sessionResult,
    preguntasResult
  ] = await Promise.all([
    getVehiculo(id),
    supabase.auth.getUser(),
    supabase
      .from("preguntas")
      .select("*")
      .eq("vehiculo_id", id)
      .order("created_at", { ascending: false })
  ]);
  
  const { data: vehiculoData, error } = vehiculoResult;
    
  if (error || !vehiculoData) {
    notFound();
  }
  
  const vehiculo = vehiculoData as Vehiculo;
  const { data: { user } } = sessionResult;
  const esDuenio = user?.id === vehiculo.creado_por_auth_id;
  
  let vendedorInfo = null;
  let nombreVendedor = "";
  let telefonosVendedor: string[] = [];
  let correoVendedor = "";
  
  if (vehiculo.vendedor_tipo === "PARTICULAR" && vehiculo.vendedor_persona_id) {
    const { data: particular } = await supabase
      .from("perfil_publico_vendedor")
      .select("*")
      .eq("id", vehiculo.vendedor_persona_id)
      .single();
    if (particular) {
      vendedorInfo = particular;
      nombreVendedor = `${particular.nombres} ${particular.apellidos}`;
      telefonosVendedor = particular.telefonos || [];
      correoVendedor = particular.correo || "";
    }
  } else if (
    vehiculo.vendedor_tipo === "EMPRESA" &&
    vehiculo.vendedor_empresa_id
  ) {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", vehiculo.vendedor_empresa_id)
      .single();
    if (empresa) {
      vendedorInfo = empresa;
      nombreVendedor =
        (empresa as Empresa).nombre_comercial ||
        (empresa as Empresa).razon_social;
      telefonosVendedor = (empresa as Empresa).telefonos || [];
      correoVendedor = (empresa as Empresa).correo || "";
    }
  }
  const imageUrls = vehiculo.imagenes_url || [];
  
  // Historial de preguntas ya obtenido en el Promise.all
  const preguntas = preguntasResult.data || [];
  
  return (
    <div className="min-h-screen bg-white">
      {/* ViewTracker invisible: registra la visita en el cliente, no en el servidor */}
      <ViewTracker tipo="vehiculo" itemId={vehiculo.id} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Volver al Catálogo */}
        <div className="mb-4">
          <BotonVolver rutaDefecto="/vehiculos" />
        </div>

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center text-sm font-normal text-slate-500">
          <Link href="/vehiculos" className="hover:text-blue-600 transition-colors">
            Vehículos
          </Link>
          <ChevronRight className="w-4 h-4 mx-1" />
          <span className="text-slate-900 capitalize">
            {vehiculo.marca} {vehiculo.modelo} {vehiculo.version ? vehiculo.version : ""}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Columna Izquierda (Aprox 70%) */}
          <div className="lg:col-span-8">
            
            {/* Galería Interactiva Estilo Orgánico */}
            <VehicleGallery images={imageUrls} marca={vehiculo.marca} modelo={`${vehiculo.modelo} ${vehiculo.version || ""}`.trim()} />

            <hr className="border-gray-200 my-8" />

            {/* Características principales (Fondo blanco natural, sin cajas) */}
            <div>
              <h2 className="text-2xl font-normal text-slate-900 mb-6">Características principales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Marca</span>
                  <span className="font-medium text-slate-900 capitalize">{vehiculo.marca || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Modelo</span>
                  <span className="font-medium text-slate-900 capitalize">{vehiculo.modelo || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Versión</span>
                  <span className="font-medium text-slate-900 capitalize">{vehiculo.version || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Año</span>
                  <span className="font-medium text-slate-900">{vehiculo.anio || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Color</span>
                  <span className="font-medium text-slate-900 capitalize">{vehiculo.color || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Motor</span>
                  <span className="font-medium text-slate-900 uppercase">{vehiculo.motor || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Tracción</span>
                  <span className="font-medium text-slate-900 uppercase">{vehiculo.traccion || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Transmisión</span>
                  <span className="font-medium text-slate-900 capitalize">{vehiculo.transmision ? vehiculo.transmision.toLowerCase() : "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Kilometraje</span>
                  <span className="font-medium text-slate-900">{vehiculo.kilometraje != null ? `${formatNumber(vehiculo.kilometraje)} km` : "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Tipo (Carrocería)</span>
                  <span className="font-medium text-slate-900 capitalize">{vehiculo.tipo_vehiculo ? vehiculo.tipo_vehiculo.toLowerCase() : "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Combustible</span>
                  <span className="font-medium text-slate-900 capitalize">{vehiculo.combustible ? vehiculo.combustible.toLowerCase() : "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Puertas</span>
                  <span className="font-medium text-slate-900">{vehiculo.cantidad_puertas ?? "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Ejes</span>
                  <span className="font-medium text-slate-900">{vehiculo.cantidad_ejes ?? "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Nº Dueños</span>
                  <span className="font-medium text-slate-900">{vehiculo.cantidad_duenos ?? "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Papeles al Día</span>
                  <span className="font-medium text-slate-900">{vehiculo.papeles_al_dia ? "Sí" : "No"}</span>
                </div>
              </div>
            </div>

            {vehiculo.observacion && (
              <>
                <hr className="border-gray-200 my-8" />
                <div>
                  <h2 className="text-2xl font-normal text-slate-900 mb-6">Descripción</h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">
                    {vehiculo.observacion}
                  </p>
                </div>
              </>
            )}

            {/* Historial de Preguntas y Respuestas */}
            <hr className="border-gray-200 my-8" />
            <div>
              <h2 className="text-2xl font-normal text-slate-900 mb-6">Últimas preguntas</h2>
              {preguntas.length === 0 ? (
                <p className="text-gray-500 italic mt-4">
                  Aún no hay preguntas. ¡Sé el primero en preguntar!
                </p>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {preguntas.map((pregunta) => (
                    <div key={pregunta.id}>
                      <p className="text-slate-900 text-base">{pregunta.texto}</p>
                      {pregunta.respuesta && !esDuenio && (
                        <div className="flex items-start gap-2 mt-2 ml-4 text-slate-500">
                          <CornerDownRight className="w-4 h-4 mt-1 shrink-0" />
                          <p>{pregunta.respuesta}</p>
                        </div>
                      )}
                      {esDuenio && (
                        <RespuestaForm preguntaId={pregunta.id} respuestaInicial={pregunta.respuesta} vehiculoId={id} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Columna Derecha (Aprox 30%, Cajas de Transacción e Interacción) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Caja Principal: Precio y Vendedor */}
            <div className="border border-gray-200 p-6 rounded-none bg-white">
              
              <div className="mb-2 text-sm text-slate-500">
                {vehiculo.anio} | {vehiculo.kilometraje != null ? `${formatNumber(vehiculo.kilometraje)} km` : "-"}
              </div>

              <div className="flex justify-between items-start gap-4 mb-4">
                <h1 className="text-2xl font-semibold text-slate-900 leading-tight capitalize flex items-center flex-wrap gap-3">
                  <span>{vehiculo.marca} {vehiculo.modelo} {vehiculo.version ? vehiculo.version : ""}</span>
                  {vehiculo.estado === "VENDIDO" && (
                    <span className="bg-red-600 text-white text-xs font-black tracking-widest uppercase px-2 py-1 rounded-none shadow-sm flex-shrink-0">
                      VENDIDO
                    </span>
                  )}
                </h1>
                <ShareButton 
                  title={`${vehiculo.marca} ${vehiculo.modelo} en AutoParts Pro`} 
                />
              </div>

              <div className="mb-6">
                <span className="text-4xl font-normal text-slate-900 tracking-tight block">
                  {formatUSD(vehiculo.precio)}
                </span>
                {vehiculo.negociable && (
                  <span className="text-emerald-600 text-sm font-medium mt-1 block">
                    Precio Negociable
                  </span>
                )}
              </div>

              {/* Componente ContactBlock importado */}
              {vendedorInfo ? (
                <div className={`mt-8 pt-6 border-t border-gray-200 ${vehiculo.estado === 'VENDIDO' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                  {vehiculo.estado === 'VENDIDO' && (
                    <div className="mb-4 text-sm font-bold text-red-600 uppercase tracking-wider">
                      Vehículo no disponible para contacto
                    </div>
                  )}
                  <h3 className="text-lg font-normal text-slate-900 mb-4">Información del vendedor</h3>
                  <ContactBlock 
                    vendorInfo={{
                      nombre: nombreVendedor,
                      tipo: vehiculo.vendedor_tipo,
                      telefonos: telefonosVendedor,
                      correo: correoVendedor,
                    }}
                  />
                  {vehiculo.ubicacion && (
                    <div className="mt-4 text-sm text-slate-500 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {vehiculo.ubicacion.ciudad}, {vehiculo.ubicacion.estado}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-slate-500 text-sm">Vendedor no disponible.</p>
                </div>
              )}
            </div>

            {/* Caja Interactiva: Preguntar al Vendedor (Client Component) */}
            <div className={vehiculo.estado === 'VENDIDO' ? 'opacity-50 pointer-events-none cursor-not-allowed grayscale' : ''}>
              <PreguntaForm vehiculoId={vehiculo.id} propietarioId={vehiculo.creado_por_auth_id} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
