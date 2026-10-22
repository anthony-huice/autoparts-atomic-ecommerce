import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Publicar Vehículo - Elige tu Plan | AutoParts Pro",
  description: "Elige el plan de publicación que mejor se adapte a tus necesidades. Publica gratis por 15 días o destaca tu anuncio para vender más rápido.",
};

export default async function VenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    const { data: persona } = await supabase
      .from("personas")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();
      
    if (persona) {
      const { data: esEmpleado } = await supabase
        .from("empleados_empresa")
        .select("id")
        .eq("persona_id", persona.id)
        .limit(1);
        
      if (esEmpleado && esEmpleado.length > 0) {
        redirect("/panel-aliado/planes");
      }
    }
  }

  return <>{children}</>;
}
