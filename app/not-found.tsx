import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-gray-50/50">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-9xl font-black text-gray-900 tracking-tighter mb-4">
          404
        </h1>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-6 uppercase">
          Página No Encontrada
        </h2>
        <p className="text-gray-600 mb-10 text-lg leading-relaxed max-w-lg mx-auto">
          Parece que nos hemos desviado del camino. Esta publicación ya no está disponible, el vehículo fue vendido o el enlace es incorrecto.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold tracking-widest text-white uppercase bg-gray-900 hover:bg-gray-800 transition-colors rounded-none border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
        >
          Volver al Catálogo
        </Link>
      </div>
    </div>
  );
}
