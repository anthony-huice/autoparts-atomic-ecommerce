"use client";

import { useState } from "react";

export function ConfirmacionVentaModal({
  onConfirmar,
  onCancelar,
  loading,
}: {
  onConfirmar: (razon: string) => void;
  onCancelar: () => void;
  loading: boolean;
}) {
  const [razon, setRazon] = useState("");

  const opciones = [
    "Lo vendí gracias a la plataforma",
    "Lo vendí por otros medios",
    "Decidí no venderlo",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white p-6 max-w-md w-full mx-4 rounded-none border border-slate-200 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-900 mb-4">¿Qué pasó con tu publicación?</h3>
        <div className="space-y-3 mb-6">
          {opciones.map((opcion) => (
            <label
              key={opcion}
              className={`flex items-center p-4 border cursor-pointer transition-colors rounded-none ${
                razon === opcion
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 hover:border-blue-400"
              }`}
            >
              <input
                type="radio"
                name="razon"
                value={opcion}
                checked={razon === opcion}
                onChange={(e) => setRazon(e.target.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-none"
              />
              <span className="ml-3 text-sm font-medium text-slate-900">{opcion}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors rounded-none disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(razon)}
            disabled={!razon || loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors rounded-none disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
