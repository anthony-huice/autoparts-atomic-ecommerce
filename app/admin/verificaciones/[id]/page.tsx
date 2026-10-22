import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, ArrowLeft, CheckCircle, XCircle, FileText, ExternalLink } from "lucide-react";

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !empresa) {
    notFound();
  }

  // Server Actions
  const aprobarEmpresa = async () => {
    "use server";
    const supabase = await createClient();
    await supabase
      .from("empresas")
      .update({ estado_verificacion: "APROBADO" })
      .eq("id", id);
    redirect("/admin/verificaciones");
  };

  const rechazarEmpresa = async () => {
    "use server";
    const supabase = await createClient();
    await supabase
      .from("empresas")
      .update({ estado_verificacion: "RECHAZADO" })
      .eq("id", id);
    redirect("/admin/verificaciones");
  };

  const docs = empresa.documentos_legales as any;

  // Función helper para procesar URLs antiguas o relativas y firmarlas temporalmente
  const getSignedDocUrl = async (url: string) => {
    if (!url) return url;
    let filePath = url;
    if (url.includes("/storage/v1/object/public/documentos_privados/")) {
      filePath = url.split("/storage/v1/object/public/documentos_privados/")[1];
    } else if (url.startsWith("http")) {
      const parts = url.split("documentos_privados/");
      if (parts.length > 1) filePath = parts[1];
    }
    
    // Solo intentamos firmar si parece pertenecer a documentos_privados
    // (si es una URL de otro bucket público, fallará la firma pero devolverá error silenciado)
    const { data: signedData } = await supabase.storage
      .from("documentos_privados")
      .createSignedUrl(filePath, 60);
      
    return signedData?.signedUrl || url;
  };

  let rifUrl = docs?.rif_url;
  if (rifUrl) {
    rifUrl = await getSignedDocUrl(rifUrl);
  }

  let anexosUrls = [];
  if (docs?.urls && Array.isArray(docs.urls)) {
    anexosUrls = await Promise.all(docs.urls.map((u: string) => getSignedDocUrl(u)));
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Link href="/admin/verificaciones" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Volver a la lista
      </Link>

      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{empresa.nombre_comercial || empresa.razon_social}</h1>
            <p className="text-slate-500 text-lg">RIF: <span className="font-mono text-slate-700 bg-slate-100 px-2">{empresa.rif}</span></p>
          </div>
        </div>
        <div>
          <span className="px-4 py-2 bg-amber-100 text-amber-800 font-bold tracking-widest text-sm">
            {empresa.estado_verificacion}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Información General */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">Datos Básicos</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Razón Social</p>
              <p className="text-slate-900">{empresa.razon_social}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Tipo</p>
              <p className="text-slate-900">{empresa.tipo_empresa.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Dirección Fiscal</p>
              <p className="text-slate-900">{empresa.direccion || "No especificada"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase">Teléfonos</p>
              <p className="text-slate-900">{empresa.telefonos?.join(" / ")}</p>
            </div>
          </div>
        </div>

        {/* Información Legal (Documentos JSON) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" /> Información de Registro
          </h2>
          <div className="bg-slate-50 border border-slate-200 p-6 space-y-4">
            {docs ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Registro</p>
                    <p className="text-slate-900 font-medium">{docs.nombre_registro || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Circunscripción</p>
                    <p className="text-slate-900 font-medium">{docs.circunscripcion || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Tomo</p>
                    <p className="text-slate-900 font-medium font-mono">{docs.tomo || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Folio</p>
                    <p className="text-slate-900 font-medium font-mono">{docs.folio || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Nº Expediente</p>
                    <p className="text-slate-900 font-medium font-mono">{docs.nro_expediente || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Fecha Registro</p>
                    <p className="text-slate-900 font-medium">{docs.fecha_registro || "N/A"}</p>
                  </div>
                </div>

                {/* Enlaces a Archivos */}
                <div className="pt-4 border-t border-slate-200 mt-4 space-y-3">
                  {rifUrl && (
                    <a href={rifUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white border border-slate-300 p-3 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-bold text-slate-700">Ver RIF Digitalizado</span>
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </a>
                  )}
                  {anexosUrls.length > 0 && anexosUrls.map((url: string, index: number) => (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white border border-slate-300 p-3 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-bold text-slate-700">Documento Anexo {index + 1}</span>
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-slate-500 italic text-sm">No se adjuntaron documentos legales detallados.</p>
            )}
          </div>
        </div>
      </div>

      {/* Acciones de Auditoría */}
      <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4">
        <form action={aprobarEmpresa} className="flex-1">
          <Button type="submit" className="w-full h-14 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-2">
            <CheckCircle className="w-6 h-6" /> APROBAR EMPRESA
          </Button>
        </form>
        <form action={rechazarEmpresa} className="flex-1">
          <Button type="submit" className="w-full h-14 rounded-none border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 text-lg font-bold flex items-center justify-center gap-2">
            <XCircle className="w-6 h-6" /> RECHAZAR SOLICITUD
          </Button>
        </form>
      </div>

    </div>
  );
}
