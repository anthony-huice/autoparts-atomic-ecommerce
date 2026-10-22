"use client";

import { useTransition, useState } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { moderarPublicacion } from "./actions";

export default function DeletePublicationButton({
  id,
  tipo,
  empresaId,
}: {
  id: string;
  tipo: "vehiculo" | "repuesto";
  empresaId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setConfirmText("");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setConfirmText("");
  };

  const handleConfirmDelete = () => {
    if (confirmText.trim().toLowerCase() !== "eliminar") return;
    
    startTransition(async () => {
      try {
        await moderarPublicacion(id, tipo, empresaId);
        setIsModalOpen(false);
      } catch (error) {
        console.error(error);
        alert("Error al eliminar la publicación");
      }
    });
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleOpenModal();
        }}
        disabled={isPending}
        title="Eliminar por Infracción"
        className="p-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-none flex items-center transition-colors shrink-0 disabled:opacity-50"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 shadow-2xl rounded-none w-full max-w-md overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-wider text-sm">
                  Eliminar Publicación
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isPending}
                className="text-red-400 hover:text-red-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">
                Estás a punto de eliminar esta publicación por infracción a las normas. Esta acción ocultará la publicación del catálogo público.
              </p>
              
              <label className="block mb-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                Escribe "eliminar" para confirmar:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="eliminar"
                disabled={isPending}
                className="w-full border border-gray-300 rounded-none px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all bg-gray-50"
              />
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={isPending}
                className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-none hover:bg-gray-100 transition-colors disabled:opacity-50 uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isPending || confirmText.trim().toLowerCase() !== "eliminar"}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 border border-red-600 rounded-none hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-wider"
              >
                {isPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isPending ? "Eliminando..." : "Sí, Eliminar Publicación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
