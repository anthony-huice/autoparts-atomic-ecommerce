import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { type Repuesto } from "@/types/database";

const fetchRepuestos = async (pageParam: number, query: string): Promise<Repuesto[]> => {
  const supabase = createClient();
  const perPage = 16;
  const from = pageParam * perPage;
  const to = from + perPage - 1;

  let dbQuery = supabase
    .from("repuestos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) {
    dbQuery = dbQuery.or(`nombre_repuesto.ilike.%${query}%,marca_repuesto.ilike.%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(error.message);
  }

  return data as Repuesto[];
};

export const useRepuestos = (initialData: Repuesto[], query: string) => {
  return useInfiniteQuery({
    queryKey: ["repuestos", query],
    queryFn: ({ pageParam = 1 }) => fetchRepuestos(pageParam, query),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Si la última página trajo menos de 16 elementos, ya no hay más resultados.
      return lastPage.length === 16 ? allPages.length : undefined;
    },
    initialData: {
      pages: [initialData],
      pageParams: [0], // La página 0 fue la que cargó SSR (from 0 to 15)
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de stale time
  });
};
