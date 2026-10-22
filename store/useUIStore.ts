import { create } from 'zustand';

export interface VendorData {
  nombre: string;
  tipo: 'PARTICULAR' | 'EMPRESA';
  telefonos: string[];
  correo: string;
}

interface UIState {
  isContactModalOpen: boolean;
  selectedVendorData: VendorData | null;
  isLoginPromptOpen: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'registro';
  openContactModal: (data: VendorData) => void;
  closeContactModal: () => void;
  openLoginPrompt: () => void;
  closeLoginPrompt: () => void;
  openAuthModal: (tab?: 'login' | 'registro') => void;
  closeAuthModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isContactModalOpen: false,
  selectedVendorData: null,
  isLoginPromptOpen: false,
  isAuthModalOpen: false,
  authModalTab: 'login',
  openContactModal: (data) => set({ isContactModalOpen: true, selectedVendorData: data }),
  closeContactModal: () => set({ isContactModalOpen: false, selectedVendorData: null }),
  openLoginPrompt: () => set({ isLoginPromptOpen: true }),
  closeLoginPrompt: () => set({ isLoginPromptOpen: false }),
  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
