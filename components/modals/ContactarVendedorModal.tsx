"use client";
import { useUIStore } from "@/store/useUIStore";
import { useEffect } from "react";
export function ContactarVendedorModal() {
  const { isContactModalOpen, selectedVendorData, closeContactModal } =
    useUIStore();
  /* Prevenir scroll en el body cuando el modal está abierto */ useEffect(() => {
    if (isContactModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isContactModalOpen]);
  if (!isContactModalOpen || !selectedVendorData) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {" "}
      {/* Backdrop (Cierra al hacer click fuera) */}{" "}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={closeContactModal}
      />{" "}
      {/* Contenedor del Modal */}{" "}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-none bg-white p-6 text-left align-middle transition-all">
        {" "}
        {/* Botón cerrar */}{" "}
        <button
          onClick={closeContactModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-none transition-colors"
        >
          {" "}
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {" "}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />{" "}
          </svg>{" "}
        </button>{" "}
        <h3 className="text-xl font-bold leading-6 text-slate-900 mb-2">
          {" "}
          Contactar al Vendedor{" "}
        </h3>{" "}
        <div className="flex items-center gap-3 mb-6 mt-4 p-4 bg-slate-50 rounded-none border border-slate-100">
          {" "}
          <div className="w-12 h-12 rounded-none bg-blue-100 flex items-center justify-center flex-shrink-0">
            {" "}
            <span className="text-xl font-bold text-blue-600">
              {" "}
              {selectedVendorData.nombre.charAt(0).toUpperCase()}{" "}
            </span>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="font-bold text-slate-900 leading-tight">
              {" "}
              {selectedVendorData.nombre}{" "}
            </p>{" "}
            <p className="text-sm text-slate-500">
              {" "}
              {selectedVendorData.tipo === "PARTICULAR"
                ? "Vendedor Particular"
                : "Concesionario / Aliado"}{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-4">
          {" "}
          {selectedVendorData.telefonos &&
            selectedVendorData.telefonos.length > 0 && (
              <div>
                {" "}
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Teléfonos disponibles:
                </p>{" "}
                <div className="space-y-2">
                  {" "}
                  {selectedVendorData.telefonos.map((t, i) => (
                    <a
                      key={i}
                      href={`https:/* wa.me/${t.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full p-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-none transition-colors font-medium"
                    >
                      {" "}
                      */{" "}
                      <span className="flex items-center gap-2">
                        {" "}
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {" "}
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />{" "}
                        </svg>{" "}
                        {t}{" "}
                      </span>{" "}
                      <span>Chat &rarr;</span>{" "}
                    </a>
                  ))}{" "}
                </div>{" "}
              </div>
            )}{" "}
          {selectedVendorData.correo && (
            <div className="pt-2">
              {" "}
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Correo electrónico:
              </p>{" "}
              <a
                href={`mailto:${selectedVendorData.correo}`}
                className="flex items-center justify-between w-full p-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-none transition-colors font-medium break-all"
              >
                {" "}
                <span className="flex items-center gap-2">
                  {" "}
                  <svg
                    className="w-5 h-5 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {" "}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />{" "}
                  </svg>{" "}
                  {selectedVendorData.correo}{" "}
                </span>{" "}
              </a>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
