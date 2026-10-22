"use client";

import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { RepuestoCard } from "./RepuestoCard";
import { useRepuestos } from "@/hooks/useRepuestos";
import { type Repuesto } from "@/types/database";

interface RepuestosGridProps {
  initialData: Repuesto[];
  query: string;
}
export function RepuestosGrid({ initialData, query }: RepuestosGridProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useRepuestos(initialData, query);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const repuestos = useMemo(
    () => data?.pages.flatMap((page) => page) || [],
    [data],
  );

  if (status === "success" && repuestos.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <img src="/busquedaVacia.png" alt="Búsqueda vacía" className="w-64 h-auto mx-auto mb-6 object-contain" />
        <h3 className="text-2xl font-bold text-slate-900 mb-4">
          No encontramos resultados para tu búsqueda
        </h3>
        <ul className="text-slate-600 text-left list-disc list-inside space-y-1 text-sm md:text-base">
          <li>Revisa la ortografía.</li>
          <li>Usa términos más generales.</li>
          <li>Navega por <a href="/" className="text-blue-600 hover:underline">categorías</a> para encontrar un repuesto similar.</li>
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {repuestos.map((repuesto) => (
          <RepuestoCard key={repuesto.id} repuesto={repuesto} />
        ))}
      </div>
      <div ref={ref} className="mt-8 flex justify-center p-4">
        {isFetchingNextPage && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-none animate-spin"></div>
            <span className="text-slate-500 text-sm font-medium">
              Cargando repuestos...
            </span>
          </div>
        )}
      </div>
    </>
  );
}
