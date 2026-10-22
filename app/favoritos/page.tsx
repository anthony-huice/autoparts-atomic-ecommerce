"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import { VehiculoCard } from "@/components/ui/VehiculoCard";
import { Vehiculo } from "@/types/database";
import { Loader2, Bookmark } from "lucide-react";
import Link from "next/link";
import { useFavoritos } from "@/hooks/useFavoritos";

export default function FavoritosPage() {
  const router = useRouter();
  const { data: user, isLoading: isSessionLoading } = useSession();
  const supabase = createClient();
  // Inicializa el hook para reaccionar a cambios de favorito (toggle optimista)
  const { favoritos } = useFavoritos();

  // Protección de ruta — único useEffect permitido (no es data-fetching)
  useEffect(() => {
    if (!isSessionLoading && !user) {
      router.push("/");
    }
  }, [user, isSessionLoading, router]);

  // ─── TanStack Query: data-fetching declarativo ────────────────────────────
  const { data: vehiculos = [], isLoading } = useQuery<Vehiculo[]>({
    queryKey: ["favoritos-vehiculos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favoritos")
        .select(`
          vehiculo_id,
          vehiculos (*)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching favoritos:", error);
        return [];
      }

      // Mapear la respuesta anidada a un array plano de Vehiculo[]
      return (data ?? [])
        .map((f) => f.vehiculos as unknown as Vehiculo)
        .filter((v): v is Vehiculo => v !== null);
    },
    enabled: !!user?.id,
  });

  // Filtrado local instantáneo: sincroniza con los IDs del hook de toggle
  const vehiculosMostrados = vehiculos.filter((v) => favoritos.includes(v.id));

  if (isSessionLoading || (isLoading && !!user)) {
    return (
      <main className="min-h-screen bg-[#ebebeb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e40af]" />
      </main>
    );
  }

  if (!user) return null; // Previene destello antes de la redirección

  return (
    <main className="min-h-screen bg-[#ebebeb] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-[#1e40af] fill-[#1e40af]" />
            Tus Vehículos Guardados
          </h1>
          <p className="text-slate-600 mt-2 text-sm max-w-2xl">
            Aquí encontrarás todos los vehículos que has marcado para revisar más tarde.
          </p>
        </div>

        {vehiculosMostrados.length === 0 ? (
          <div className="bg-white rounded-none p-12 text-center border border-slate-200">
            <Bookmark className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Aún no tienes vehículos guardados
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Explora nuestro catálogo y utiliza el ícono de marcador para guardar los vehículos que más te interesen.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-[#1e40af] text-white px-6 py-2.5 rounded-none font-medium hover:bg-blue-900 transition-colors"
            >
              Explorar Catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {vehiculosMostrados.map((vehiculo) => (
              <VehiculoCard key={vehiculo.id} vehiculo={vehiculo} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
