"use client";
import { useUIStore } from "@/store/useUIStore";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
export function LoginPromptModal() {
  const { isLoginPromptOpen, closeLoginPrompt, openAuthModal } = useUIStore();
  /* Prevenir scroll en el body cuando el modal está abierto */ useEffect(() => {
    if (isLoginPromptOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isLoginPromptOpen]);
  if (!isLoginPromptOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {" "}
      {/* Backdrop */}{" "}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={closeLoginPrompt}
      />{" "}
      {/* Contenedor del Modal */}{" "}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-none bg-white p-6 md:p-8 text-center transition-all">
        {" "}
        {/* Botón cerrar */}{" "}
        <button
          onClick={closeLoginPrompt}
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
        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-none flex items-center justify-center mb-6 mt-2">
          {" "}
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {" "}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />{" "}
          </svg>{" "}
        </div>{" "}
        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
          {" "}
          ¡Únete a la comunidad!{" "}
        </h3>{" "}
        <p className="text-slate-600 mb-8 leading-relaxed">
          {" "}
          Para poder{" "}
          <span className="font-semibold text-slate-800">
            guardar tus vehículos favoritos
          </span>{" "}
          o{" "}
          <span className="font-semibold text-slate-800">
            contactar directamente a los vendedores
          </span>
          , necesitas tener una cuenta. ¡Es gratis y rápido!{" "}
        </p>{" "}
        <div className="flex flex-col gap-3">
          {" "}
          <button
            onClick={() => {
              closeLoginPrompt();
              openAuthModal("login");
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-none transition-colors "
          >
            {" "}
            Iniciar Sesión{" "}
          </button>{" "}
          <button
            onClick={() => {
              closeLoginPrompt();
              openAuthModal("registro");
            }}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold py-3 px-4 rounded-none transition-colors"
          >
            {" "}
            Crear Cuenta Nueva{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
