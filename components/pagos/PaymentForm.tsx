"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Upload, Loader2 } from "lucide-react";

// Esquema de validación
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const paymentSchema = z.object({
  emisor: z.string().min(2, "El banco emisor es requerido"),
  referencia: z.string().min(4, "El número de referencia es requerido"),
  comprobante: z
    .custom<FileList>()
    .refine((files) => files && files.length > 0, "El comprobante es obligatorio.")
    .refine(
      (files) => files && files[0]?.size <= MAX_FILE_SIZE,
      `El tamaño máximo es de 5MB.`
    )
    .refine(
      (files) => files && ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
      "Solo se permiten formatos .jpg, .jpeg, .png y .webp."
    ),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export function PaymentForm() {
  const { data: user, isLoading: isAuthLoading } = useSession();
  const supabase = createClient();

  const [paymentState, setPaymentState] = useState<'NONE' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('NONE');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  });

  const fileWatcher = watch("comprobante");

  // Generar preview local
  useEffect(() => {
    if (fileWatcher && fileWatcher.length > 0) {
      const file = fileWatcher[0];
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setImagePreview(null);
    }
  }, [fileWatcher]);

  // Verificar si ya tiene pago pendiente
  useEffect(() => {
    async function checkPendingPayment() {
      if (!user) {
        setIsLoadingStatus(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("solicitudes_pago")
          .select("estado")
          .eq("usuario_id", user.id)
          .order("fecha_pago", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;
        if (data) setPaymentState(data.estado);
      } catch (err: any) {
        const errorMessage = err?.message || err?.details || err?.hint || JSON.stringify(err);
        console.error("Error al verificar pago pendiente:", errorMessage);
        setErrorMsg(errorMessage);
      } finally {
        setIsLoadingStatus(false);
      }
    }
    
    if (!isAuthLoading) {
      checkPendingPayment();
    }
  }, [user, isAuthLoading, supabase]);

  const onSubmit = async (data: PaymentFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const file = data.comprobante[0];

      // 1. Comprimir imagen localmente
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // 2. Subir imagen a Supabase Storage (bucket privado 'comprobantes')
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("comprobantes")
        .upload(filePath, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error("No se pudo subir el comprobante: " + uploadError.message);
      }

      // 3. Insertar registro en la base de datos
      const { error: dbError } = await supabase.from("solicitudes_pago").insert({
        usuario_id: user.id,
        comprobante_url: uploadData.path,
        emisor: data.emisor,
        referencia: data.referencia,
      });

      if (dbError) {
        throw new Error("Error al registrar la solicitud: " + dbError.message);
      }

      setSuccessMsg("Comprobante enviado exitosamente.");
      reset();
      setPaymentState("PENDIENTE"); // Cambiar la vista inmediatamente
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error inesperado al procesar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoadingStatus) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-red-50 text-red-800 p-4 border border-red-200 rounded-none flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">Debes iniciar sesión para reportar un pago.</p>
      </div>
    );
  }

  // Vista de Revisión (si ya tiene pago pendiente)
  if (paymentState === "PENDIENTE") {
    return (
      <div className="bg-yellow-50 text-yellow-900 p-6 border border-yellow-200 rounded-none shadow-sm flex flex-col items-center text-center gap-4 max-w-lg mx-auto">
        <div className="bg-yellow-100 p-3 rounded-none">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Comprobante en Revisión</h3>
          <p className="text-sm mt-2 font-medium">
            Tu pago está siendo verificado. Tiempo estimado: 24h.
          </p>
          <p className="text-xs mt-1 text-yellow-700">
            Una vez aprobado, tu membresía se actualizará automáticamente.
          </p>
        </div>
      </div>
    );
  }

  // Vista Aprobada
  if (paymentState === "APROBADO") {
    return (
      <div className="bg-green-50 text-green-900 p-6 border border-green-200 rounded-none shadow-sm flex flex-col items-center text-center gap-4 max-w-lg mx-auto">
        <div className="bg-green-100 p-3 rounded-none text-green-600">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Pago Aprobado</h3>
          <p className="text-sm mt-2 font-medium">
            Tu membresía DESTACADO ya se encuentra activa y tu pago ha sido validado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 shadow-sm p-6 sm:p-8 rounded-none">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Reportar Pago</h2>
        <p className="text-sm text-gray-500 mt-1">Sube el comprobante de tu transferencia o pago móvil.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-none flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-none flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="emisor" className="text-sm font-semibold text-gray-700">Banco Emisor</Label>
          <Input 
            id="emisor" 
            placeholder="Ej. Banesco, Mercantil..." 
            {...register("emisor")}
            disabled={isSubmitting}
            className="rounded-none"
          />
          {errors.emisor && (
            <span className="text-xs text-red-600 font-medium">{errors.emisor.message}</span>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="referencia" className="text-sm font-semibold text-gray-700">Número de Referencia</Label>
          <Input 
            id="referencia" 
            placeholder="Ej. 123456789" 
            {...register("referencia")}
            disabled={isSubmitting}
            className="rounded-none"
          />
          {errors.referencia && (
            <span className="text-xs text-red-600 font-medium">{errors.referencia.message}</span>
          )}
        </div>

        <div className="space-y-1.5 pt-2">
          <Label className="text-sm font-semibold text-gray-700">Comprobante de Pago</Label>
          
          <div className={`mt-2 flex justify-center rounded-none border-2 border-dashed px-6 py-8 ${errors.comprobante ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
            <div className="text-center">
              {imagePreview ? (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="mx-auto h-32 w-auto object-contain border border-gray-200 rounded-none shadow-sm" />
                </div>
              ) : (
                <Upload className="mx-auto h-10 w-10 text-gray-400" aria-hidden="true" />
              )}
              
              <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                <label
                  htmlFor="comprobante"
                  className="relative cursor-pointer rounded-none bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500 px-3 py-1 border border-blue-200 transition-colors"
                >
                  <span>{imagePreview ? "Cambiar archivo" : "Seleccionar archivo"}</span>
                  <input 
                    id="comprobante" 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,image/jpg" 
                    className="sr-only" 
                    disabled={isSubmitting}
                    {...register("comprobante")} 
                  />
                </label>
              </div>
              <p className="text-xs leading-5 text-gray-500 mt-2">PNG, JPG, WEBP hasta 5MB</p>
            </div>
          </div>
          {errors.comprobante && (
            <span className="text-xs text-red-600 font-medium block mt-1">{errors.comprobante.message as string}</span>
          )}
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full rounded-none uppercase font-bold tracking-wider h-12" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Reportar Pago"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
