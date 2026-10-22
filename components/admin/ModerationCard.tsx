"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import Link from "next/link";

export interface ItemModeracion {
  id: string;
  tipo_item: "vehiculo" | "repuesto";
  marca?: string;
  modelo?: string;
  nombre?: string;
  anio?: number;
  precio: number;
  vendedor_tipo?: string;
  imagenes_url?: string[];
  empresas?: any;
  perfil_publico_vendedor?: any;
}

export function ModerationCard({ item }: { item: ItemModeracion }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleVerificacion = async (nuevoEstado: "APROBADO" | "RECHAZADO") => {
    setIsPending(true);
    try {
      const tabla = item.tipo_item === "vehiculo" ? "vehiculos" : "repuestos";
      const { error } = await supabase
        .from(tabla)
        .update({ estado_verificacion: nuevoEstado })
        .eq("id", item.id);

      if (error) throw error;
      
      toast.success(`Publicación ${nuevoEstado.toLowerCase()} exitosamente`);
      router.refresh();
    } catch (error: any) {
      toast.error(`Error al actualizar estado: ${error.message}`);
    } finally {
      setIsPending(false);
    }
  };

  const imagenPrincipal = item.imagenes_url?.[0] || "/placeholder.webp";
  const titulo = item.tipo_item === "vehiculo" 
    ? `${item.marca || ""} ${item.modelo || ""} ${item.anio || ""}`.trim()
    : item.nombre || "Repuesto";

  // Resolver nombre de vendedor
  let nombreVendedor = item.vendedor_tipo || "Desconocido";
  const emp = Array.isArray(item.empresas) ? item.empresas[0] : item.empresas;
  const pers = Array.isArray(item.perfil_publico_vendedor) ? item.perfil_publico_vendedor[0] : item.perfil_publico_vendedor;

  if (item.vendedor_tipo === "EMPRESA" && emp) {
    nombreVendedor = `${emp.nombre_comercial || emp.razon_social || "Empresa"} (Empresa)`;
  } else if (item.vendedor_tipo === "PARTICULAR" && pers) {
    const nombreCompleto = `${pers.nombres || ""} ${pers.apellidos || ""}`.trim();
    nombreVendedor = nombreCompleto ? `${nombreCompleto} (Particular)` : "Particular";
  }

  return (
    <div className="flex flex-col md:flex-row bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
      <div className="w-full md:w-48 h-48 md:h-auto shrink-0 bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={imagenPrincipal} 
          alt={titulo} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-gray-900 uppercase">{titulo}</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 uppercase rounded-none border border-yellow-300">
              Pendiente
            </span>
          </div>
          <p className="text-xl font-bold text-blue-600 mt-2">${item.precio?.toLocaleString() || 0}</p>
          <div className="text-sm text-gray-500 mt-2 flex flex-col gap-1">
            <p className="font-mono text-xs">ID: {item.id}</p>
            <p>Tipo: {item.tipo_item.toUpperCase()}</p>
            <p>Vendedor: {nombreVendedor}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Link 
            href={`/${item.tipo_item}s/${item.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium py-2 px-4 rounded-none transition-colors"
          >
            🔍 Revisar Publicación Completa
          </Link>

          <div className="flex gap-3">
            <button
              onClick={() => handleVerificacion("APROBADO")}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-none transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              APROBAR
            </button>
            
            <button
              onClick={() => handleVerificacion("RECHAZADO")}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-none transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              RECHAZAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
