"use client";

/**
 * VehiculosFiltros.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sistema de Faceted Search para el catálogo de vehículos.
 *
 * ARQUITECTURA DE ESTADO: 100 % URL Search Params.
 * - Todo el estado vive en la URL. Permite compartir búsquedas, historial del
 *   navegador y SSR sin necesidad de React Context ni localStorage.
 * - Params soportados: tipo, marca, min_precio, max_precio, min_anio, max_anio
 *
 * LAYOUT:
 * - Desktop (lg+): Panel sidebar izquierdo sticky con acordeones.
 * - Mobile (<lg):  Botón flotante "Filtrar" que abre un Drawer desde abajo,
 *                  usando el Popover API + scroll-snap (patrón modern-web-guidance).
 *
 * REGLA GEOMETRÍA: 0 bordes redondeados en toda la UI.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { type TipoVehiculo } from "@/types/database";

// ─── Constantes de dominio ────────────────────────────────────────────────────

const TIPOS_VEHICULO: { value: TipoVehiculo; label: string }[] = [
  { value: "SUV", label: "SUV" },
  { value: "SEDAN", label: "Sedán" },
  { value: "PICKUP", label: "Pickup" },
  { value: "MINIVAN", label: "Minivan" },
  { value: "MOTO", label: "Moto" },
  { value: "CARGA", label: "Carga" },
];

const MARCAS_POPULARES = [
  "TOYOTA",
  "CHEVROLET",
  "FORD",
  "NISSAN",
  "HYUNDAI",
  "KIA",
  "MITSUBISHI",
  "VOLKSWAGEN",
  "HONDA",
  "JEEP",
];

const PRECIO_MIN = 0;
const PRECIO_MAX = 150000;
const ANIO_MIN = 1990;
const ANIO_MAX = new Date().getFullYear();

// ─── Hook: estado del filtro sincronizado con URL ─────────────────────────────

export function useFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tipo = searchParams.get("tipo") ?? "";
  const marca = searchParams.get("marca") ?? "";
  const minPrecio = Number(searchParams.get("min_precio") ?? PRECIO_MIN);
  const maxPrecio = Number(searchParams.get("max_precio") ?? PRECIO_MAX);
  const minAnio = Number(searchParams.get("min_anio") ?? ANIO_MIN);
  const maxAnio = Number(searchParams.get("max_anio") ?? ANIO_MAX);

  // true si hay al menos un filtro activo diferente de sus valores por defecto
  const hayFiltrosActivos =
    tipo !== "" ||
    marca !== "" ||
    minPrecio !== PRECIO_MIN ||
    maxPrecio !== PRECIO_MAX ||
    minAnio !== ANIO_MIN ||
    maxAnio !== ANIO_MAX;

  const actualizarParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      // Siempre reseteamos a página 1 al cambiar filtros
      params.delete("page");
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const limpiarFiltros = useCallback(() => {
    // Preservamos solo el param "query" si existe
    const params = new URLSearchParams();
    const query = searchParams.get("query");
    if (query) params.set("query", query);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return {
    tipo,
    marca,
    minPrecio,
    maxPrecio,
    minAnio,
    maxAnio,
    hayFiltrosActivos,
    actualizarParam,
    limpiarFiltros,
  };
}

// ─── Componentes de filtro individuales ──────────────────────────────────────

function SeccionFiltro({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

function FiltroPrecio({
  minPrecio,
  maxPrecio,
  onMinChange,
  onMaxChange,
}: {
  minPrecio: number;
  maxPrecio: number;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  const [tempMin, setTempMin] = useState(minPrecio === PRECIO_MIN ? "" : String(minPrecio));
  const [tempMax, setTempMax] = useState(maxPrecio === PRECIO_MAX ? "" : String(maxPrecio));

  useEffect(() => {
    setTempMin(minPrecio === PRECIO_MIN ? "" : String(minPrecio));
  }, [minPrecio]);

  useEffect(() => {
    setTempMax(maxPrecio === PRECIO_MAX ? "" : String(maxPrecio));
  }, [maxPrecio]);

  const handleMinBlur = () => {
    onMinChange(tempMin);
  };

  const handleMaxBlur = () => {
    onMaxChange(tempMax);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: "min" | "max") => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (type === "min") {
        onMinChange(tempMin);
      } else {
        onMaxChange(tempMax);
      }
      e.currentTarget.blur();
    }
  };

  const formatUSD = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
        <span>{formatUSD(minPrecio)}</span>
        <span>{formatUSD(maxPrecio)}</span>
      </div>
      <div className="space-y-2">
        <label className="block text-xs text-slate-500">Mínimo</label>
        <input
          id="filtro-min-precio"
          type="number"
          min={PRECIO_MIN}
          max={PRECIO_MAX}
          step={500}
          value={tempMin}
          onChange={(e) => setTempMin(e.target.value)}
          onBlur={handleMinBlur}
          onKeyDown={(e) => handleKeyDown(e, "min")}
          className="w-full px-3 py-2 text-sm border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent rounded-none transition-all"
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs text-slate-500">Máximo</label>
        <input
          id="filtro-max-precio"
          type="number"
          min={PRECIO_MIN}
          max={PRECIO_MAX}
          step={500}
          value={tempMax}
          onChange={(e) => setTempMax(e.target.value)}
          onBlur={handleMaxBlur}
          onKeyDown={(e) => handleKeyDown(e, "max")}
          className="w-full px-3 py-2 text-sm border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent rounded-none transition-all"
          placeholder="150000"
        />
      </div>
    </div>
  );
}

function FiltroTipoVehiculo({
  tipoActual,
  onChange,
}: {
  tipoActual: string;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      {TIPOS_VEHICULO.map(({ value, label }) => {
        const activo = tipoActual === value;
        return (
          <button
            key={value}
            id={`filtro-tipo-${value.toLowerCase()}`}
            onClick={() => onChange(activo ? null : value)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors text-left ${
              activo
                ? "bg-slate-900 text-white"
                : "bg-transparent text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>{label}</span>
            {activo && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FiltroMarca({
  marcaActual,
  onChange,
}: {
  marcaActual: string;
  onChange: (v: string | null) => void;
}) {
  const [marcaCustom, setMarcaCustom] = useState("");
  const [sugerenciasVisibles, setSugerenciasVisibles] = useState(false);
  const [indiceSugerencia, setIndiceSugerencia] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  // Sincroniza input custom cuando la marca activa no es de la lista
  useEffect(() => {
    if (marcaActual && !MARCAS_POPULARES.includes(marcaActual)) {
      setMarcaCustom(marcaActual);
    } else {
      setMarcaCustom("");
    }
  }, [marcaActual]);

  // Filtrar sugerencias basado en lo que escribe el usuario
  const sugerenciasFiltradas = marcaCustom.trim().length > 0
    ? MARCAS_POPULARES.filter((m) =>
        m.startsWith(marcaCustom.trim().toUpperCase())
      )
    : [];

  const aplicarMarca = (marca: string) => {
    onChange(marca.trim());
    setMarcaCustom(marca);
    setSugerenciasVisibles(false);
    setIndiceSugerencia(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!sugerenciasVisibles || sugerenciasFiltradas.length === 0) {
      if (e.key === "Enter" && marcaCustom.trim()) {
        aplicarMarca(marcaCustom.trim());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSugerencia((i) => Math.min(i + 1, sugerenciasFiltradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSugerencia((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (indiceSugerencia >= 0) {
        aplicarMarca(sugerenciasFiltradas[indiceSugerencia]);
      } else if (marcaCustom.trim()) {
        aplicarMarca(marcaCustom.trim());
      }
    } else if (e.key === "Escape") {
      setSugerenciasVisibles(false);
      setIndiceSugerencia(-1);
    }
  };

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const clickDentroInput = inputRef.current?.contains(e.target as Node);
      const clickDentroLista = listaRef.current?.contains(e.target as Node);
      if (!clickDentroInput && !clickDentroLista) {
        setSugerenciasVisibles(false);
        setIndiceSugerencia(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-3 overflow-visible">
      {/* Marcas populares */}
      <div className="flex flex-wrap gap-1.5">
        {MARCAS_POPULARES.map((m) => {
          const activo = marcaActual === m;
          return (
            <button
              key={m}
              id={`filtro-marca-${m.toLowerCase()}`}
              onClick={() => onChange(activo ? null : m)}
              className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activo
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Búsqueda con autocomplete propio — sin autoComplete nativo del browser */}
      <div className="relative overflow-visible">
        <div className="relative flex items-center">
          {/* Ícono lupa */}
          <svg
            className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            ref={inputRef}
            id="filtro-marca-custom"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={marcaCustom}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setMarcaCustom(val);
              setSugerenciasVisibles(true);
              setIndiceSugerencia(-1);
            }}
            onFocus={() => {
              if (marcaCustom.trim()) setSugerenciasVisibles(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Otra marca..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 uppercase"
          />
          {/* Botón limpiar */}
          {marcaCustom && (
            <button
              type="button"
              onClick={() => {
                setMarcaCustom("");
                onChange(null);
                setSugerenciasVisibles(false);
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Limpiar marca"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown de sugerencias — estilo ML/eBay */}
        {sugerenciasVisibles && sugerenciasFiltradas.length > 0 && (
          <ul
            ref={listaRef}
            role="listbox"
            aria-label="Sugerencias de marca"
            className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 shadow-lg overflow-hidden"
          >
            {sugerenciasFiltradas.map((m, idx) => {
              const matchLen = marcaCustom.trim().length;
              const prefix = m.slice(0, matchLen);
              const resto = m.slice(matchLen);
              const estaActivo = idx === indiceSugerencia;
              return (
                <li
                  key={m}
                  role="option"
                  aria-selected={estaActivo}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    aplicarMarca(m);
                  }}
                  onMouseEnter={() => setIndiceSugerencia(idx)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                    estaActivo ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <span className="uppercase tracking-wide">
                    <span className="font-bold text-slate-900">{prefix}</span>
                    <span className="font-normal text-slate-500">{resto}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}


function FiltroAnio({
  minAnio,
  maxAnio,
  onMinChange,
  onMaxChange,
}: {
  minAnio: number;
  maxAnio: number;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label htmlFor="filtro-min-anio" className="block text-xs text-slate-500 mb-1.5">
          Desde
        </label>
        <input
          id="filtro-min-anio"
          type="number"
          min={ANIO_MIN}
          max={maxAnio}
          value={minAnio}
          onChange={(e) => onMinChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent rounded-none transition-all"
        />
      </div>
      <div>
        <label htmlFor="filtro-max-anio" className="block text-xs text-slate-500 mb-1.5">
          Hasta
        </label>
        <input
          id="filtro-max-anio"
          type="number"
          min={minAnio}
          max={ANIO_MAX}
          value={maxAnio}
          onChange={(e) => onMaxChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent rounded-none transition-all"
        />
      </div>
    </div>
  );
}

// ─── Panel de filtros (contenido compartido desktop/mobile) ───────────────────

export function PanelContenido({
  totalResultados,
  onClose,
}: {
  totalResultados: number;
  onClose?: () => void;
}) {
  const {
    tipo,
    marca,
    minPrecio,
    maxPrecio,
    minAnio,
    maxAnio,
    hayFiltrosActivos,
    actualizarParam,
    limpiarFiltros,
  } = useFiltros();

  return (
    <div className="flex flex-col overflow-visible">
      {/* Header del panel */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">Filtros</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalResultados.toLocaleString("es-VE")} resultado
            {totalResultados !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hayFiltrosActivos && (
            <button
              id="btn-limpiar-filtros"
              onClick={() => {
                limpiarFiltros();
                onClose?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Cerrar filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filtros — Orden: Precio → Tipo → Marca → Año */}
      <div className="flex-1">
        {/* 1. PRECIO */}
        <SeccionFiltro titulo="Precio (USD)">
          <FiltroPrecio
            minPrecio={minPrecio}
            maxPrecio={maxPrecio}
            onMinChange={(v) => {
              if (v === "") {
                actualizarParam("min_precio", null);
                return;
              }
              const n = Math.max(PRECIO_MIN, Math.min(Number(v), PRECIO_MAX));
              actualizarParam(
                "min_precio",
                n === PRECIO_MIN ? null : String(n)
              );
            }}
            onMaxChange={(v) => {
              if (v === "") {
                actualizarParam("max_precio", null);
                return;
              }
              const n = Math.min(PRECIO_MAX, Math.max(Number(v), PRECIO_MIN));
              actualizarParam(
                "max_precio",
                n === PRECIO_MAX ? null : String(n)
              );
            }}
          />
        </SeccionFiltro>

        {/* 2. TIPO DE VEHÍCULO */}
        <SeccionFiltro titulo="Tipo de Vehículo">
          <FiltroTipoVehiculo
            tipoActual={tipo}
            onChange={(v) => actualizarParam("tipo", v)}
          />
        </SeccionFiltro>

        {/* 3. MARCA */}
        <SeccionFiltro titulo="Marca">
          <FiltroMarca
            marcaActual={marca}
            onChange={(v) => actualizarParam("marca", v)}
          />
        </SeccionFiltro>

        {/* 4. AÑO */}
        <SeccionFiltro titulo="Año">
          <FiltroAnio
            minAnio={minAnio}
            maxAnio={maxAnio}
            onMinChange={(v) => {
              const n = Math.max(ANIO_MIN, Math.min(Number(v), maxAnio));
              actualizarParam(
                "min_anio",
                n === ANIO_MIN ? null : String(n)
              );
            }}
            onMaxChange={(v) => {
              const n = Math.min(ANIO_MAX, Math.max(Number(v), minAnio));
              actualizarParam(
                "max_anio",
                n === ANIO_MAX ? null : String(n)
              );
            }}
          />
        </SeccionFiltro>
      </div>

      {/* CTA mobile — Aplicar filtros */}
      {onClose && (
        <div className="pt-4 mt-4 border-t border-slate-200">
          <button
            id="btn-aplicar-filtros"
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 text-white font-bold text-sm uppercase tracking-wide hover:bg-slate-800 transition-colors"
          >
            Ver {totalResultados.toLocaleString("es-VE")} resultado
            {totalResultados !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

const VehiculosFiltrosMobile = dynamic<{ totalResultados: number }>(() => import('./VehiculosFiltrosMobile'), { ssr: false });

// ─── Sidebar Desktop ──────────────────────────────────────────────────────────

function SidebarDesktop({ totalResultados }: { totalResultados: number }) {
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0 pt-1">
      <PanelContenido totalResultados={totalResultados} />
    </aside>
  );
}

// ─── Componente público exportado ─────────────────────────────────────────────

/**
 * VehiculosFiltros
 *
 * Renderiza:
 * - `<SidebarDesktop />` en pantallas lg+
 * - `<DrawerMobile />` en pantallas menores que lg
 *
 * Uso:
 * ```tsx
 * <VehiculosFiltros totalResultados={count} />
 * ```
 */
export function VehiculosFiltros({
  totalResultados,
}: {
  totalResultados: number;
}) {
  return (
    <>
      <SidebarDesktop totalResultados={totalResultados} />
      <VehiculosFiltrosMobile totalResultados={totalResultados} />
    </>
  );
}
