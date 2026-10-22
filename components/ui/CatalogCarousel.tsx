"use client";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback } from "react";
import { Vehiculo } from "@/types/database";
import { VehiculoCard } from "@/components/ui/VehiculoCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CatalogCarousel({ items }: { items: Vehiculo[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: false, align: "start", skipSnaps: false, dragFree: false }
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!items || items.length === 0) return null;

  return (
    <div className="relative w-full group">
      <div className="overflow-hidden py-4" ref={emblaRef}>
        <div className="flex gap-4 sm:gap-6">
          {items.map((vehiculo) => (
            <div 
              key={vehiculo.id} 
              className="w-40 md:w-56 shrink-0"
            >
              <VehiculoCard vehiculo={vehiculo} />
            </div>
          ))}
        </div>
      </div>

      {/* Botones de Navegación Manual */}
      <button 
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white text-slate-800 rounded-none shadow-md border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 focus:opacity-100 -ml-4 sm:-ml-6 z-10"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white text-slate-800 rounded-none shadow-md border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 focus:opacity-100 -mr-4 sm:-mr-6 z-10"
        aria-label="Siguiente"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
