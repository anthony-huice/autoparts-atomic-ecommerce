import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VehiculoCard } from "@/components/ui/VehiculoCard";
import { RepuestoCard } from "@/components/ui/RepuestoCard";
import { HeroCarousel } from "@/components/ui/HeroCarousel";
import { CatalogCarousel } from "@/components/ui/CatalogCarousel";
import { Icons } from "@/components/ui/Icons";
import {
  Vehiculo,
  Repuesto,
} from "@/types/database"; /* Tipos aumentados para repuestos (unimos el nombre de la categoría) */
type RepuestoWithCategoria = Repuesto & {
  categorias_repuestos?: { nombre: string } | null;
};
type PromiseDataType = Promise<[any, any]>;

async function HeroCarouselWrapper({ dataPromise }: { dataPromise: PromiseDataType }) {
  const [vehiculosRes] = await dataPromise;
  const vehiculos = (vehiculosRes.data || []) as Vehiculo[];
  return <HeroCarousel vehiculos={vehiculos} />;
}

async function VehiculosDestacadosWrapper({ dataPromise }: { dataPromise: PromiseDataType }) {
  const [vehiculosRes] = await dataPromise;
  const vehiculos = (vehiculosRes.data || []) as Vehiculo[];
  return (
    <div className="bg-white border border-gray-200 rounded-none p-4 md:p-8 w-full">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Recién Llegados
          </h2>
          <p className="text-slate-500">
            Los vehículos más recientes publicados en la plataforma.
          </p>
        </div>
        <Link
          href="/vehiculos"
          className="hidden sm:flex items-center gap-2 text-[#1e40af] font-bold hover:text-blue-900 transition-colors"
        >
          Ver catálogo completo <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {vehiculos.length > 0 ? (
        <CatalogCarousel items={vehiculos} />
      ) : (
        <div className="text-center py-12 bg-[#ebebeb] rounded-none border border-slate-200">
          <p className="text-slate-500">
            Aún no hay vehículos publicados.
          </p>
        </div>
      )}

      <div className="mt-8 sm:hidden">
        <Link
          href="/vehiculos"
          className="w-full flex items-center justify-center py-3 bg-slate-100 text-slate-900 font-bold rounded-none hover:bg-slate-200 transition-colors"
        >
          Ver catálogo completo
        </Link>
      </div>
    </div>
  );
}

async function RepuestosDestacadosWrapper({ dataPromise }: { dataPromise: PromiseDataType }) {
  const [, repuestosRes] = await dataPromise;
  const repuestos = (repuestosRes.data || []) as RepuestoWithCategoria[];
  return (
    <div className="bg-white border border-gray-200 rounded-none p-4 md:p-8 w-full">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Repuestos y Accesorios
          </h2>
          <p className="text-slate-500">
            Piezas originales y de reemplazo para tu vehículo.
          </p>
        </div>
        <Link
          href="/repuestos"
          className="hidden sm:flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
        >
          Ver todos los repuestos <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {repuestos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6">
          {repuestos.map((repuesto) => (
            <RepuestoCard key={repuesto.id} repuesto={repuesto} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[#ebebeb] rounded-none border border-slate-200">
          <p className="text-slate-500">
            Aún no hay repuestos publicados.
          </p>
        </div>
      )}

      <div className="mt-8 sm:hidden">
        <Link
          href="/repuestos"
          className="w-full flex items-center justify-center py-3 bg-emerald-50 text-emerald-700 font-bold rounded-none hover:bg-emerald-100 transition-colors"
        >
          Ver todos los repuestos
        </Link>
      </div>
    </div>
  );
}

export default async function Home() {
  const supabase = await createClient();

  // Disparamos las consultas en paralelo SIN bloquear el renderizado inicial del Hero usando await al nivel superior
  const dataPromise = Promise.all([
    supabase.from("vehiculos").select("*").eq("estado_verificacion", "APROBADO").is("deleted_at", null).order("created_at", { ascending: false }).limit(15),
    supabase.from("repuestos").select("*, categorias_repuestos(nombre)").eq("estado_verificacion", "APROBADO").is("deleted_at", null).order("created_at", { ascending: false }).limit(4)
  ]);

  return (
    <main className="flex flex-col min-h-screen bg-[#ebebeb]">
      {" "}
      {/* ----------------- HERO SECTION ----------------- */}
      <section className="relative min-h-[70vh] md:min-h-[85vh] pt-32 md:pt-40 pb-0 overflow-visible bg-[#1e40af] flex flex-col justify-start items-center">
        {/* Imagen de Fondo (Hero Banner) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/hero-banner.webp"
            alt="Fondo Hero AutoParts Pro"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[75%_center] md:object-center"
          />
          {/* Overlay oscuro para mejorar legibilidad */}
          <div className="absolute inset-0 bg-slate-900/60" />
          {/* Degradado de transición hacia la siguiente sección */}
          <div className="absolute inset-x-0 bottom-0 h-32 md:h-48 bg-gradient-to-t from-[#ebebeb] via-[#ebebeb]/60 to-transparent" />
        </div>

        {/* Bloque 1: Textos */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center w-full">
          <h1 className="text-3xl leading-tight md:text-5xl md:leading-tight font-black text-white tracking-tight mb-4 max-w-4xl">
            {" "}
            Encuentra tu próximo vehículo con total seguridad
          </h1>{" "}
          <p className="text-sm md:text-base text-slate-300 max-w-2xl mb-8">
            {" "}
            Explora miles de opciones verificadas de concesionarios y vendedores
            particulares. Compra rápido y seguro.
          </p>{" "}
        </div>

        {/* Bloque 3: Categorías Rápidas */}
        <div className="relative z-10 mt-8 w-full max-w-4xl px-4 sm:px-0 flex flex-col items-center">
          <h2 className="text-white/80 font-medium text-lg mb-4">
            ¿Qué estás buscando hoy?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
            <Link
              href="/vehiculos?categoria=Autos"
              className="flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold px-8 h-12 rounded-none shadow-lg text-center"
            >
              <img src="/carro.png" alt="Autos" className="w-7 h-7 mr-2 object-contain scale-125 translate-y-0.5" />
              Autos
            </Link>
            <Link
              href="/vehiculos?categoria=Motos"
              className="flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold px-8 h-12 rounded-none shadow-lg text-center"
            >
              <img src="/moto.png" alt="Motos" className="w-7 h-7 mr-2 object-contain translate-y-0.5" />
              Motos
            </Link>
            <Link
              href="/vehiculos?categoria=Camionetas"
              className="flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold px-8 h-12 rounded-none shadow-lg text-center"
            >
              <img src="/camioneta.png" alt="Camionetas" className="w-7 h-7 mr-2 object-contain scale-[1.2] translate-y-0.5" />
              Camionetas
            </Link>
            <Link
              href="/repuestos"
              className="flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold px-8 h-12 rounded-none shadow-lg text-center"
            >
              <img src="/tuercas.png" alt="Repuestos" className="w-7 h-7 mr-2 object-contain" />
              Repuestos
            </Link>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="relative z-10 grid grid-cols-3 gap-2 md:gap-16 mt-10 md:mt-12 w-full max-w-2xl px-4 sm:px-0">
          <div className="flex flex-col items-center gap-2">
            <Icons.Garantia className="w-6 h-6 md:w-10 h-10 text-white drop-shadow-md" />
            <span className="text-white text-xs md:text-sm font-semibold drop-shadow-md text-center">Verificados</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icons.Trato className="w-6 h-6 md:w-10 md:h-10 text-white drop-shadow-md" />
            <span className="text-white text-xs md:text-sm font-semibold drop-shadow-md text-center">Compra Directa</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icons.Documento className="w-6 h-6 md:w-10 md:h-10 text-white drop-shadow-md" />
            <span className="text-white text-xs md:text-sm font-semibold drop-shadow-md text-center">Trámites Seguros</span>
          </div>
        </div>
      </section>

      {/* Bloque 4: Carrusel Multitarjeta (Efecto Overlap Real) */}
      <div className="relative z-20 -mt-24 md:-mt-[18rem] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="h-[300px] w-full bg-slate-800/50 animate-pulse border border-slate-700" />}>
          <HeroCarouselWrapper dataPromise={dataPromise} />
        </Suspense>
      </div>

      {/* ----------------- ÚLTIMOS VEHÍCULOS ----------------- */}
      <section className="pt-12 md:pt-20 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Suspense fallback={<div className="h-[400px] w-full bg-slate-300 animate-pulse border border-slate-200" />}>
          <VehiculosDestacadosWrapper dataPromise={dataPromise} />
        </Suspense>
      </section>
      {/* ----------------- REPUESTOS DESTACADOS ----------------- */}
      <section className="pt-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Suspense fallback={<div className="h-[400px] w-full bg-slate-300 animate-pulse border border-slate-200" />}>
          <RepuestosDestacadosWrapper dataPromise={dataPromise} />
        </Suspense>
      </section>
      {/* ----------------- CALL TO ACTION (VENDE TU AUTO) ----------------- */}{" "}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {" "}
        <div className="relative rounded-none overflow-hidden bg-slate-900 px-6 py-16 sm:p-20 text-center flex flex-col items-center ">
          {" "}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e40af]/20 to-emerald-600/20" />{" "}
          <h2 className="relative text-3xl sm:text-5xl font-black text-white tracking-tight mb-6 max-w-2xl">
            {" "}
            ¿Quieres vender tu vehículo o repuestos?{" "}
          </h2>{" "}
          <p className="relative text-lg text-slate-300 max-w-xl mb-10">
            {" "}
            Únete como Vendedor Particular o Concesionario (Aliado Comercial) y
            accede a nuestro avanzado panel de gestión de inventario. Totalmente
            gratis.{" "}
          </p>{" "}
          <div className="relative flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {" "}
            <Link
              href="/registro"
              className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-none transition-colors "
            >
              {" "}
              Crear Cuenta de Vendedor{" "}
            </Link>{" "}
            <Link
              href="/login"
              className="px-8 py-4 bg-slate-800 text-white hover:bg-slate-700 font-bold border border-slate-700 rounded-none transition-colors"
            >
              {" "}
              Ya tengo cuenta{" "}
            </Link>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
    </main>
  );
}
