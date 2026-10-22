"use client";
import * as React from "react";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UploadCloud, Loader2, X } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { cn } from "@/lib/utils";
export interface ImageUploadProps {
  bucket?: string;
  folderPath?: string;
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  defaultImage?: string;
}
export function ImageUpload({
  bucket = "inventario",
  folderPath = "general",
  onUploadSuccess,
  onUploadError,
  className,
  defaultImage,
}: ImageUploadProps) {
  const supabase = createClient();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaultImage || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    /* Validate type */
    if (!file.type.startsWith("image/")) {
      const error = new Error(
        "El archivo seleccionado no es una imagen válida.",
      );
      toast.error(error.message);
      if (onUploadError) onUploadError(error);
      return;
    }
    /* Validate size (max 5MB) */
    if (file.size > 5 * 1024 * 1024) {
      const error = new Error(
        "La imagen excede el tamaño máximo permitido de 5MB.",
      );
      toast.error(error.message);
      if (onUploadError) onUploadError(error);
      return;
    }
    setIsUploading(true);
    
    try {
      // Compress the image before uploading
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/webp"
      };
      const compressedFile = await imageCompression(file, options);

      /* Generate unique name forcing .webp extension */
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;
      const filePath = `${folderPath}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressedFile, { cacheControl: "31536000", upsert: false });
      if (error) throw error;
      let preview = null;
      let savedValue = filePath;

      if (bucket === "documentos_privados") {
        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600);
        preview = signedData?.signedUrl || null;
        savedValue = filePath; // Guardamos el path relativo en la BD
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);
        preview = publicUrl;
        savedValue = publicUrl; // Guardamos la URL pública
      }

      setPreviewUrl(preview);
      toast.success("Imagen subida exitosamente");
      onUploadSuccess(savedValue);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(`Error al subir imagen: ${error.message}`);
      if (onUploadError) onUploadError(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const triggerSelect = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUploading) return;
    setPreviewUrl(null);
    onUploadSuccess(""); // Empty URL to indicate removal
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <div
        onClick={triggerSelect}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-none transition-all overflow-hidden",
          isUploading
            ? "border-gray-300 bg-gray-50 cursor-not-allowed"
            : "border-blue-300 bg-blue-50/50 hover:bg-blue-50 cursor-pointer",
          previewUrl ? "border-solid border-gray-300 bg-gray-100" : "",
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-3 text-blue-600">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Subiendo imagen...</p>
          </div>
        ) : previewUrl ? (
          <div className="relative w-full h-full group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vista previa"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={clearImage}
                className="p-2 bg-red-600 text-white rounded-none hover:bg-red-700 transform scale-90 group-hover:scale-100 transition-all"
                title="Quitar imagen"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 text-gray-500">
            <div className="p-3 bg-white rounded-none ">
              <UploadCloud className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-gray-700">
                Haz clic para buscar y subir una imagen
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG o WEBP (máximo 5MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
