import Image from "next/image";
import Link from "next/link";
import { type Vehiculo } from "@/types/database";
import { FavoriteButton } from "./FavoriteButton";
import { Icons } from "@/components/ui/Icons";

/** Formatea moneda en USD */
const formatUSD = (monto: string) => {
  const parsed = parseFloat(monto);
  if (isNaN(parsed)) return monto;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
};

/** Formatea números (ej. kilometraje) */
const formatNumber = (num: number) => new Intl.NumberFormat("es-VE").format(num);

/**
 * Determina si un vehículo marcado como VENDIDO aún está dentro del
 * período de visualización del lazo (7 días desde fecha_venta).
 */
function estaEnPeriodoRibbon(fechaVenta: string | null): boolean {
  if (!fechaVenta) return false;
  const venta = new Date(fechaVenta).getTime();
  const ahora = Date.now();
  const siete_dias_ms = 7 * 24 * 60 * 60 * 1000;
  return ahora - venta <= siete_dias_ms;
}

export function VehiculoCard({ vehiculo, prefetchDetalle }: { vehiculo: Vehiculo; prefetchDetalle?: boolean }) {
  const imageUrl =
    vehiculo.imagenes_url && vehiculo.imagenes_url.length > 0
      ? vehiculo.imagenes_url[0]
      : null;

  // El Ribbon solo aparece si estado = VENDIDO y dentro de los 7 días
  const mostrarRibbon =
    vehiculo.estado === "VENDIDO" && estaEnPeriodoRibbon(vehiculo.fecha_venta ?? null);

  const ubicacion = vehiculo.ubicacion as { estado?: string; ciudad?: string } | null;

  return (
    <Link
      href={`/vehiculos/${vehiculo.id}`}
      prefetch={prefetchDetalle ? true : undefined}
      className="group flex flex-col bg-white border border-slate-200 overflow-hidden hover:border-gray-300 transition-colors duration-200"
    >
      {/* Contenedor de Imagen */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${vehiculo.marca} ${vehiculo.modelo}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <svg
              className="w-12 h-12 mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium">Sin imagen</span>
          </div>
        )}

        {/* ── Ribbon "VENDIDO" ─────────────────────────────────────────────
            Criterios de diseño (F-Pattern / Gancho Visual):
            - Posición: esquina superior derecha → zona de alta atención.
            - Color: rojo sólido (#dc2626) → contraste máximo sobre imagen.
            - Texto: VENDIDO en mayúsculas + tracking wide → legibilidad inmediata.
            - Geometría: 100% cuadrado (sin rounded-*) → coherencia corporativa.
            - z-index: 10 → siempre visible sobre la imagen.
        ───────────────────────────────────────────────────────────────── */}
        {mostrarRibbon && (
          <div
            className="absolute top-0 right-0 z-10 bg-red-600 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1.5 shadow-md"
            aria-label="Este vehículo ha sido vendido"
          >
            VENDIDO
          </div>
        )}
      </div>

      {/* Contenido / Info */}
      <div className="flex flex-col flex-1 p-2 md:p-3">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2 capitalize">
            {vehiculo.marca} {vehiculo.modelo}
          </h3>
          <FavoriteButton itemId={vehiculo.id} />
        </div>

        {/* Ficha técnica minimalista */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] font-medium text-slate-500">
          <span>{vehiculo.anio}</span>
          <span className="text-slate-300">•</span>
          <span>{formatNumber(vehiculo.kilometraje)} km</span>
          <span className="text-slate-300">•</span>
          <span className="capitalize">{vehiculo.combustible.toLowerCase()}</span>
          <span className="text-slate-300">•</span>
          <span className="capitalize">{vehiculo.transmision.toLowerCase()}</span>
        </div>

        <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-0.5">
          <span className="text-lg font-normal text-slate-900 tracking-tight">
            {formatUSD(vehiculo.precio)}
          </span>
          {ubicacion && ubicacion.estado && (
            <span className="text-[11px] text-slate-400 capitalize truncate">
              {ubicacion.ciudad ? `${ubicacion.ciudad}, ` : ""}{ubicacion.estado}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
