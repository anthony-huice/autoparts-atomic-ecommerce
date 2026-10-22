import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function VehiculosNuevoLayout({
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

  let canPublish = false;

  const { data: persona } = await supabase
    .from("personas")
    .select("id, estado_verificacion, foto_cedula_url")
    .eq("auth_user_id", user.id)
    .single();

  if (persona) {
    let estadoVerificacion = null;
    
    const { data: empleado } = await supabase
      .from("empleados_empresa")
      .select(`
        empresa_id,
        empresas (
          estado_verificacion
        )
      `)
      .eq("persona_id", persona.id)
      .limit(1)
      .single();
      
    if (empleado?.empresas) {
      const empresaData = Array.isArray(empleado.empresas) 
        ? empleado.empresas[0] 
        : empleado.empresas;
      estadoVerificacion = (empresaData as any)?.estado_verificacion || null;
    } else {
      estadoVerificacion = persona.estado_verificacion || null;
      if (estadoVerificacion === null && persona.foto_cedula_url) {
        estadoVerificacion = 'PENDIENTE';
      }
    }
    
    canPublish = estadoVerificacion === 'APROBADO';
  }

  if (!canPublish) {
    redirect("/panel-aliado");
  }

  return <>{children}</>;
}
