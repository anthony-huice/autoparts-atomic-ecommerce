import { PaymentForm } from "@/components/pagos/PaymentForm";
import { RecruiterSandboxCheckout } from "@/components/ui/RecruiterSandboxCheckout";
import { Landmark, Smartphone } from "lucide-react";

export const metadata = {
  title: "Checkout & Reporte de Pago - AutoParts Pro",
  description: "Checkout transaccional y simulación de concurrencia en AutoParts Pro",
};

export default function PagosPage() {
  return (
    <main className="min-h-screen bg-[#ebebeb] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-start items-center">
      
      {/* Encabezado */}
      <div className="text-center max-w-2xl mx-auto w-full">
        <span className="text-xs font-bold uppercase tracking-widest text-[#1e40af] bg-blue-50 px-3 py-1 border border-blue-200 rounded-none inline-block mb-3">
          Checkout Transaccional
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
          Checkout &amp; Conciliación de Orden
        </h1>
        <p className="text-sm text-slate-600">
          Prueba el bloqueo atómico de inventario en tiempo real (Recruiter Sandbox Mode) o procesa una orden de pago.
        </p>
      </div>

      <div className="max-w-6xl mx-auto w-full mt-8">
        <RecruiterSandboxCheckout
          repuestoId="00000000-0000-0000-0000-000000000986"
          nombreRepuesto="Juego de Pastillas de Freno Cerámicas Delanteras QuietCast (Bosch)"
          sku="BRK-BOSCH-0986"
          precioUsd={54.0}
          initialStock={2}
        />
      </div>

      {/* Grid Layout de Dos Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto w-full mt-8">
        
        {/* Columna Izquierda: Instrucciones y Datos Bancarios */}
        <div className="flex flex-col gap-4 order-1">
          <div className="bg-[#1e40af] p-4 rounded-none shadow-sm text-white">
            <h2 className="text-lg font-bold uppercase tracking-wide">Datos para el Pago</h2>
            <p className="text-sm mt-1 text-blue-100">Despliega la opción que prefieras usar.</p>
          </div>

          <details className="bg-white border border-gray-200 shadow-sm rounded-none group cursor-pointer" open>
            <summary className="p-4 bg-gray-50 font-bold text-gray-900 uppercase tracking-tight flex items-center gap-3 border-b border-gray-200 rounded-none list-none marker:hidden">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Pago Móvil
              <span className="ml-auto text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-6 bg-white space-y-3 text-sm rounded-none">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold uppercase">Banco</span>
                <span className="text-gray-900 font-bold">Banesco (0134)</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold uppercase">Teléfono</span>
                <span className="text-gray-900 font-bold font-mono">0414-1234567</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500 font-semibold uppercase">Cédula</span>
                <span className="text-gray-900 font-bold font-mono">V-12.345.678</span>
              </div>
            </div>
          </details>

          <details className="bg-white border border-gray-200 shadow-sm rounded-none group cursor-pointer">
            <summary className="p-4 bg-gray-50 font-bold text-gray-900 uppercase tracking-tight flex items-center gap-3 border-b border-gray-200 rounded-none list-none marker:hidden">
              <Landmark className="w-5 h-5 text-blue-600" />
              Transferencia Bancaria
              <span className="ml-auto text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-6 bg-white space-y-3 text-sm rounded-none">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold uppercase">Banco</span>
                <span className="text-gray-900 font-bold">Mercantil</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold uppercase">Cuenta</span>
                <span className="text-gray-900 font-bold font-mono text-xs sm:text-sm">0105-0123-4567-8901-2345</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold uppercase">A nombre de</span>
                <span className="text-gray-900 font-bold">AutoParts Pro Demo Corp.</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500 font-semibold uppercase">RIF</span>
                <span className="text-gray-900 font-bold font-mono">J-40123456-7</span>
              </div>
            </div>
          </details>
        </div>

        {/* Columna Derecha: Formulario */}
        <div className="order-2 h-full">
          <PaymentForm />
        </div>

      </div>
    </main>
  );
}
