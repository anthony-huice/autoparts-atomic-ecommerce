"use client";

/**
 * PricingPlanes.tsx
 * Componente de selección de plan de publicación para vendedores particulares.
 *
 * Dos planes:
 *   - BASICO:    Gratis · 15 días · 4 fotos · renovable a $1 USD + IVA
 *   - DESTACADO: $5 USD + IVA · 45 días · 10 fotos · posición premium
 *
 * Jerarquía visual: diseno.md §2 (NIVEL 1 dominante = DESTACADO, NIVEL 2 subdominante = BASICO)
 * Contraste:        diseno.md §1.2 REGLA 2 (WCAG AA mínimo 4.5:1)
 * Bordes:           DIRECTRICES AGENTS.md → rounded-none en TODO (0 bordes redondos)
 * Tipografía:       diseno.md §4.2 → fuente "Inter" desde Google Fonts (cargada globalmente)
 */

import { Check, Star, Camera, Clock, BarChart2, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TipoPlan = "BASICO" | "DESTACADO";

interface PricingPlanesProps {
  /** Plan actualmente seleccionado (controlled). */
  planSeleccionado: TipoPlan;
  /** Callback cuando el usuario elige un plan. */
  onSeleccionar: (plan: TipoPlan) => void;
  /**
   * Porcentaje de IVA a aplicar (ej. 16 para 16%).
   * Se usa para mostrar el precio total con impuesto en runtime.
   * Nunca hardcodeado — se pasa como prop desde el servidor o configuración.
   */
  porcentajeIva?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Calcula precio con IVA y lo formatea como string USD */
function precioConIva(base: number, porcentaje: number): string {
  // DIRECTRICES §2: no usar float nativo para cálculo monetario final.
  // El resultado es solo display; el backend guarda el precio base en DECIMAL.
  const total = base + base * (porcentaje / 100);
  return total.toFixed(2);
}

// ─── Feature list helpers ─────────────────────────────────────────────────────

interface Feature {
  icono: React.ReactNode;
  texto: string;
  destacado?: boolean;
}

const featuresBasico: Feature[] = [
  { icono: <Clock className="w-4 h-4" />,   texto: "15 días de vigencia" },
  { icono: <Camera className="w-4 h-4" />,  texto: "Hasta 4 fotografías" },
  { icono: <Check className="w-4 h-4" />,   texto: "Aparición en catálogo general" },
  { icono: <Check className="w-4 h-4" />,   texto: "Renovable por $1 USD + IVA (tasa BCV del día)" },
];

const featuresDestacado: Feature[] = [
  { icono: <Clock className="w-4 h-4" />,        texto: "45 días de vigencia",                destacado: true },
  { icono: <Camera className="w-4 h-4" />,       texto: "Hasta 10 fotografías",               destacado: true },
  { icono: <Zap className="w-4 h-4" />,          texto: "Posición prioritaria en resultados", destacado: true },
  { icono: <ShieldCheck className="w-4 h-4" />,  texto: "Sello de confianza verificado",      destacado: true },
  { icono: <BarChart2 className="w-4 h-4" />,    texto: "Estadísticas de visitas",            destacado: true },
  { icono: <Check className="w-4 h-4" />,        texto: "Soporte prioritario",                destacado: true },
];

// ─── Sub-componentes ─────────────────────────────────────────────────────────

interface FeatureItemProps {
  feature: Feature;
  colorIcono: string;
  colorTexto: string;
}

function FeatureItem({ feature, colorIcono, colorTexto }: FeatureItemProps) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 ${colorIcono}`}>{feature.icono}</span>
      <span className={`text-sm leading-snug ${colorTexto}`}>{feature.texto}</span>
    </li>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function PricingPlanes({
  planSeleccionado,
  onSeleccionar,
  porcentajeIva = 16,
}: PricingPlanesProps) {
  const precioDestacadoTotal = precioConIva(5, porcentajeIva);
  const precioRenovacionTotal = precioConIva(1, porcentajeIva);

  return (
    <section
      aria-labelledby="pricing-heading"
      className="w-full"
    >
      {/* Encabezado de sección */}
      <div className="mb-8 text-center">
        <h2
          id="pricing-heading"
          className="text-2xl font-bold text-slate-900 tracking-tight"
        >
          Elige tu plan de publicación
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
          Todos los precios están expresados en USD y serán cobrados a la tasa oficial del Banco Central de Venezuela (BCV) del día más su respectivo IVA ({porcentajeIva}%).
        </p>
      </div>

      {/* Grid de tarjetas — mobile: 1 col / desktop: 2 col */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

        {/* ── TARJETA BÁSICO (NIVEL 2 — Subdominante) ── */}
        <div
          role="radio"
          aria-checked={planSeleccionado === "BASICO"}
          tabIndex={0}
          onClick={() => onSeleccionar("BASICO")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSeleccionar("BASICO")}
          className={[
            // Base
            "relative flex flex-col rounded-none border-2 p-8 cursor-pointer transition-all duration-200",
            // Estado seleccionado vs no seleccionado (Ring border azul si está activo)
            planSeleccionado === "BASICO"
              ? "border-[#1e40af] ring-2 ring-[#1e40af] shadow-lg bg-white"
              : "border-slate-300 bg-white hover:border-[#1e40af] hover:shadow-md",
          ].join(" ")}
        >


          {/* Eslogan */}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Pruébanos y empieza a vender
          </p>

          {/* Nombre del plan */}
          <h3 className="text-xl font-bold text-slate-900 mb-1">Plan Básico</h3>

          {/* Precio */}
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-extrabold text-slate-900">Gratis</span>
          </div>

          {/* Separador */}
          <div className="w-full h-px bg-slate-200 mb-6" />

          {/* Features */}
          <ul className="flex flex-col gap-3 mb-8 flex-1">
            {featuresBasico.map((f, i) => (
              <FeatureItem
                key={i}
                feature={f}
                colorIcono="text-slate-600"
                colorTexto="text-slate-700"
              />
            ))}
          </ul>

          {/* Nota de renovación */}
          <p className="text-xs text-slate-500 border-t border-slate-200 pt-4 mt-auto">
            ¿Quieres seguir publicando después de los 15 días?{" "}
            <strong className="text-slate-700">
              Renueva por ${precioRenovacionTotal} USD (IVA incl. a la tasa BCV del día)
            </strong>
          </p>
        </div>

        {/* ── TARJETA DESTACADO (NIVEL 1 — Dominante) ── */}
        <div
          role="radio"
          aria-checked={planSeleccionado === "DESTACADO"}
          tabIndex={0}
          onClick={() => onSeleccionar("DESTACADO")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSeleccionar("DESTACADO")}
          className={[
            // Base
            "relative flex flex-col rounded-none border-2 p-8 cursor-pointer transition-all duration-200",
            // Dominante: Ring border azul si está activo
            planSeleccionado === "DESTACADO"
              ? "border-[#1e40af] ring-2 ring-[#1e40af] shadow-xl bg-white"
              : "border-slate-300 bg-white hover:border-[#1e40af] hover:shadow-md",
          ].join(" ")}
        >
          {/* Badge "Más popular" — diseno.md §8.1: gancho visual badge amarillo */}
          <span
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1
                       bg-amber-400 text-amber-900 text-xs font-bold
                       uppercase tracking-wider rounded-none whitespace-nowrap"
          >
            <Star className="inline w-3 h-3 mr-1 -mt-px" />
            Más popular
          </span>



          {/* Eslogan */}
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1e40af] mb-3">
            El equilibrio perfecto entre rapidez y precio
          </p>

          {/* Nombre del plan */}
          <h3 className="text-xl font-bold text-slate-900 mb-1">Plan Destacado</h3>

          {/* Precio */}
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-4xl font-extrabold text-slate-900">$5</span>
            <span className="text-lg font-semibold text-slate-600">USD</span>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Total con IVA ({porcentajeIva}%): <strong className="text-slate-700">${precioDestacadoTotal} USD</strong> (al cambio BCV del día)
          </p>

          {/* Separador */}
          <div className="w-full h-px bg-[#1e40af]/20 mb-6" />

          {/* Features */}
          <ul className="flex flex-col gap-3 mb-8 flex-1">
            {featuresDestacado.map((f, i) => (
              <FeatureItem
                key={i}
                feature={f}
                colorIcono="text-[#1e40af]"
                colorTexto="text-slate-800"
              />
            ))}
          </ul>

          {/* Vigencia destacada */}
          <p className="text-xs text-slate-500 border-t border-[#1e40af]/20 pt-4 mt-auto">
            Tu anuncio permanecerá activo durante{" "}
            <strong className="text-slate-700">45 días completos</strong>.
          </p>
        </div>

      </div>

      <p className="mt-4 text-center text-xs text-slate-500 max-w-2xl mx-auto">
        El cobro se procesa de forma segura antes de publicar. Los precios base se calculan en USD y se cobran en Bolívares (Bs.) al tipo de cambio oficial de referencia del Banco Central de Venezuela (BCV) vigente al momento del pago, más el IVA correspondiente.
      </p>
    </section>
  );
}
