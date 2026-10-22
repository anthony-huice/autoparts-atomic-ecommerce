"use client";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useRef } from "react";
import { Vehiculo } from "@/types/database";
import { VehiculoCard } from "@/components/ui/VehiculoCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HeroCarousel({ vehiculos }: { vehiculos: Vehiculo[] }) {
  // Embla docs recomienda fuertemente useRef para evitar reinstanciación en renders
  const plugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", skipSnaps: false },
    [plugin.current]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      plugin.current.reset(); // Reiniciar el timer en vez de matarlo
    }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      plugin.current.reset(); // Reiniciar el timer en vez de matarlo
    }
  }, [emblaApi]);

  if (!vehiculos || vehiculos.length === 0) return null;

  return (
    <div className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-12 my-10 group">
      <div className="overflow-hidden py-4" ref={emblaRef}>
        <div className="flex -ml-4 sm:-ml-6">
          {vehiculos.map((vehiculo, idx) => (
            <div 
              key={vehiculo.id} 
              className="flex-[0_0_50%] md:flex-[0_0_33.333333%] lg:flex-[0_0_25%] xl:flex-[0_0_20%] min-w-0 pl-4 sm:pl-6"
            >
              <VehiculoCard vehiculo={vehiculo} prefetchDetalle={idx < 3} />
            </div>
          ))}
        </div>
      </div>

      {/* Botones de Navegación */}
      <button 
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white text-slate-800 rounded-none shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 focus:opacity-100 -ml-2 sm:-ml-4 z-10"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white text-slate-800 rounded-none shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 focus:opacity-100 -mr-2 sm:-mr-4 z-10"
        aria-label="Siguiente"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
