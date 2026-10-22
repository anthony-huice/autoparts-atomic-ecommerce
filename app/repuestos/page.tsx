import { createClient } from "@/lib/supabase/server";
import { RepuestosGrid } from "@/components/ui/RepuestosGrid";
import { type Repuesto } from "@/types/database";
export const metadata = {
  title: "Catálogo de Repuestos | E-Commerce Automotriz",
  description: "Encuentra repuestos nuevos y usados para tu vehículo.",
};
export default async function RepuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  /* Paginación */ const currentPage = parseInt(params.page || "1", 10);
  const perPage = 16;
  const from = (currentPage - 1) * perPage;
  const to = from + perPage - 1;
  /* Búsqueda general */  const query = params.query || "";

  // ── Fecha de corte para el estado VENDIDO (7 días) ──────────────────────
  const fechaCorte7Dias = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  /* Consulta SSR a BD (filtramos eliminados, pausados y vendidos > 7 días) */ let dbQuery = supabase
    .from("repuestos")
    .select("*")
    .eq("estado_verificacion", "APROBADO")
    .is("deleted_at", null)
    .or(`estado.eq.ACTIVO,and(estado.eq.VENDIDO,fecha_venta.gte.${fechaCorte7Dias})`)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (query) {
    dbQuery = dbQuery.or(
      `nombre_repuesto.ilike.%${query}%,marca_repuesto.ilike.%${query}%`,
    );
  }
  const { data: repuestosData, error } = await dbQuery;
  const repuestos = (repuestosData || []) as Repuesto[];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {" "}
      <div className="mb-10 text-center">
        {" "}
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          {" "}
          Catálogo de Repuestos{" "}
        </h1>{" "}
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          {" "}
          Encuentra repuestos originales y genéricos. Filtra por nombre o
          marca.{" "}
        </p>{" "}
      </div>{" "}
      {/* Buscador */}{" "}
      <div className="max-w-xl mx-auto mb-10">
        {" "}
        <form className="relative flex items-center">
          {" "}
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Buscar repuestos (ej. Filtro, Bosch)..."
            className="w-full px-5 py-4 pl-12 text-slate-900 bg-white border border-slate-200 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />{" "}
          <div className="absolute left-4 text-slate-400">
            {" "}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />{" "}
            </svg>{" "}
          </div>{" "}
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 bg-slate-900 text-white font-medium rounded-none hover:bg-slate-800 transition-colors"
          >
            {" "}
            Buscar{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-none text-center font-medium mb-10">
          {" "}
          Ocurrió un error al cargar el inventario: {error.message}{" "}
        </div>
      )}{" "}
      {/* Grid de Repuestos (Infinite Scroll) */}{" "}
      {!error && <RepuestosGrid initialData={repuestos} query={query} />}{" "}
    </div>
  );
}
