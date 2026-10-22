-- Migration: 031_preguntas_update_policy.sql
-- Description: Permite a los dueños de las publicaciones actualizar (responder) las preguntas.

CREATE POLICY "Dueños del vehículo o repuesto pueden responder"
ON public.preguntas FOR UPDATE
USING (
  (
    (
      vehiculo_id IS NOT NULL AND 
      (SELECT creado_por_auth_id FROM public.vehiculos WHERE id = vehiculo_id) = auth.uid()
    )
    OR
    (
      repuesto_id IS NOT NULL AND 
      (SELECT creado_por_auth_id FROM public.repuestos WHERE id = repuesto_id) = auth.uid()
    )
  )
  AND respuesta IS NULL
);
