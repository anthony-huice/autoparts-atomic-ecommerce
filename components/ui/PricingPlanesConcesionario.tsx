"use client";

/**
 * PricingPlanesConcesionario.tsx
 * Componente de selección de plan de suscripción mensual/periódica para Concesionarios y Aliados Comerciales.
 *
 * Tres planes:
 *   - BASICO:     Gratis · 15 días por carro · máx 4 fotos · renovación $1 USD c/u
 *   - DESTACADO:  $20 USD + IVA · 45 días por carro · máx 6 fotos · hasta 10 vehículos · soporte prioritario
 *   - PREMIUM:    $50 USD + IVA · 2 meses (60 días) por carro · máx 12 fotos · hasta 30 vehículos · exposición máxima banner · notificaciones push · sello de confianza · estadísticas
 *
 * Estilo:           Bordes 101% cuadrados (rounded-none), alto contraste, tipografía Inter.
 */

import { Check, Star, Camera, Clock, BarChart2, ShieldCheck, Zap, Award, Bell } from "lucide-react";

export type TipoPlanConcesionario = "DESTACADO" | "PREMIUM";

interface PricingPlanesConcesionarioProps {
  planSeleccionado: TipoPlanConcesionario;
  onSeleccionar: (plan: TipoPlanConcesionario) => void;
  porcentajeIva?: number;
}

function precioConIva(base: number, porcentaje: number): string {
  const total = base + base * (porcentaje / 100);
  return total.toFixed(2);
}

interface Feature {
  icono: React.ReactNode;
  texto: string;
  destacado?: boolean;
}

const featuresDestacado: Feature[] = [
  { icono: <Clock className="w-4 h-4" />,        texto: "45 días de vigencia por anuncio",      destacado: true },
  { icono: <Camera className="w-4 h-4" />,       texto: "Hasta 6 fotografías por vehículo",     destacado: true },
  { icono: <Check className="w-4 h-4" />,        texto: "Publicación de hasta 10 vehículos",    destacado: true },
  { icono: <Zap className="w-4 h-4" />,          texto: "Etiqueta Destacado en catálogo",       destacado: true },
  { icono: <Check className="w-4 h-4" />,        texto: "Soporte prioritario",                  destacado: true },
];

const featuresPremium: Feature[] = [
  { icono: <Clock className="w-4 h-4" />,        texto: "2 meses de vigencia por anuncio",      destacado: true },
  { icono: <Camera className="w-4 h-4" />,       texto: "Hasta 12 fotografías por vehículo",    destacado: true },
  { icono: <Check className="w-4 h-4" />,        texto: "Publicación de hasta 30 vehículos",    destacado: true },
  { icono: <Zap className="w-4 h-4" />,          texto: "Exposición máxima (banners premium)",  destacado: true },
  { icono: <Bell className="w-4 h-4" />,         texto: "Envío de notificaciones push",         destacado: true },
  { icono: <ShieldCheck className="w-4 h-4" />,  texto: "Sello Vendedor Confiable",             destacado: true },
  { icono: <BarChart2 className="w-4 h-4" />,    texto: "Estadísticas avanzadas de visitas",    destacado: true },
];

export function PricingPlanesConcesionario({
  planSeleccionado,
  onSeleccionar,
  porcentajeIva = 16,
}: PricingPlanesConcesionarioProps) {
  const precioDestacadoTotal = precioConIva(20, porcentajeIva);
  const precioPremiumTotal = precioConIva(50, porcentajeIva);

  return (
    <section aria-labelledby="pricing-concesionario-heading" className="w-full">
      <div className="mb-8 text-center">
        <h2 id="pricing-concesionario-heading" className="text-2xl font-bold text-slate-900 tracking-tight">
          Elige el plan para tu Concesionario / Empresa
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto">
          Gestiona tu inventario con total flexibilidad. Los montos se facturan en USD y son cobrados en Bolívares (Bs.) a la tasa oficial del Banco Central de Venezuela (BCV) del día más su respectivo IVA ({porcentajeIva}%).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
        
        {/* Plan Destacado */}
        <div
          role="radio"
          aria-checked={planSeleccionado === "DESTACADO"}
          tabIndex={0}
          onClick={() => onSeleccionar("DESTACADO")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSeleccionar("DESTACADO")}
          className={[
            "relative flex flex-col rounded-none border-2 p-6 cursor-pointer bg-white transition-shadow duration-200",
            planSeleccionado === "DESTACADO" ? "border-blue-800 shadow-md" : "border-slate-200 hover:border-slate-400 hover:shadow-sm"
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className={[
              "absolute top-4 right-4 w-5 h-5 rounded-none border-2 flex items-center justify-center",
              planSeleccionado === "DESTACADO" ? "border-blue-800 bg-blue-800" : "border-slate-300"
            ].join(" ")}
          >
            {planSeleccionado === "DESTACADO" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>

          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">El equilibrio perfecto entre rapidez y precio</p>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Plan Destacado</h3>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-black text-slate-900">$20</span>
            <span className="text-sm font-semibold text-slate-500">USD / 45 días</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">Total con IVA: <strong className="text-slate-700">${precioDestacadoTotal} USD</strong> (cobrado en Bs. a la tasa BCV del día)</p>

          <div className="w-full h-px bg-slate-100 mb-4" />

          <ul className="flex flex-col gap-2.5 flex-1 mb-6 text-sm text-slate-700">
            {featuresDestacado.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-800 mt-0.5 shrink-0">{f.icono}</span>
                <span>{f.texto}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSeleccionar("DESTACADO"); }}
            className={[
              "mt-auto w-full py-2.5 px-4 rounded-none font-semibold text-xs transition-colors duration-150",
              planSeleccionado === "DESTACADO" ? "bg-blue-800 text-white hover:bg-blue-900" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            ].join(" ")}
          >
            {planSeleccionado === "DESTACADO" ? "Plan seleccionado ✓" : "Seleccionar Plan Destacado"}
          </button>
        </div>

        {/* Plan Premium */}
        <div
          role="radio"
          aria-checked={planSeleccionado === "PREMIUM"}
          tabIndex={0}
          onClick={() => onSeleccionar("PREMIUM")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSeleccionar("PREMIUM")}
          className={[
            "relative flex flex-col rounded-none border-2 p-6 cursor-pointer bg-white transition-shadow duration-200",
            planSeleccionado === "PREMIUM" ? "border-amber-500 shadow-lg" : "border-slate-200 hover:border-slate-400 hover:shadow-sm"
          ].join(" ")}
        >
          <span
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5
                       bg-amber-400 text-amber-950 text-[10px] font-black
                       uppercase tracking-wider rounded-none whitespace-nowrap"
          >
            <Star className="inline w-3 h-3 mr-1 -mt-0.5" />
            Exposición Máxima
          </span>

          <span
            aria-hidden="true"
            className={[
              "absolute top-4 right-4 w-5 h-5 rounded-none border-2 flex items-center justify-center",
              planSeleccionado === "PREMIUM" ? "border-amber-500 bg-amber-500" : "border-slate-300"
            ].join(" ")}
          >
            {planSeleccionado === "PREMIUM" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>

          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 mt-2">Vende tu vehículo a la velocidad de la luz</p>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Plan Premium</h3>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-black text-slate-900">$50</span>
            <span className="text-sm font-semibold text-slate-500">USD / 2 meses</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">Total con IVA: <strong className="text-slate-700">${precioPremiumTotal} USD</strong> (cobrado en Bs. a la tasa BCV del día)</p>

          <div className="w-full h-px bg-slate-100 mb-4" />

          <ul className="flex flex-col gap-2.5 flex-1 mb-6 text-sm text-slate-700">
            {featuresPremium.map((f, i) => (
              <li key={i} className="flex items-start gap-2 font-medium">
                <span className="text-amber-500 mt-0.5 shrink-0">{f.icono}</span>
                <span>{f.texto}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSeleccionar("PREMIUM"); }}
            className={[
              "mt-auto w-full py-2.5 px-4 rounded-none font-semibold text-xs transition-colors duration-150",
              planSeleccionado === "PREMIUM" ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            ].join(" ")}
          >
            {planSeleccionado === "PREMIUM" ? "Plan seleccionado ✓" : "Seleccionar Plan Premium"}
          </button>
        </div>

      </div>

      <p className="mt-6 text-center text-xs text-slate-500 max-w-2xl mx-auto">
        Los cobros se debitarán de tu saldo o método de pago al iniciar el ciclo correspondiente (45 días o 2 meses según el plan). Todos los montos están expresados en USD y son cobrados en Bolívares (Bs.) a la tasa oficial de referencia del Banco Central de Venezuela (BCV) del día del pago más su respectivo IVA.
      </p>
    </section>
  );
}
