import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface NotificacionItem {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leido: boolean;
  metadata: any;
  created_at: string;
}

export interface NavbarData {
  nombreReal: string | null;
  esEmpresa: boolean;
  notificaciones: NotificacionItem[];
  tienePlanActivo: boolean;
  fechaExpiracion: string | null;
}

export function useNavbarData(userId?: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data, isLoading } = useQuery<NavbarData | null>({
    queryKey: ['navbarData', userId],
    queryFn: async () => {
      if (!userId) return null;

      const fetchPersona = async () => {
        const { data: persona } = await supabase.from("personas").select("id, nombres, fecha_expiracion_plan").eq("auth_user_id", userId).single();
        let esEmpresa = false;
        let nombreReal = null;
        let tienePlanActivo = false;
        let fechaExpiracion = null;
        if (persona) {
          if (persona.nombres) nombreReal = persona.nombres;
          if (persona.fecha_expiracion_plan) {
            tienePlanActivo = new Date(persona.fecha_expiracion_plan) > new Date();
            fechaExpiracion = persona.fecha_expiracion_plan;
          }
          const { data: empleadoData } = await supabase.from("empleados_empresa").select("id").eq("persona_id", persona.id).limit(1);
          if (empleadoData && empleadoData.length > 0) esEmpresa = true;
        }
        return { nombreReal, esEmpresa, tienePlanActivo, fechaExpiracion };
      };

      const fetchNotifs = async () => {
        const { data } = await supabase
          .from("notificaciones")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        return (data || []) as NotificacionItem[];
      };

      // Paralelizamos las consultas con Promise.all
      const [personaData, notifs] = await Promise.all([
        fetchPersona(),
        fetchNotifs()
      ]);

      return {
        nombreReal: personaData.nombreReal,
        esEmpresa: personaData.esEmpresa,
        notificaciones: notifs,
        tienePlanActivo: personaData.tienePlanActivo,
        fechaExpiracion: personaData.fechaExpiracion
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Suscripción Realtime para notificaciones
  useEffect(() => {
    if (!userId) return;
    // Generamos un ID único por montaje para evitar errores de re-suscripción en React Strict Mode
    const channelId = `notifs_${userId}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.setQueryData<NavbarData | null>(['navbarData', userId], (old) => {
            if (!old) return old;
            return {
              ...old,
              notificaciones: [payload.new as NotificacionItem, ...old.notificaciones]
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, queryClient]);

  // Actualización optimista de estado leído
  const marcarLeida = async (id: string) => {
    queryClient.setQueryData<NavbarData | null>(['navbarData', userId], (old) => {
      if (!old) return old;
      return {
        ...old,
        notificaciones: old.notificaciones.map(n => n.id === id ? { ...n, leido: true } : n)
      };
    });
    await supabase.from("notificaciones").update({ leido: true }).eq("id", id);
  };

  return {
    data: data || { nombreReal: null, esEmpresa: false, notificaciones: [], tienePlanActivo: false, fechaExpiracion: null },
    isLoading,
    marcarLeida
  };
}
