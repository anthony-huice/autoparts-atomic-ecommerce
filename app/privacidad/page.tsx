import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, FileCheck, EyeOff, UserCog } from "lucide-react";

export const metadata: Metadata = {
  title: "Centro de Privacidad - AutoParts Pro",
  description: "Conoce cómo protegemos tus datos, prevenimos fraudes y garantizamos conexiones seguras en AutoParts Pro.",
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-start">
      {/* HERO (Cabecera) */}
      <section className="bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 text-center rounded-none">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4 uppercase">
            Centro de Privacidad
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto font-medium">
            Tus datos son el motor de tu negocio. Protegerlos es el nuestro.
          </p>
        </div>
      </section>

      {/* GRID DE TARJETAS (Cuerpo de la página) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Tarjeta 1 */}
          <div className="bg-white border border-slate-200 p-8 flex flex-col items-start rounded-none shadow-sm transition-shadow duration-150 hover:shadow-md">
            <div className="p-3 bg-blue-50 text-[#1e40af] rounded-none mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">No vendemos tus datos</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tu información es exclusivamente para conectar compradores y vendedores en AutoParts Pro. Jamás comercializaremos tu base de clientes o historial con terceros.
            </p>
          </div>

          {/* Tarjeta 2 */}
          <div className="bg-white border border-slate-200 p-8 flex flex-col items-start rounded-none shadow-sm transition-shadow duration-150 hover:shadow-md">
            <div className="p-3 bg-blue-50 text-[#1e40af] rounded-none mb-6">
              <FileCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Prevención de Fraudes</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Las verificaciones de identidad y empresa (KYC) garantizan que negocias con personas y concesionarios reales, manteniendo a los estafadores fuera de la plataforma.
            </p>
          </div>

          {/* Tarjeta 3 */}
          <div className="bg-white border border-slate-200 p-8 flex flex-col items-start rounded-none shadow-sm transition-shadow duration-150 hover:shadow-md">
            <div className="p-3 bg-blue-50 text-[#1e40af] rounded-none mb-6">
              <EyeOff className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Conexiones Seguras</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tú decides qué información pública mostrar en tus vehículos. Los datos críticos de tu empresa están encriptados y protegidos con los más altos estándares.
            </p>
          </div>

          {/* Tarjeta 4 */}
          <div className="bg-white border border-slate-200 p-8 flex flex-col items-start rounded-none shadow-sm transition-shadow duration-150 hover:shadow-md">
            <div className="p-3 bg-blue-50 text-[#1e40af] rounded-none mb-6">
              <UserCog className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Control Total (Derechos ARCO)</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Eres el dueño de tu información. Puedes editar, solicitar una copia o eliminar permanentemente tu cuenta y tu inventario completo en el momento que lo desees.
            </p>
          </div>
        </div>

        {/* FOOTER DE LA SECCIÓN */}
        <div className="mt-12 text-center border-t border-slate-200 pt-8">
          <p className="text-sm text-slate-500">
            ¿Necesitas los detalles técnicos?{" "}
            <Link
              id="link-declaracion-legal-privacidad"
              href="/privacidad/legal"
              className="text-[#1e40af] font-semibold hover:underline"
            >
              Lee nuestra Declaración de Privacidad Legal Completa
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
