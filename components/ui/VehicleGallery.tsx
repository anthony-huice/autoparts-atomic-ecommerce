"use client";

import { useState } from "react";
import Image from "next/image";

interface VehicleGalleryProps {
  images: string[];
  marca: string;
  modelo: string;
}

export function VehicleGallery({ images, marca, modelo }: VehicleGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative aspect-[4/3] w-full bg-slate-100 border border-slate-200 rounded-none overflow-hidden flex-grow">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <span className="text-lg font-medium">Sin imagen</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-10">
      {/* Miniaturas Verticales (Estilo Mercado Libre) */}
      {images.length > 1 && (
        <div className="flex md:flex-col gap-2 overflow-auto md:overflow-visible order-2 md:order-1 md:w-20 shrink-0">
          {images.map((url, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-16 h-16 md:w-20 md:h-20 shrink-0 border rounded-none overflow-hidden cursor-pointer transition-colors ${
                selectedIndex === idx
                  ? "border-[#3483fa] border-[3px]"
                  : "border-slate-300 hover:border-[#3483fa]"
              }`}
            >
              <Image
                src={url}
                alt={`Miniatura ${idx + 1}`}
                fill
                className="object-cover"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg=="
              />
            </div>
          ))}
        </div>
      )}

      {/* Imagen Principal (Cero Padding, Ángulos Rectos) */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 border border-slate-200 rounded-none overflow-hidden order-1 md:order-2 flex-grow">
        <Image
          src={selectedImage}
          alt={`${marca} ${modelo}`}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8f+9+PQAJnwNYx5iA6wAAAABJRU5ErkJggg=="
        />
      </div>
    </div>
  );
}
