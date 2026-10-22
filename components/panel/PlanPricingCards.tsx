"use client";

import { Check } from "lucide-react";

interface PlanPricingCardsProps {
  planActual: string;
  tipoEmpresa: string;
  onUpgrade: (plan: string) => void;
  isSubmitting: boolean;
}

export function PlanPricingCards({ planActual, tipoEmpresa, onUpgrade, isSubmitting }: PlanPricingCardsProps) {
  if (tipoEmpresa === 'ALIADO_COMERCIAL') {
    const isBronce = planActual === "BRONCE";
    const isPlata = planActual === "PLATA";
    const isOro = planActual === "ORO";

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Tarjeta Plan Bronce */}
        <div className={`border p-8 flex flex-col justify-between rounded-none ${isBronce ? 'border-orange-600 bg-orange-50/30' : 'border-gray-200 bg-white'}`}>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1 uppercase">Plan Bronce</h3>
            <div className="text-4xl font-bold text-orange-600 mt-4 mb-2">$5<span className="text-sm font-normal text-gray-500"> /mes</span></div>
            <p className="text-sm font-semibold text-gray-700 mb-8">Duración: 30 días</p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-600 shrink-0" />
                <span className="text-gray-700">Hasta <strong>20 repuestos</strong> activos</span>
              </li>
            </ul>
          </div>
          
          {isBronce ? (
            <button className="w-full py-4 px-4 bg-gray-100 text-orange-800 font-bold uppercase rounded-none cursor-default border border-orange-200" disabled>
              Plan Actual Activo
            </button>
          ) : (
            <button 
              onClick={() => onUpgrade("BRONCE")}
              disabled={isSubmitting || isPlata || isOro}
              className={`w-full py-4 px-4 font-bold uppercase rounded-none transition-colors border ${isPlata || isOro ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-orange-600 border-orange-600 hover:bg-orange-50'}`}
            >
              {isSubmitting ? "Procesando..." : "Seleccionar Bronce"}
            </button>
          )}
        </div>

        {/* Tarjeta Plan Plata */}
        <div className={`border-2 p-8 flex flex-col justify-between rounded-none ${isPlata ? 'border-slate-500 bg-slate-50/50 shadow-md' : 'border-gray-200 bg-white'}`}>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1 uppercase">Plan Plata</h3>
            <div className="text-4xl font-bold text-slate-600 mt-4 mb-2">$15<span className="text-sm font-normal text-gray-500"> /2 meses</span></div>
            <p className="text-sm font-semibold text-gray-700 mb-8">Duración: 60 días</p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-600 shrink-0" />
                <span className="text-gray-700">Hasta <strong>50 repuestos</strong> activos</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-600 shrink-0" />
                <span className="text-gray-700">Botón directo a <strong>WhatsApp comercial</strong></span>
              </li>
            </ul>
          </div>
          
          {isPlata ? (
            <button className="w-full py-4 px-4 bg-gray-100 text-slate-800 font-bold uppercase rounded-none cursor-default border border-slate-200" disabled>
              Plan Actual Activo
            </button>
          ) : (
            <button 
              onClick={() => onUpgrade("PLATA")}
              disabled={isSubmitting || isOro}
              className={`w-full py-4 px-4 font-bold uppercase rounded-none transition-colors border ${isOro ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-600 hover:bg-slate-50'}`}
            >
              {isSubmitting ? "Procesando..." : "Seleccionar Plata"}
            </button>
          )}
        </div>

        {/* Tarjeta Plan Oro */}
        <div className={`border-2 p-8 flex flex-col justify-between rounded-none relative overflow-hidden ${isOro ? 'border-yellow-500 bg-yellow-50/30 shadow-xl' : 'border-gray-800 bg-white shadow-lg'}`}>
          {!isOro && (
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-4 py-1.5 uppercase tracking-widest rounded-none">
              Recomendado
            </div>
          )}
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-1 uppercase">Plan Oro</h3>
            <div className="text-4xl font-extrabold text-yellow-600 mt-4 mb-2">$30<span className="text-sm font-normal text-gray-500"> /3 meses</span></div>
            <p className="text-sm font-semibold text-gray-700 mb-8">Duración: 90 días</p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-900 shrink-0" />
                <span className="text-gray-900 font-medium">Repuestos <strong>ilimitados</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-900 shrink-0" />
                <span className="text-gray-900 font-medium">Botón directo a <strong>WhatsApp comercial</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-900 shrink-0" />
                <span className="text-gray-900 font-medium"><strong>Destacados automáticos</strong> semanales</span>
              </li>
            </ul>
          </div>
          
          {isOro ? (
            <button className="w-full py-4 px-4 bg-yellow-100 text-yellow-900 font-bold uppercase rounded-none cursor-default shadow-sm border border-yellow-300" disabled>
              Plan Actual Activo
            </button>
          ) : (
            <button 
              onClick={() => onUpgrade("ORO")}
              disabled={isSubmitting}
              className="w-full py-4 px-4 bg-yellow-500 text-black font-bold uppercase rounded-none hover:bg-yellow-400 transition-colors shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Procesando..." : "Mejorar a Oro"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Concesionario Plans
  const isDestacado = planActual === "DESTACADO";
  const isPremium = planActual === "PREMIUM";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {/* Tarjeta Plan Destacado */}
      <div className={`border p-8 flex flex-col justify-between rounded-none ${isDestacado ? 'border-blue-600 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1 uppercase">Plan Destacado</h3>
          <p className="text-sm font-medium text-gray-500 mb-6 italic">"El equilibrio perfecto entre rapidez y precio"</p>
          <div className="text-4xl font-bold text-blue-600 mb-2">$20<span className="text-sm font-normal text-gray-500"> + IVA</span></div>
          <p className="text-sm font-semibold text-gray-700 mb-8">Duración: 45 días</p>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700">Hasta <strong>10 vehículos</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700">Hasta <strong>6 fotos</strong> por vehículo</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700">Primeras posiciones de búsqueda</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700">Etiqueta de <strong>"Destacado"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700">Soporte técnico prioritario</span>
            </li>
          </ul>
        </div>
        
        {isDestacado ? (
          <button className="w-full py-4 px-4 bg-gray-100 text-blue-800 font-bold uppercase rounded-none cursor-default border border-blue-200" disabled>
            Plan Actual Activo
          </button>
        ) : (
          <button 
            onClick={() => onUpgrade("DESTACADO")}
            disabled={isSubmitting || isPremium}
            className={`w-full py-4 px-4 font-bold uppercase rounded-none transition-colors border ${isPremium ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
          >
            {isSubmitting ? "Procesando..." : "Seleccionar Destacado"}
          </button>
        )}
      </div>

      {/* Tarjeta Plan Premium */}
      <div className={`border-2 p-8 flex flex-col justify-between rounded-none relative overflow-hidden ${isPremium ? 'border-blue-800 bg-white shadow-xl' : 'border-gray-800 bg-white shadow-lg'}`}>
        {!isPremium && (
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 uppercase tracking-widest rounded-none">
            Recomendado
          </div>
        )}
        
        <div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-1 uppercase">Plan Premium</h3>
          <p className="text-sm font-medium text-gray-500 mb-6 italic">"Vende tu vehículo a la velocidad de la luz"</p>
          <div className="text-4xl font-extrabold text-gray-900 mb-2">$50<span className="text-sm font-normal text-gray-500"> + IVA</span></div>
          <p className="text-sm font-semibold text-gray-700 mb-8">Duración: 60 días (2 meses)</p>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-gray-900 shrink-0" />
              <span className="text-gray-900 font-medium">Hasta <strong>30 vehículos</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-gray-900 shrink-0" />
              <span className="text-gray-900 font-medium">Hasta <strong>12 fotos</strong> por vehículo</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-gray-900 shrink-0" />
              <span className="text-gray-900 font-medium">Exposición máxima en banner principal</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-gray-900 shrink-0" />
              <span className="text-gray-900 font-medium">Notificación Push a interesados</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-gray-900 shrink-0" />
              <span className="text-gray-900 font-medium">Sello de <strong>"Vendedor Confiable"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-gray-900 shrink-0" />
              <span className="text-gray-900 font-medium">Estadísticas de visualización</span>
            </li>
          </ul>
        </div>
        
        {isPremium ? (
          <button className="w-full py-4 px-4 bg-gray-900 text-white font-bold uppercase rounded-none cursor-default shadow-md" disabled>
            Plan Actual Activo
          </button>
        ) : (
          <button 
            onClick={() => onUpgrade("PREMIUM")}
            disabled={isSubmitting}
            className="w-full py-4 px-4 bg-gray-900 text-white font-bold uppercase rounded-none hover:bg-black transition-colors shadow-md disabled:opacity-50"
          >
            {isSubmitting ? "Procesando..." : "Mejorar a Premium"}
          </button>
        )}
      </div>
    </div>
  );
}
