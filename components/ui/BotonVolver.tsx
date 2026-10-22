"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BotonVolverProps {
  rutaDefecto: string;
}

export function BotonVolver({ rutaDefecto }: BotonVolverProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    router.back();
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors gap-1.5 group cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
      Volver al listado
    </button>
  );
}
