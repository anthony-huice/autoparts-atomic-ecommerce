"use client";
import * as React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  className,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0">
      {" "}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />{" "}
      <div
        className={cn(
          "relative z-50 w-full max-w-lg rounded-none bg-white border border-gray-200 p-6 animate-in fade-in zoom-in-95 duration-200",
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {" "}
        {title && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            {" "}
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>{" "}
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-none text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            >
              {" "}
              <X className="h-5 w-5" />{" "}
              <span className="sr-only">Cerrar</span>{" "}
            </button>{" "}
          </div>
        )}{" "}
        {!title && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 h-8 w-8 inline-flex items-center justify-center rounded-none text-gray-500 hover:text-gray-900 hover:bg-gray-100 bg-white/80 backdrop-blur"
          >
            {" "}
            <X className="h-5 w-5" />{" "}
            <span className="sr-only">Cerrar</span>{" "}
          </button>
        )}{" "}
        <div className="mt-2"> {children} </div>{" "}
      </div>{" "}
    </div>,
    document.body,
  );
}
