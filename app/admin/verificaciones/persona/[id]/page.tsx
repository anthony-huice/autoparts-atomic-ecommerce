import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, CheckCircle, XCircle, FileText, ExternalLink } from "lucide-react";

export default async function AuditPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: persona, error } = await supabase
    .from("personas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !persona) {
    notFound();
  }

  // Generar URL firmada temporal si es un path relativo o si es una URL antigua
  let signedCedulaUrl = persona.foto_cedula_url;
  if (signedCedulaUrl) {
    let filePath = signedCedulaUrl;
    
    // Si es una URL completa antigua, extraemos solo el path relativo
    if (signedCedulaUrl.includes("/storage/v1/object/public/documentos_privados/")) {
      filePath = signedCedulaUrl.split("/storage/v1/object/public/documentos_privados/")[1];
    } else if (signedCedulaUrl.startsWith("http")) {
      // Si es otro tipo de URL completa, intentamos extraer el path (ej: fallback genérico)
      const urlParts = signedCedulaUrl.split("documentos_privados/");
      if (urlParts.length > 1) {
        filePath = urlParts[1];
      }
    }

    const supabaseAdmin = createAdminClient();
    const { data: signedData, error: signedUrlError } = await supabaseAdmin.storage
      .from("documentos_privados")
      .createSignedUrl(filePath, 60 * 60); // 1 hora de validez
      
    if (signedUrlError) {
      console.error("Error al generar URL firmada para:", filePath, signedUrlError);
      signedCedulaUrl = "#error-al-cargar-imagen";
    } else if (signedData?.signedUrl) {
      signedCedulaUrl = signedData.signedUrl;
    } else {
      signedCedulaUrl = "#error-desconocido";
    }
  }

  // Server Actions
  const aprobarPersona = async () => {
    "use server";
    const supabase = await createClient();
    await supabase
      .from("personas")
      .update({ estado_verificacion: "APROBADO" })
      .eq("id", id);
    redirect("/admin/verificaciones");
  };

  const rechazarPersona = async () => {
    "use server";
    const supabase = await createClient();
    await supabase
      .from("personas")
      .update({ estado_verificacion: "RECHAZADO" })
      .eq("id", id);
    redirect("/admin/verificaciones");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Link href="/admin/verificaciones" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Volver a la lista
      </Link>

      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{persona.nombres} {persona.apellidos}</h1>
            <p className="text-slate-500 text-lg">
              Cédula / Pasaporte: <span className="font-mono text-slate-700 bg-slate-100 px-2">{persona.nacionalidad}-{persona.cedula_pasaporte}</span>
            </p>
          </div>
        </div>
        <div>
          <span className="px-4 py-2 bg-amber-100 text-amber-800 font-bold tracking-widest text-sm">
            {persona.estado_verificacion || "SIN FOTO"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Información General */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">Datos Básicos</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Nombres y Apellidos</p>
              <p className="text-slate-900">{persona.nombres} {persona.apellidos}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Documento de Identidad</p>
              <p className="text-slate-900 font-mono">{persona.nacionalidad}-{persona.cedula_pasaporte}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Correo Electrónico</p>
              <p className="text-slate-900">{persona.correo || "No especificado"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Teléfonos</p>
              <p className="text-slate-900">{persona.telefonos?.join(" / ")}</p>
            </div>
          </div>
        </div>

        {/* Información Legal (Foto) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" /> Documento Fotográfico
          </h2>
          <div className="bg-slate-50 border border-slate-200 p-6 space-y-4">
            {persona.foto_cedula_url ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">El usuario ha adjuntado un documento de identidad.</p>
                <a href={signedCedulaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white border border-slate-300 p-3 hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-700">Ver Fotografía del Documento</span>
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                </a>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 italic text-sm">El usuario aún no ha subido su documento de identidad.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones de Auditoría */}
      <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4">
        <form action={aprobarPersona} className="flex-1">
          <Button type="submit" className="w-full h-14 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-2">
            <CheckCircle className="w-6 h-6" /> APROBAR PERSONA
          </Button>
        </form>
        <form action={rechazarPersona} className="flex-1">
          <Button type="submit" className="w-full h-14 rounded-none bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-lg font-bold flex items-center justify-center gap-2">
            <XCircle className="w-6 h-6" /> RECHAZAR SOLICITUD
          </Button>
        </form>
      </div>

    </div>
  );
}
