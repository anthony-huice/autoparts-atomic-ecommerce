"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Eye, AlertCircle } from "lucide-react";
import { getComprobanteUrlAction, aprobarPagoAction, rechazarPagoAction } from "./actions";
import { Button } from "@/components/ui/button";

interface SolicitudPago {
  id: string;
  usuario_id: string;
  comprobante_url: string;
  emisor: string;
  referencia: string;
  fecha_pago: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  personas?: {
    nombres: string;
    apellidos: string;
    correo: string;
  };
}

export function PagosTable({ solicitudes }: { solicitudes: SolicitudPago[] }) {
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudPago | null>(null);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [rechazarMotivo, setRechazarMotivo] = useState("");
  const [isRechazando, setIsRechazando] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleVerComprobante = async (solicitud: SolicitudPago) => {
    setSelectedSolicitud(solicitud);
    setComprobanteUrl(null);
    setIsLoadingImage(true);
    setRechazarMotivo("");
    setIsRechazando(false);
    
    const res = await getComprobanteUrlAction(solicitud.id, solicitud.comprobante_url);
    setIsLoadingImage(false);
    
    if (res.error) {
      showToast(res.error, "error");
    } else if (res.url) {
      setComprobanteUrl(res.url);
    }
  };

  const handleAprobar = async () => {
    if (!selectedSolicitud) return;
    setIsProcessing(true);
    const res = await aprobarPagoAction(selectedSolicitud.id);
    setIsProcessing(false);

    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast("Pago aprobado exitosamente", "success");
      setSelectedSolicitud(null);
    }
  };

  const handleRechazar = async () => {
    if (!selectedSolicitud) return;
    if (!rechazarMotivo.trim()) {
      showToast("Debes ingresar un motivo de rechazo", "error");
      return;
    }
    
    setIsProcessing(true);
    const res = await rechazarPagoAction(selectedSolicitud.id, rechazarMotivo);
    setIsProcessing(false);

    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast("Pago rechazado", "success");
      setSelectedSolicitud(null);
    }
  };

  return (
    <div className="w-full">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 z-50 text-white rounded-none shadow-lg flex items-center gap-3 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Tabla de Pagos */}
      <div className="overflow-x-auto border border-gray-200 bg-white shadow-sm rounded-none">
        <table className="w-full text-left text-sm text-gray-700">
          <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-bold text-gray-500">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Emisor</th>
              <th className="px-6 py-4">Referencia</th>
              <th className="px-6 py-4">Fecha Pago</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {solicitudes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                  No hay solicitudes de pago pendientes.
                </td>
              </tr>
            ) : (
              solicitudes.map((sol) => (
                <tr key={sol.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{sol.personas?.nombres} {sol.personas?.apellidos}</div>
                    <div className="text-gray-500 text-xs">{sol.personas?.correo}</div>
                  </td>
                  <td className="px-6 py-4 font-medium uppercase">{sol.emisor}</td>
                  <td className="px-6 py-4 font-mono">{sol.referencia}</td>
                  <td className="px-6 py-4">{new Date(sol.fecha_pago).toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <Button 
                      onClick={() => handleVerComprobante(sol)}
                      className="rounded-none bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Ver / Procesar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Procesamiento */}
      {selectedSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 shadow-2xl rounded-none w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold uppercase tracking-tight">Procesar Pago: {selectedSolicitud.referencia}</h2>
              <button 
                onClick={() => setSelectedSolicitud(null)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
                disabled={isProcessing}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-100">
              {isLoadingImage ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="text-sm font-medium">Obteniendo comprobante seguro...</p>
                </div>
              ) : comprobanteUrl ? (
                <div className="flex justify-center border-4 border-white shadow-md bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comprobanteUrl} alt="Comprobante de pago" className="max-w-full max-h-[50vh] object-contain rounded-none" />
                </div>
              ) : (
                <div className="py-20 text-center text-red-500 flex flex-col items-center">
                  <AlertCircle className="w-10 h-10 mb-4" />
                  <p className="text-sm font-medium">No se pudo cargar el comprobante.</p>
                </div>
              )}
              
              <div className="mt-6 bg-white p-4 border border-gray-200 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500 text-xs font-bold uppercase mb-1">Usuario</span>
                  <span className="font-semibold text-gray-900">{selectedSolicitud.personas?.nombres} {selectedSolicitud.personas?.apellidos}</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-xs font-bold uppercase mb-1">Correo</span>
                  <span className="font-semibold text-gray-900">{selectedSolicitud.personas?.correo}</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-xs font-bold uppercase mb-1">Emisor</span>
                  <span className="font-semibold text-gray-900 uppercase">{selectedSolicitud.emisor}</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-xs font-bold uppercase mb-1">Referencia</span>
                  <span className="font-mono font-semibold text-gray-900">{selectedSolicitud.referencia}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              {isRechazando ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase mb-2">Motivo de Rechazo</label>
                    <textarea 
                      className="w-full border border-gray-300 p-3 rounded-none focus:ring-2 focus:ring-red-600 outline-none text-sm"
                      rows={3}
                      placeholder="Indique por qué este pago es inválido..."
                      value={rechazarMotivo}
                      onChange={(e) => setRechazarMotivo(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleRechazar}
                      disabled={isProcessing || !rechazarMotivo.trim()}
                      className="rounded-none bg-red-600 hover:bg-red-700 text-white font-bold w-full uppercase tracking-wider"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Confirmar Rechazo
                    </Button>
                    <Button 
                      onClick={() => setIsRechazando(false)}
                      disabled={isProcessing}
                      className="rounded-none bg-gray-200 text-gray-800 hover:bg-gray-300 font-bold w-full uppercase tracking-wider"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Button 
                    onClick={handleAprobar}
                    disabled={isProcessing || !comprobanteUrl}
                    className="flex-1 rounded-none bg-green-600 hover:bg-green-700 text-white h-12 font-bold uppercase tracking-wider text-sm"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Aprobar Pago
                  </Button>
                  <Button 
                    onClick={() => setIsRechazando(true)}
                    disabled={isProcessing}
                    className="flex-1 rounded-none bg-red-600 hover:bg-red-700 text-white h-12 font-bold uppercase tracking-wider text-sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
