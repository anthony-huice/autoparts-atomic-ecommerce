import { createClient } from "@/lib/supabase/server";
import { VehiculoCard } from "@/components/ui/VehiculoCard";
import { VehiculosFiltros } from "@/components/ui/VehiculosFiltros";
import Link from "next/link";
import { type Vehiculo } from "@/types/database";

export const metadata = {
  title: "Catálogo de Vehículos | E-Commerce Automotriz",
  description: "Encuentra los mejores vehículos nuevos y usados del mercado.",
};

// ─── Tipos de searchParams soportados ────────────────────────────────────────
interface FiltrosParams {
  page?: string;
  query?: string;
  tipo?: string;
  categoria?: string;
  marca?: string;
  min_precio?: string;
  max_precio?: string;
  min_anio?: string;
  max_anio?: string;
}

export default async function VehiculosPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // ── Paginación ─────────────────────────────────────────────────────────────
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const perPage = 12;
  const from = (currentPage - 1) * perPage;
  const to = from + perPage - 1;

  // ── Parámetros de filtro ───────────────────────────────────────────────────
  const query = params.query?.trim() ?? "";
  const tipo = params.tipo?.trim().toUpperCase() ?? "";
  const categoria = params.categoria?.trim().toUpperCase() ?? "";
  const marca = params.marca?.trim().toUpperCase() ?? "";
  const minPrecio = parseFloat(params.min_precio ?? "0");
  const maxPrecio = parseFloat(params.max_precio ?? "150000");
  const minAnio = parseInt(params.min_anio ?? "1990", 10);
  const maxAnio = parseInt(params.max_anio ?? String(new Date().getFullYear()), 10);

  // ── Fecha de corte para el Ribbon VENDIDO (7 días) ──────────────────────
  // Vehículos VENDIDO con fecha_venta dentro de los últimos 7 días aún
  // aparecen en el catálogo con el Ribbon rojo. Pasados 7 días, se ocultan.
  const fechaCorte7Dias = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // ── Consulta SSR a Supabase con filtros ────────────────────────────────────
  let dbQuery = supabase
    .from("vehiculos")
    .select("*", { count: "exact" })
    .eq("estado_verificacion", "APROBADO")
    .is("deleted_at", null)
    // Excluir PAUSADO completamente.
    // Incluir ACTIVO siempre. Incluir VENDIDO solo si está dentro de los 7 días.
    .or(`estado.eq.ACTIVO,and(estado.eq.VENDIDO,fecha_venta.gte.${fechaCorte7Dias})`)
    .order("created_at", { ascending: false })
    .range(from, to);

  // Búsqueda textual por marca o modelo (barra de búsqueda general)
  if (query) {
    dbQuery = dbQuery.or(`marca.ilike.%${query}%,modelo.ilike.%${query}%`);
  }

  // Filtro: Categoría rápida desde el Home (agrupa varios tipos)
  if (categoria === "AUTOS") {
    dbQuery = dbQuery.in("tipo_vehiculo", ["SEDAN", "MINIVAN"]);
  } else if (categoria === "CAMIONETAS") {
    dbQuery = dbQuery.in("tipo_vehiculo", ["SUV", "PICKUP", "CARGA"]);
  } else if (categoria === "MOTOS") {
    dbQuery = dbQuery.eq("tipo_vehiculo", "MOTO");
  }

  // Filtro: tipo de vehículo (valor exacto, normalizado en UPPER en BD)
  if (tipo) {
    dbQuery = dbQuery.eq("tipo_vehiculo", tipo);
  }

  // Filtro: marca (ilike para cubrir posibles inconsistencias, normalizamos a UPPER)
  if (marca) {
    dbQuery = dbQuery.ilike("marca", `%${marca}%`);
  }

  // Filtro: rango de precio
  if (!isNaN(minPrecio) && minPrecio > 0) {
    dbQuery = dbQuery.gte("precio", minPrecio);
  }
  if (!isNaN(maxPrecio) && maxPrecio < 150000) {
    dbQuery = dbQuery.lte("precio", maxPrecio);
  }

  // Filtro: rango de año
  if (!isNaN(minAnio) && minAnio > 1990) {
    dbQuery = dbQuery.gte("anio", minAnio);
  }
  if (!isNaN(maxAnio) && maxAnio < new Date().getFullYear()) {
    dbQuery = dbQuery.lte("anio", maxAnio);
  }

  const { data: vehiculosData, error, count } = await dbQuery;
  const vehiculos = (vehiculosData || []) as Vehiculo[];
  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / perPage);

  // ── Helper: construir URL de paginación preservando todos los filtros ──────
  function buildPageUrl(page: number): string {
    const p = new URLSearchParams();
    if (query) p.set("query", query);
    if (tipo) p.set("tipo", tipo);
    if (categoria) p.set("categoria", categoria);
    if (marca) p.set("marca", marca);
    if (params.min_precio) p.set("min_precio", params.min_precio);
    if (params.max_precio) p.set("max_precio", params.max_precio);
    if (params.min_anio) p.set("min_anio", params.min_anio);
    if (params.max_anio) p.set("max_anio", params.max_anio);
    if (page > 1) p.set("page", String(page));
    return `/vehiculos?${p.toString()}`;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-6">

      {/* ── Error de BD ───────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-none text-center font-medium mb-10">
          Ocurrió un error al cargar el inventario: {error.message}
        </div>
      )}

      {/* ── Layout principal: Sidebar + Grid ──────────────────────────────── */}
      {/*
        Grid de 12 columnas (diseno.md §3.2):
        - Desktop: col 1-3 = filtros (w-64 / ~3 cols), col 4-12 = resultados
        - Mobile: filtros en Drawer flotante (VehiculosFiltros lo maneja)
      */}
      <div className="flex gap-6 items-start">

        {/* Sidebar de filtros — VehiculosFiltros renderiza Sidebar(lg+) + Drawer(mobile) */}
        <VehiculosFiltros totalResultados={totalItems} />

        {/* Columna de resultados */}
        <div className="flex-1 min-w-0">

          {/* Barra de estado — conteo y filtros activos */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl font-bold text-slate-900">Vehículos</h1>
              <p className="text-sm text-slate-500 font-medium">
                {totalItems === 0 ? (
                  "Sin resultados"
                ) : (
                  <>
                    <span className="text-slate-900 font-bold">
                      {totalItems.toLocaleString("es-VE")}
                    </span>{" "}
                    resultado{totalItems !== 1 ? "s" : ""}
                  </>
                )}
              </p>
            </div>

            {/* Tags de filtros activos */}
            <div className="hidden sm:flex flex-wrap gap-1.5">
              {tipo && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold uppercase">
                  {tipo}
                </span>
              )}
              {marca && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold uppercase">
                  {marca}
                </span>
              )}
              {params.min_precio && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700 text-white text-xs font-semibold">
                  ≥ ${Number(params.min_precio).toLocaleString("en-US")}
                </span>
              )}
              {params.max_precio && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700 text-white text-xs font-semibold">
                  ≤ ${Number(params.max_precio).toLocaleString("en-US")}
                </span>
              )}
            </div>
          </div>

          {/* Grid de Vehículos */}
          {vehiculos.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {vehiculos.map((vehiculo) => (
                <VehiculoCard key={vehiculo.id} vehiculo={vehiculo} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <img src="/busquedaVacia.png" alt="Búsqueda vacía" className="w-64 h-auto mx-auto mb-6 object-contain" />
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                No encontramos resultados para tu búsqueda
              </h3>
              <ul className="text-slate-600 text-left list-disc list-inside mb-8 space-y-1 text-sm md:text-base">
                <li>Revisa la ortografía.</li>
                <li>Usa términos más generales o remueve algunos filtros.</li>
                <li>Navega por <Link href="/" className="text-blue-600 hover:underline">categorías</Link> para encontrar un vehículo similar.</li>
              </ul>
              <Link
                href="/vehiculos"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors rounded-none"
              >
                Limpiar todos los filtros
              </Link>
            </div>
          )}

          {/* Paginación SSR — preserva todos los filtros */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Anterior
                </Link>
              )}

              {/* Páginas numéricas (máx 5) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(
                  1,
                  Math.min(currentPage - 2, totalPages - 4)
                );
                const pg = start + i;
                return (
                  <Link
                    key={pg}
                    href={buildPageUrl(pg)}
                    className={`px-4 py-2 font-bold transition-colors ${
                      pg === currentPage
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pg}
                  </Link>
                );
              })}

              {currentPage < totalPages && (
                <Link
                  href={buildPageUrl(currentPage + 1)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Siguiente
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
