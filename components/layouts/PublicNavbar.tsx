"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useUIStore } from "@/store/useUIStore";
import { Search, Bell, User, ChevronDown, LogOut, Clock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useNavbarData, type NotificacionItem } from "@/hooks/useNavbarData";
// ─── Constantes ───────────────────────────────────────────────────────────────
const RECIENTES_KEY = "tcy_busquedas_recientes";
const MAX_RECIENTES = 6;
const DEBOUNCE_MS = 220;

// ─── localStorage helpers ──────────────────────────────────────────────────────
function getRecientes(): string[] {
  try {
    const raw = localStorage.getItem(RECIENTES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}
function guardarReciente(query: string) {
  try {
    const prev = getRecientes().filter((r) => r.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(RECIENTES_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECIENTES)));
  } catch { /* sin localStorage */ }
}
function eliminarReciente(query: string) {
  try {
    const next = getRecientes().filter((r) => r.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(RECIENTES_KEY, JSON.stringify(next));
  } catch { /* sin localStorage */ }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Sugerencia =
  | { tipo: "reciente"; texto: string }
  | { tipo: "marca" | "modelo"; texto: string };

// ─── Dropdown (componente de módulo, fuera del árbol de PublicNavbar) ─────────
// IMPORTANTE: definir aquí (nivel módulo) para que React no lo desmonte en cada render.
function DropdownSugerencias({
  sugerencias,
  query,
  indiceActivo,
  setIndiceActivo,
  onSelect,
  onEliminarReciente,
}: {
  sugerencias: Sugerencia[];
  query: string;
  indiceActivo: number;
  setIndiceActivo: (i: number) => void;
  onSelect: (texto: string) => void;
  onEliminarReciente: (texto: string) => void;
}) {
  if (sugerencias.length === 0) return null;
  const hayRecientes = sugerencias.some((s) => s.tipo === "reciente");

  return (
    <ul
      role="listbox"
      className="absolute top-full left-0 right-0 z-[200] bg-white border border-gray-200 shadow-xl"
      style={{ marginTop: "1px" }}
    >
      <li className="px-4 pt-3 pb-1">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {hayRecientes ? "Búsquedas recientes" : "Sugerencias"}
        </span>
      </li>
      {sugerencias.map((s, idx) => {
        const activo = idx === indiceActivo;
        const matchLen = query.trim().length;
        const textoLower = s.texto.toLowerCase();
        const queryLower = query.trim().toLowerCase();
        const matchIdx = textoLower.indexOf(queryLower);
        let prefix = s.texto, match = "", suffix = "";
        if (matchLen > 0 && matchIdx !== -1) {
          prefix = s.texto.slice(0, matchIdx);
          match = s.texto.slice(matchIdx, matchIdx + matchLen);
          suffix = s.texto.slice(matchIdx + matchLen);
        }
        return (
          <li
            key={`${s.tipo}-${s.texto}`}
            role="option"
            aria-selected={activo}
            onMouseEnter={() => setIndiceActivo(idx)}
            onMouseDown={(e) => { e.preventDefault(); onSelect(s.texto); }}
            className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${activo ? "bg-gray-50" : "hover:bg-gray-50"}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {s.tipo === "reciente"
                ? <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                : <Search className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
              }
              <span className="text-sm text-gray-800 truncate capitalize">
                {matchLen > 0 && matchIdx !== -1 ? (
                  <>{prefix}<span className="font-bold text-gray-900">{match}</span>{suffix}</>
                ) : (
                  s.texto.toLowerCase()
                )}
                {(s.tipo === "marca" || s.tipo === "modelo") && (
                  <span className="ml-2 text-[11px] text-gray-400 font-medium uppercase">{s.tipo}</span>
                )}
              </span>
            </div>
            {s.tipo === "reciente" && (
              <button
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onEliminarReciente(s.texto); }}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
                aria-label={`Eliminar ${s.texto}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Buscador con sugerencias (componente de módulo) ─────────────────────────
// También definido a nivel módulo para evitar remontado al re-render del navbar.
function BuscadorConSugerencias({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarSugerencias = useCallback(async (texto: string) => {
    if (!texto.trim()) {
      const recientes = getRecientes();
      setSugerencias(recientes.map((r) => ({ tipo: "reciente", texto: r })));
      return;
    }
    const term = texto.trim().toUpperCase();
    const [{ data: marcas }, { data: modelos }] = await Promise.all([
      supabase.from("vehiculos").select("marca").ilike("marca", `${term}%`).is("deleted_at", null).limit(5),
      supabase.from("vehiculos").select("modelo").ilike("modelo", `${term}%`).is("deleted_at", null).limit(5),
    ]);
    const setMarcas = new Set<string>(marcas?.map((r) => r.marca) ?? []);
    const setModelos = new Set<string>(modelos?.map((r) => r.modelo) ?? []);
    const lista: Sugerencia[] = [
      ...[...setMarcas].map((m): Sugerencia => ({ tipo: "marca", texto: m })),
      ...[...setModelos].filter((m) => !setMarcas.has(m)).map((m): Sugerencia => ({ tipo: "modelo", texto: m })),
    ].slice(0, 8);
    setSugerencias(lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click fuera → cerrar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setAbierto(false);
        setIndiceActivo(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    setIndiceActivo(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => cargarSugerencias(val), DEBOUNCE_MS);
    setAbierto(true);
  };

  const handleFocus = () => {
    cargarSugerencias(query);
    setAbierto(true);
  };

  const navegar = (texto: string) => {
    guardarReciente(texto);
    setQuery(texto);
    setAbierto(false);
    setIndiceActivo(-1);
    router.push(`/vehiculos?query=${encodeURIComponent(texto)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (indiceActivo >= 0 && sugerencias[indiceActivo]) {
      navegar(sugerencias[indiceActivo].texto);
    } else if (query.trim()) {
      navegar(query.trim());
    } else {
      setAbierto(false);
      router.push("/vehiculos");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setIndiceActivo((i) => Math.min(i + 1, sugerencias.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndiceActivo((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape") { setAbierto(false); setIndiceActivo(-1); }
  };

  const handleEliminarReciente = (texto: string) => {
    eliminarReciente(texto);
    cargarSugerencias(query);
  };

  return (
    <div ref={contenedorRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="w-full bg-white flex border border-gray-200">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full py-2 px-4 text-gray-900 placeholder:text-gray-400 outline-none text-sm bg-white"
        />
        <button type="submit" className="px-4 border-l border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-colors">
          <Search className="w-4 h-4" />
        </button>
      </form>

      {abierto && (
        <DropdownSugerencias
          sugerencias={sugerencias}
          query={query}
          indiceActivo={indiceActivo}
          setIndiceActivo={setIndiceActivo}
          onSelect={navegar}
          onEliminarReciente={handleEliminarReciente}
        />
      )}
    </div>
  );
}


function DropdownNotificaciones({
  notificaciones,
  onMarcarLeida,
  onCerrar,
}: {
  notificaciones: NotificacionItem[];
  onMarcarLeida: (id: string) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl z-[300] rounded-none text-slate-800">
      <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Notificaciones</span>
        <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
        {notificaciones.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500 italic">Sin notificaciones nuevas.</div>
        ) : (
          notificaciones.map((n) => (
            <div
              key={n.id}
              onClick={() => onMarcarLeida(n.id)}
              className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${!n.leido ? "bg-blue-50/50" : ""}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-xs text-slate-900">{n.titulo}</span>
                {!n.leido && <span className="w-1.5 h-1.5 bg-blue-600 rounded-none shrink-0 mt-1"></span>}
              </div>
              <p className="text-xs text-slate-600 mt-1">{n.mensaje}</p>
              <span className="text-[10px] text-gray-400 mt-1 block">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── PublicNavbar ─────────────────────────────────────────────────────────────
export function PublicNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useSession();
  const { openAuthModal } = useUIStore();
  const { data: navbarData, isLoading: isNavbarLoading, marcarLeida } = useNavbarData(user?.id);
  const { nombreReal, esEmpresa, notificaciones, tienePlanActivo, fechaExpiracion } = navbarData;
  const [mostrarNotif, setMostrarNotif] = useState(false);

  const handleMarcarLeida = async (id: string) => {
    marcarLeida(id);
    const notifObj = notificaciones.find((n) => n.id === id);
    if (notifObj?.metadata) {
      if (notifObj.metadata.vehiculo_id) {
        router.push(`/vehiculos/${notifObj.metadata.vehiculo_id}`);
      } else if (notifObj.metadata.repuesto_id) {
        router.push(`/repuestos/${notifObj.metadata.repuesto_id}`);
      }
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (
    pathname.startsWith("/panel-aliado") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin")
  ) return null;

  const getDisplayName = () => {
    if (!user) return "Mi Perfil";
    if (nombreReal) { const p = nombreReal.split(" ")[0]; return p.length > 10 ? p.slice(0, 10) + "..." : p; }
    const meta = user.user_metadata?.nombre || user.user_metadata?.nombres || user.user_metadata?.name || user.user_metadata?.full_name;
    if (meta) { const p = meta.split(" ")[0]; return p.length > 10 ? p.slice(0, 10) + "..." : p; }
    const email = user.email ? user.email.split("@")[0] : "Mi Perfil";
    return email.length > 10 ? email.slice(0, 10) + "..." : email;
  };

  return (
    <header className="w-full bg-[#1e40af] border-b border-[#1f1d53]">
      <div suppressHydrationWarning className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 flex flex-col pt-2 pb-2 gap-2 md:gap-0">

        {/* Fila Superior */}
        <div className="flex items-center justify-between md:mb-2">
          <Link href="/" className="flex flex-col items-center justify-center shrink-0 w-auto">
            <Image
              src="/autoparts-pro-logo.svg"
              alt="AutoParts Pro Logo"
              width={280}
              height={100}
              className="h-10 sm:h-12 md:h-14 w-auto object-contain brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
              priority
            />
          </Link>

          {/* Buscador Desktop */}
          <div className="flex-1 ml-4 sm:ml-10 md:ml-16 mr-0 md:mr-8 hidden md:flex justify-center">
            <BuscadorConSugerencias placeholder="Buscar vehículos, repuestos y más..." className="w-full max-w-2xl" />
          </div>

          {/* Iconos móvil */}
          <div className="flex items-center gap-4 md:hidden">
            <div className="relative">
              <button
                onClick={() => setMostrarNotif(!mostrarNotif)}
                className="text-white hover:text-gray-200 transition-colors block relative"
              >
                <Bell className="w-5 h-5" />
                {notificaciones.some((n) => !n.leido) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#1e40af]" />
                )}
              </button>
              {mostrarNotif && (
                <DropdownNotificaciones
                  notificaciones={notificaciones}
                  onMarcarLeida={handleMarcarLeida}
                  onCerrar={() => setMostrarNotif(false)}
                />
              )}
            </div>
            {(!isLoading && !isNavbarLoading) && (user ? (
              <div className="relative group">
                <Link href="/panel-aliado" className="text-white hover:text-gray-200 transition-colors block pb-2"><User className="w-5 h-5" strokeWidth={1.5} /></Link>
                <div className="absolute right-0 top-full hidden group-hover:block w-48 bg-white shadow-lg border border-gray-200 z-50 rounded-none">
                  <Link href="/panel-aliado" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    {esEmpresa ? "Mi Panel Empresa" : "Mi Cuenta"}
                  </Link>
                  <div className="border-t border-gray-100" />
                  <button onClick={handleSignOut} className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left rounded-none"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</button>
                </div>
              </div>
            ) : (
              <button onClick={() => openAuthModal("login")} className="text-white hover:text-gray-200 transition-colors"><User className="w-5 h-5" strokeWidth={1.5} /></button>
            ))}
          </div>

          {/* CTA Publicar */}
          <div className="hidden md:flex items-center shrink-0">
            <Link href={esEmpresa || tienePlanActivo ? "/panel-aliado/vehiculos/nuevo" : "/vender"} className="px-4 py-2 bg-white text-[#1e40af] font-bold text-[13px] hover:bg-slate-50 transition-colors shadow-sm">
              {esEmpresa || tienePlanActivo ? "Publicar" : "Publicar Gratis"}
            </Link>
          </div>
        </div>

        {/* Buscador Móvil */}
        <div className="w-full md:hidden">
          <BuscadorConSugerencias placeholder="Buscar vehículos..." />
        </div>

        {/* Fila Inferior */}
        <div className="hidden md:flex items-center justify-between mt-1">
          <nav className="flex items-center gap-5">
            <Link href="/vehiculos" className="text-[13px] text-white hover:text-gray-200 transition-colors">Categorías</Link>
            <Link href="/repuestos" className="text-[13px] text-white hover:text-gray-200 transition-colors">Repuestos</Link>
            <Link href="/talleres" className="text-[13px] text-white hover:text-gray-200 transition-colors">Talleres</Link>
            <Link href="/ayuda" className="text-[13px] text-white hover:text-gray-200 transition-colors">Ayuda</Link>
          </nav>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setMostrarNotif(!mostrarNotif)}
                className="text-white hover:text-gray-200 transition-colors flex items-center relative"
              >
                <Bell className="w-5 h-5" />
                {notificaciones.some((n) => !n.leido) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#1e40af]" />
                )}
              </button>
              {mostrarNotif && (
                <DropdownNotificaciones
                  notificaciones={notificaciones}
                  onMarcarLeida={handleMarcarLeida}
                  onCerrar={() => setMostrarNotif(false)}
                />
              )}
            </div>
            <Link href="/favoritos" className="text-[13px] text-white hover:text-gray-200 transition-colors">Guardados</Link>
            <Link href="/mis-compras" className="text-[13px] text-white hover:text-gray-200 transition-colors">Mis compras</Link>

            {(!isLoading && !isNavbarLoading) && (user ? (
              <div className="relative group">
                <Link href="/panel-aliado" className="flex items-center gap-1.5 text-[13px] text-white hover:text-gray-200 transition-colors pb-2">
                  <User className="w-5 h-5" strokeWidth={1.5} />
                  <span>{getDisplayName()}</span>
                  <ChevronDown className="w-4 h-4" />
                </Link>
                <div className="absolute right-0 top-full mt-0 hidden group-hover:block w-48 bg-white shadow-lg border border-gray-200 z-50 rounded-none">
                  <Link href="/panel-aliado" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                    {esEmpresa ? "Mi Panel Empresa" : "Mi Cuenta"}
                  </Link>
                  <div className="border-t border-gray-100" />
                  <button onClick={handleSignOut} className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left rounded-none"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</button>
                </div>
              </div>
            ) : (
              <button onClick={() => openAuthModal("login")} className="flex items-center gap-1.5 text-[13px] text-white hover:text-gray-200 transition-colors">
                <User className="w-5 h-5" strokeWidth={1.5} /><span>Ingresa</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </header>
  );
}
