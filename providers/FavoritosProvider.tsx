"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useSession } from "@/hooks/useSession";
import { useUIStore } from "@/store/useUIStore";

interface FavoritosContextType {
  favoritos: string[];
  isFavorite: (vehiculoId: string) => boolean;
  toggleFavorite: (vehiculoId: string) => void;
  isLoading: boolean;
}

const FavoritosContext = createContext<FavoritosContextType | undefined>(undefined);

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const { favoritos, isFavorite, toggleFavorite, isLoading } = useFavoritos();
  const { data: user, isLoading: isSessionLoading } = useSession();
  const { openAuthModal } = useUIStore();

  const handleToggle = (vehiculoId: string) => {
    if (isSessionLoading) return;
    if (!user) {
      openAuthModal("login");
      return;
    }
    toggleFavorite(vehiculoId);
  };

  return (
    <FavoritosContext.Provider 
      value={{ 
        favoritos, 
        isFavorite, 
        toggleFavorite: handleToggle, 
        isLoading: isLoading || isSessionLoading 
      }}
    >
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritosContext() {
  const context = useContext(FavoritosContext);
  if (context === undefined) {
    throw new Error("useFavoritosContext must be used within a FavoritosProvider");
  }
  return context;
}
