"use client";

import { useFavoritosContext } from "@/providers/FavoritosProvider";
import { Bookmark } from "lucide-react";

interface FavoriteButtonProps {
  itemId: string;
}

export function FavoriteButton({ itemId }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoading } = useFavoritosContext();

  const active = isFavorite(itemId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoading) return;
        toggleFavorite(itemId);
      }}
      disabled={isLoading}
      className={`${isLoading ? "opacity-50 cursor-wait" : ""}`}
      aria-label={active ? "Quitar de guardados" : "Guardar"}
    >
      <Bookmark
        className={`w-5 h-5 ${active ? "text-[#1e40af] fill-[#1e40af]" : "text-gray-400"}`}
      />
    </button>
  );
}
