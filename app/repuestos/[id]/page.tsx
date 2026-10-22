import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  type Repuesto,
  type Empresa,
  type CompatibilidadRepuesto,
} from "@/types/database";
import { ContactBlock } from "@/components/ui/ContactBlock";
import { PreguntaForm } from "@/components/ui/PreguntaForm";
import { RespuestaForm } from "@/components/ui/RespuestaForm";
import { BotonVolver } from "@/components/ui/BotonVolver";
import { RecruiterSandboxCheckout } from "@/components/ui/RecruiterSandboxCheckout";
import { CornerDownRight, ArrowLeft, ChevronRight } from "lucide-react";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const { data } = await supabase
    .from("repuestos")
    .select("nombre_repuesto, marca_repuesto, es_nuevo")
    .eq("id", id)
    .single();
  if (!data) return { title: "Repuesto no encontrado | E-Commerce" };
  const condicion = data.es_nuevo ? "Nuevo" : "Usado";
  const marcaStr = data.marca_repuesto ? ` - ${data.marca_repuesto}` : "";
  return {
    title: `${data.nombre_repuesto}${marcaStr} (${condicion}) | E-Commerce Automotriz`,
    description: `Encuentra ${data.nombre_repuesto}${marcaStr} en condición ${condicion.toLowerCase()}. Contacta al vendedor directamente para concretar la compra.`,
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
export default async function RepuestoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  /* Obtener repuesto */ const { data: repuestoData, error } = await supabase
    .from("repuestos")
    .select("*, categorias_repuestos(nombre)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error || !repuestoData) {
    notFound();
  }
  const repuesto = repuestoData as Repuesto & {
    categorias_repuestos: { nombre: string } | null;
  };
  const { data: { user } } = await supabase.auth.getUser();
  const esDuenio = user?.id === repuesto.creado_por_auth_id;
  /* Obtener compatibilidades */ const { data: compatData } = await supabase
    .from("compatibilidad_repuestos")
    .select("*")
    .eq("repuesto_id", id)
    .order("marca_vehiculo", { ascending: true });
  const compatibilidades = (compatData || []) as CompatibilidadRepuesto[];
  /* Obtener info del vendedor (Persona Pública o Empresa) */ let vendedorInfo =
    null;
  let nombreVendedor = "";
  let telefonosVendedor: string[] = [];
  let correoVendedor = "";
  if (repuesto.vendedor_tipo === "PARTICULAR" && repuesto.vendedor_persona_id) {
    const { data: particular } = await supabase
      .from("perfil_publico_vendedor")
      .select("*")
      .eq("id", repuesto.vendedor_persona_id)
      .single();
    if (particular) {
      vendedorInfo = particular;
      nombreVendedor = `${particular.nombres} ${particular.apellidos}`;
      telefonosVendedor = particular.telefonos || [];
      correoVendedor = particular.correo || "";
    }
  } else if (
    repuesto.vendedor_tipo === "EMPRESA" &&
    repuesto.vendedor_empresa_id
  ) {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", repuesto.vendedor_empresa_id)
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
  const imageUrls = repuesto.imagenes_url || [];

  // Obtener historial de preguntas
  const { data: preguntasData } = await supabase
    .from("preguntas")
    .select("*")
    .eq("repuesto_id", id)
    .order("created_at", { ascending: false });

  const preguntas = preguntasData || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {" "}
      {/* Volver al Catálogo */}
      <div className="mb-4">
        <BotonVolver rutaDefecto="/repuestos" />
      </div>

      {/* Breadcrumb */}
      <nav className="mb-8 text-sm font-medium text-slate-500">
        <Link
          href="/repuestos"
          className="hover:text-blue-600 transition-colors"
        >
          Repuestos
        </Link>
        {repuesto.categorias_repuestos && (
          <>
            <ChevronRight className="w-4 h-4 mx-1 inline-block align-middle" />
            <span className="align-middle">{repuesto.categorias_repuestos.nombre}</span>
          </>
        )}
        <ChevronRight className="w-4 h-4 mx-1 inline-block align-middle" />
        <span className="text-slate-900 align-middle">{repuesto.nombre_repuesto}</span>
      </nav>{" "}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {" "}
        {/* Columna Izquierda: Imágenes e Info Principal */}{" "}
        <div className="lg:col-span-2 space-y-8">
          {" "}
          {/* Galería */}{" "}
          <div className="bg-white p-2 border border-slate-200 rounded-none ">
            {" "}
            <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-none overflow-hidden bg-slate-50">
              {" "}
              {imageUrls.length > 0 ? (
                <Image
                  src={imageUrls[0]}
                  alt={repuesto.nombre_repuesto}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg=="
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  {" "}
                  <svg
                    className="w-16 h-16 mb-4 opacity-30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {" "}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />{" "}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />{" "}
                  </svg>{" "}
                  <span className="text-lg font-medium">
                    Sin imagen disponible
                  </span>{" "}
                </div>
              )}{" "}
            </div>{" "}
            {imageUrls.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto p-1 scrollbar-hide">
                {" "}
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-24 flex-shrink-0 rounded-none overflow-hidden cursor-pointer hover:opacity-80 transition border border-slate-200"
                  >
                    {" "}
                    <Image
                      src={url}
                      alt={`Imagen ${idx + 1}`}
                      fill
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg=="
                    />{" "}
                  </div>
                ))}{" "}
              </div>
            )}{" "}
          </div>{" "}
          {/* Detalles Generales y Compatibilidad */}{" "}
          <div className="bg-white p-8 border border-slate-200 rounded-none ">
            {" "}
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">
              {" "}
              Detalles del Repuesto{" "}
            </h2>{" "}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {" "}
              <div>
                {" "}
                <p className="text-sm text-slate-500 font-medium">
                  Marca del Repuesto
                </p>{" "}
                <p className="text-lg font-bold text-slate-900">
                  {repuesto.marca_repuesto || "No especificada"}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-sm text-slate-500 font-medium">
                  Nº de Parte
                </p>{" "}
                <p className="text-lg font-bold text-slate-900">
                  {repuesto.numero_parte || "No especificado"}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-sm text-slate-500 font-medium">
                  Condición
                </p>{" "}
                <p
                  className={`text-lg font-bold ${repuesto.es_nuevo ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {" "}
                  {repuesto.es_nuevo ? "Nuevo" : "Usado"}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            {repuesto.observacion && (
              <div className="mb-8 pt-6 border-t border-slate-100">
                {" "}
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Observaciones
                </h3>{" "}
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {repuesto.observacion}
                </p>{" "}
              </div>
            )}{" "}
            <div className="pt-6 border-t border-slate-100">
              {" "}
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Vehículos Compatibles
              </h3>{" "}
              {compatibilidades.length > 0 ? (
                <div className="overflow-x-auto rounded-none border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Marca
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Modelo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Desde
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Hasta
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {compatibilidades.map((compat, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                            {compat.marca_vehiculo}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {compat.modelo_vehiculo}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {compat.anio_desde}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {compat.anio_hasta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 italic bg-slate-50 p-4 rounded-none">
                  {" "}
                  Repuesto universal (no tiene compatibilidad específica
                  declarada).{" "}
                </p>
              )}{" "}
            </div>
            
            {/* Historial de Preguntas y Respuestas */}
            <hr className="border-gray-200 my-8" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Últimas preguntas</h2>
              {preguntas.length === 0 ? (
                <p className="text-slate-500 italic mt-4">
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
        </div>{" "}
        {/* Columna Derecha: Tarjeta de Compra y Vendedor */}{" "}
        <div className="space-y-6">
          {" "}
          <div className="bg-white p-8 border border-slate-200 rounded-none">
            {" "}
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-4 flex items-center flex-wrap gap-3">
              <span>{repuesto.nombre_repuesto}</span>
              {repuesto.estado === "VENDIDO" && (
                <span className="bg-red-600 text-white text-xs font-black tracking-widest uppercase px-2 py-1 rounded-none shadow-sm flex-shrink-0">
                  VENDIDO
                </span>
              )}
            </h1>{" "}
            <div className="flex items-end gap-3 mb-6">
              {" "}
              <span className="text-4xl font-black text-blue-600 tracking-tighter">
                {" "}
                {formatUSD(repuesto.precio)}{" "}
              </span>{" "}
              {repuesto.negociable && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-none mb-1 uppercase tracking-wide">
                  {" "}
                  Negociable{" "}
                </span>
              )}{" "}
            </div>{" "}
            <div className="mb-6">
              <RecruiterSandboxCheckout
                repuestoId={repuesto.id}
                nombreRepuesto={repuesto.nombre_repuesto}
                sku={repuesto.numero_parte}
                precioUsd={parseFloat(repuesto.precio) || 0}
                initialStock={typeof repuesto.stock === "number" ? repuesto.stock : 2}
              />
            </div>
            <hr className="border-slate-100 mb-6" /> {/* Contacto Vendedor */}{" "}
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              {" "}
              Información del Vendedor{" "}
            </h3>{" "}
            {vendedorInfo ? (
              <div className={repuesto.estado === 'VENDIDO' ? 'opacity-50 pointer-events-none grayscale' : ''}>
                {repuesto.estado === 'VENDIDO' && (
                  <div className="mb-4 text-sm font-bold text-red-600 uppercase tracking-wider">
                    Repuesto no disponible para contacto
                  </div>
                )}
                <ContactBlock
                  vendorInfo={{
                    nombre: nombreVendedor,
                    tipo: repuesto.vendedor_tipo,
                    telefonos: telefonosVendedor,
                    correo: correoVendedor,
                  }}
                />
              </div>
            ) : (
              <p className="text-slate-500 italic text-sm">
                Información de vendedor no disponible.
              </p>
            )}{" "}
          </div>{" "}

          {/* Caja Interactiva: Preguntar al Vendedor */}
          <div className={repuesto.estado === 'VENDIDO' ? 'opacity-50 pointer-events-none cursor-not-allowed grayscale' : ''}>
            <PreguntaForm repuestoId={repuesto.id} propietarioId={repuesto.creado_por_auth_id} />
          </div>

        </div>{" "}
      </div>{" "}
    </div>
    </div>
  );
}
