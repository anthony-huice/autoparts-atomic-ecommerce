"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
export function PublicFooter() {
  const pathname = usePathname();

  /* Ocultar el Footer en rutas específicas */
  if (
    pathname.startsWith("/panel-aliado") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <footer className="w-full bg-white border-t border-gray-200 pt-6 pb-8">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
        {/* Bloque Izquierdo */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex gap-4 flex-wrap justify-center md:justify-start">
            <Link href="/terminos" className="text-[13px] text-gray-800 font-medium hover:text-gray-500 transition-colors">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="text-[13px] text-gray-800 font-medium hover:text-gray-500 transition-colors">
              Cómo cuidamos tu privacidad
            </Link>
            <Link href="/ayuda" className="text-[13px] text-gray-800 font-medium hover:text-gray-500 transition-colors">
              Ayuda
            </Link>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Copyright © 2024-2026 AutoParts Pro. Todos los derechos reservados.
          </p>
        </div>

        {/* Bloque Derecho */}
        <div className="flex items-center">
          <Image
            src="/autoparts-pro-logo.svg"
            alt="AutoParts Pro Logo"
            width={280}
            height={280}
            className="h-16 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
          />
        </div>
      </div>
    </footer>
  );
}
