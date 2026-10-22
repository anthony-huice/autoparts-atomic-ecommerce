import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Shield, Home, CheckSquare, LogOut, Building2, Wallet } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Verificar si es superadmin
  const { data: persona } = await supabase
    .from("personas")
    .select("is_superadmin")
    .eq("auth_user_id", user.id)
    .single();

  if (!persona || persona.is_superadmin !== true) {
    // Expulsión inmediata
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col rounded-none shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          <span className="font-bold text-lg tracking-tight">SuperAdmin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-none transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium text-sm">Dashboard</span>
          </Link>
          
          <Link
            href="/admin/verificaciones"
            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-none transition-colors"
          >
            <CheckSquare className="w-5 h-5" />
            <span className="font-medium text-sm">Verificaciones KYC</span>
          </Link>
          
          <Link
            href="/admin/empresas"
            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-none transition-colors"
          >
            <Building2 className="w-5 h-5" />
            <span className="font-medium text-sm">Directorio de Empresas</span>
          </Link>
          
          <Link
            href="/admin/pagos"
            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-none transition-colors"
          >
            <Wallet className="w-5 h-5" />
            <span className="font-medium text-sm">Auditoría de Pagos</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-none transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Salir al Sitio</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
