import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PerfilForm } from '@/components/forms/PerfilForm';
import { PerfilView } from '@/components/views/PerfilView';

export default async function PerfilPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Verificar si el usuario ya tiene su perfil completo
  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (persona) {
    // Si ya existe el perfil, renderizamos la vista de solo lectura
    return <PerfilView persona={persona} />;
  }

  // Si no existe, renderizamos el formulario para completarlo
  return <PerfilForm />;
}
