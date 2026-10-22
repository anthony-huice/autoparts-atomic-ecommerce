"use client";

/**
 * components/ui/ViewTracker.tsx
 *
 * Componente minúsculo, sin UI visible, que registra una visita a la página
 * de detalle de un producto al montarse en el navegador.
 *
 * Por qué un Client Component con useEffect:
 *   - El Server Component de detalle puede estar cacheado (ISR/SSR con caché).
 *   - Si llamáramos al RPC en el servidor, las visitas en caché no se contarían.
 *   - Este componente se ejecuta SIEMPRE en el cliente, en cada visita real,
 *     garantizando un conteo preciso independientemente del caché de Next.js.
 *
 * Por qué llamar directamente al RPC (no un Server Action):
 *   - El RPC incrementar_vistas_* tiene SECURITY DEFINER y GRANT TO anon.
 *     No necesita la sesión del usuario para ejecutarse.
 *   - Llamar un Server Action generaría un round-trip adicional innecesario.
 *   - El cliente Supabase (ANON KEY) es suficiente para esta operación.
 *
 * Uso:
 *   <ViewTracker tipo="vehiculo" itemId={vehiculo.id} />
 *   <ViewTracker tipo="repuesto" itemId={repuesto.id} />
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ViewTrackerProps {
  tipo: "vehiculo" | "repuesto";
  itemId: string;
}

export function ViewTracker({ tipo, itemId }: ViewTrackerProps) {
  useEffect(() => {
    // Función auto-invocada para poder usar async/await dentro de useEffect
    const registrarVista = async () => {
      try {
        const supabase = createClient();
        const rpcName =
          tipo === "vehiculo"
            ? "incrementar_vistas_vehiculo"
            : "incrementar_vistas_repuesto";

        const param =
          tipo === "vehiculo"
            ? { p_vehiculo_id: itemId }
            : { p_repuesto_id: itemId };

        await supabase.rpc(rpcName, param);
        // Sin manejo de error visible: una vista perdida no es un error crítico.
        // El RPC falla silenciosamente si el item está PAUSADO, VENDIDO o eliminado.
      } catch {
        // Silencioso: nunca interrumpir la UX por un contador de vistas.
      }
    };

    registrarVista();

    // Sin cleanup: el efecto debe correr exactamente una vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sin UI — este componente es invisible.
  return null;
}
