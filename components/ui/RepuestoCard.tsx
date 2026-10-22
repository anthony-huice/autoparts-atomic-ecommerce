import Image from "next/image";
import Link from "next/link";
import { type Repuesto } from "@/types/database";
import { FavoriteButton } from "./FavoriteButton";
const formatUSD = (monto: string) => {
  const parsed = parseFloat(monto);
  if (isNaN(parsed)) return monto;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
};
export function RepuestoCard({ repuesto }: { repuesto: Repuesto }) {
  const imageUrl =
    repuesto.imagenes_url && repuesto.imagenes_url.length > 0
      ? repuesto.imagenes_url[0]
      : null;
  return (
    <Link
      href={`/repuestos/${repuesto.id}`}
      className="group flex flex-col bg-white border border-slate-200 overflow-hidden hover:border-gray-300 transition-colors duration-200"
    >
      {" "}
      {/* Contenedor de Imagen */}
      <div className="relative h-32 md:h-48 w-full bg-slate-50 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={repuesto.nombre_repuesto}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            {" "}
            <svg
              className="w-12 h-12 mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />{" "}
            </svg>{" "}
            <span className="text-sm font-medium">Sin imagen</span>{" "}
          </div>
        )}{" "}

      </div>{" "}
      {/* Contenido / Info */}{" "}
      <div className="flex flex-col flex-1 p-2 md:p-4">
        {" "}
        <div className="flex justify-between items-start gap-2 md:gap-4 mb-1">
          <h3 className="text-sm md:text-base font-bold text-slate-800 leading-snug line-clamp-2 capitalize">
            {repuesto.nombre_repuesto}
          </h3>
          <FavoriteButton itemId={repuesto.id} />
        </div>
        <div className="flex flex-wrap items-center text-[10px] md:text-xs text-slate-500 mb-2 md:mb-3 gap-1 md:gap-2">
          {repuesto.marca_repuesto && (
            <>
              <span>Marca: {repuesto.marca_repuesto}</span>
              <span className="w-1 h-1 rounded-none bg-slate-300 hidden md:block"></span>
            </>
          )}
          <span>{repuesto.es_nuevo ? "Nuevo" : "Usado"}</span>
        </div>
        <div className="mt-auto pt-2 md:pt-4 border-t border-slate-100 flex items-center justify-between">
          {" "}
          <span className="text-base md:text-2xl font-semibold text-slate-900 tracking-tight">
            {" "}
            {formatUSD(repuesto.precio)}{" "}
          </span>{" "}
        </div>{" "}
      </div>{" "}
    </Link>
  );
}
