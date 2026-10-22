export default function LoadingDetalleVehiculo() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Skeleton del Botón Volver */}
        <div className="mb-4 h-5 w-32 bg-slate-200 animate-pulse rounded-none" />

        {/* Skeleton del Breadcrumb */}
        <div className="mb-6 h-5 w-64 bg-slate-200 animate-pulse rounded-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Columna Izquierda (Aprox 70%) */}
          <div className="lg:col-span-8">
            
            {/* Skeleton Galería */}
            <div className="flex flex-col md:flex-row gap-4 mb-10">
              {/* Miniaturas (ocultas en móvil como en la galería real) */}
              <div className="hidden md:flex flex-col gap-2 w-20 shrink-0">
                <div className="h-20 w-20 bg-slate-200 animate-pulse rounded-none border border-slate-200" />
                <div className="h-20 w-20 bg-slate-200 animate-pulse rounded-none border border-slate-200" />
                <div className="h-20 w-20 bg-slate-200 animate-pulse rounded-none border border-slate-200" />
              </div>
              {/* Imagen Principal */}
              <div className="aspect-[4/3] w-full bg-slate-200 animate-pulse rounded-none flex-grow" />
            </div>

            <hr className="border-gray-200 my-8" />

            {/* Skeleton Características */}
            <div>
              <div className="h-8 w-64 bg-slate-200 animate-pulse mb-6 rounded-none" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex justify-between border-b border-gray-100 pb-2">
                    <div className="h-4 w-20 bg-slate-100 animate-pulse rounded-none" />
                    <div className="h-4 w-24 bg-slate-200 animate-pulse rounded-none" />
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-gray-200 my-8" />
            
            {/* Skeleton Descripción */}
            <div>
              <div className="h-8 w-40 bg-slate-200 animate-pulse mb-6 rounded-none" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-slate-100 animate-pulse rounded-none" />
                <div className="h-4 w-full bg-slate-100 animate-pulse rounded-none" />
                <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded-none" />
              </div>
            </div>

          </div>

          {/* Columna Derecha (Aprox 30%) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Skeleton Caja Principal */}
            <div className="border border-gray-200 p-6 rounded-none bg-white">
              <div className="h-4 w-32 bg-slate-100 animate-pulse mb-2 rounded-none" />
              <div className="h-8 w-3/4 bg-slate-200 animate-pulse mb-4 rounded-none" />
              <div className="h-10 w-48 bg-slate-300 animate-pulse mb-6 rounded-none" />
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="h-6 w-48 bg-slate-200 animate-pulse mb-4 rounded-none" />
                <div className="h-24 w-full bg-slate-100 animate-pulse rounded-none" />
              </div>
            </div>

            {/* Skeleton Caja Preguntar */}
            <div className="border border-gray-200 p-6 rounded-none bg-white">
              <div className="h-6 w-48 bg-slate-200 animate-pulse mb-4 rounded-none" />
              <div className="h-24 w-full bg-slate-100 animate-pulse mb-4 rounded-none" />
              <div className="h-12 w-full bg-slate-200 animate-pulse rounded-none" />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
