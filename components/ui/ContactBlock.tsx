"use client";

import { useUIStore, type VendorData } from "@/store/useUIStore";
import { useSession } from "@/hooks/useSession";

interface ContactBlockProps {
  vendorInfo: VendorData;
}
export function ContactBlock({ vendorInfo }: ContactBlockProps) {
  const { openContactModal, openAuthModal } = useUIStore();
  const { data: user, isLoading } = useSession();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-none bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-slate-400">
            {vendorInfo.nombre.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-bold text-slate-900 leading-tight">
            {vendorInfo.nombre}
          </p>
          <p className="text-sm text-slate-500">
            {vendorInfo.tipo === "PARTICULAR"
              ? "Vendedor Particular"
              : "Concesionario / Aliado"}
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          if (isLoading) return;
          if (!user) {
            openAuthModal("login");
          } else {
            openContactModal(vendorInfo);
          }
        }}
        disabled={isLoading}
        className={`w-full flex items-center justify-center py-4 bg-[#3483fa] hover:bg-blue-600 text-white font-semibold rounded-none transition-colors gap-2 ${isLoading ? "opacity-70 cursor-wait" : ""}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        Contactar al Vendedor
      </button>
    </div>
  );
}
