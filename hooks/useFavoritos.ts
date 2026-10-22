"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

export function useFavoritos() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: user } = useSession();

  // Fetch all favorites for the logged-in user
  const { data: favoritos = [], isLoading } = useQuery({
    queryKey: ["favoritos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("favoritos")
        .select("vehiculo_id")
        .eq("user_id", user.id);
        
      if (error) {
        console.error("Error fetching favoritos:", error.message || error);
        return [];
      }
      
      return data.map(f => f.vehiculo_id);
    },
    enabled: !!user?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async (vehiculoId: string) => {
      if (!user?.id) throw new Error("Debes iniciar sesión para guardar favoritos");
      
      const isFav = favoritos.includes(vehiculoId);
      
      if (isFav) {
        // Delete
        const { error } = await supabase
          .from("favoritos")
          .delete()
          .match({ user_id: user.id, vehiculo_id: vehiculoId });
          
        if (error) throw error;
        return { vehiculoId, action: "removed" };
      } else {
        // Insert
        const { error } = await supabase
          .from("favoritos")
          .insert({ user_id: user.id, vehiculo_id: vehiculoId });
          
        if (error) throw error;
        return { vehiculoId, action: "added" };
      }
    },
    onMutate: async (vehiculoId) => {
      // Cancelar cualquier fetch saliente de favoritos
      await queryClient.cancelQueries({ queryKey: ["favoritos", user?.id] });
      
      // Obtener el estado previo
      const previousFavorites = queryClient.getQueryData<string[]>(["favoritos", user?.id]) || [];
      
      // Actualizar optimísticamente
      const isFav = previousFavorites.includes(vehiculoId);
      queryClient.setQueryData<string[]>(["favoritos", user?.id], (old = []) => {
        if (isFav) {
          return old.filter(id => id !== vehiculoId);
        } else {
          return [...old, vehiculoId];
        }
      });
      
      // Retornar el contexto con el estado previo para poder revertir si hay error
      return { previousFavorites };
    },
    onError: (err, vehiculoId, context) => {
      // Revertir si hay error
      if (context?.previousFavorites) {
        queryClient.setQueryData(["favoritos", user?.id], context.previousFavorites);
      }
      toast.error("No se pudo actualizar el guardado. Verifica si el ítem es válido.");
    },
    onSettled: () => {
      // Sincronizar con el servidor en caso de dudas
      queryClient.invalidateQueries({ queryKey: ["favoritos", user?.id] });
    }
  });

  const isFavorite = (vehiculoId: string) => favoritos.includes(vehiculoId);
  const toggleFavorite = (vehiculoId: string) => toggleMutation.mutate(vehiculoId);

  return {
    favoritos,
    isFavorite,
    toggleFavorite,
    isLoading
  };
}
