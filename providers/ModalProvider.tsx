'use client';

import { ContactarVendedorModal } from "@/components/modals/ContactarVendedorModal";
import { LoginPromptModal } from "@/components/modals/LoginPromptModal";
import { AuthModal } from "@/components/modals/AuthModal";

export function ModalProvider() {
  return (
    <>
      <ContactarVendedorModal />
      <LoginPromptModal />
      <AuthModal />
    </>
  );
}
