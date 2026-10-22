import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PagosTable } from "./PagosTable";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Admin - Verificación de Pagos",
};

export default async function PagosAdminPage() {
  const supabase = await createClient();
  
  // 1. Verificación de Seguridad en la ruta (Doble check de rol)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona?.is_superadmin) {
    redirect("/"); // Kick out si no es admin
  }

  // 2. Fetching de solicitudes pendientes sin JOIN (por limitación de FK a auth.users)
  const { data: solicitudesRaw, error } = await supabase
    .from("solicitudes_pago")
    .select(`
      id,
      usuario_id,
      comprobante_url,
      emisor,
      referencia,
      fecha_pago,
      estado
    `)
    .eq("estado", "PENDIENTE")
    .order("fecha_pago", { ascending: true });

  if (error) {
    console.error("Error fetching solicitudes de pago:", error?.message || error?.details || JSON.stringify(error));
  }

  let solicitudes: any[] = solicitudesRaw || [];

  if (solicitudes.length > 0) {
    const userIds = solicitudes.map((s) => s.usuario_id);
    const { data: personasData, error: personasError } = await supabase
      .from("personas")
      .select("auth_user_id, nombres, apellidos, correo")
      .in("auth_user_id", userIds);

    if (personasError) {
      console.error("Error fetching personas:", personasError?.message || personasError?.details || JSON.stringify(personasError));
    } else if (personasData) {
      solicitudes = solicitudes.map((solicitud) => {
        const persona = personasData.find((p) => p.auth_user_id === solicitud.usuario_id);
        return {
          ...solicitud,
          personas: persona ? {
            nombres: persona.nombres,
            apellidos: persona.apellidos,
            correo: persona.correo
          } : null
        };
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Admin Básico (por si no hereda layout) */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-blue-500" />
          <h1 className="text-lg font-bold uppercase tracking-wider">Panel Admin - Verificación de Pagos</h1>
        </div>
        <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">
          Volver al sitio
        </Link>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8 border-l-4 border-blue-600 pl-4 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">Solicitudes Pendientes</h2>
          <p className="text-sm text-slate-500 mt-1">
            Revisa los comprobantes, aprueba los pagos para extender las membresías o rechaza pagos inválidos.
          </p>
        </div>

        <div className="bg-white p-1">
          <PagosTable solicitudes={(solicitudes as any) || []} />
        </div>
      </main>
    </div>
  );
}
