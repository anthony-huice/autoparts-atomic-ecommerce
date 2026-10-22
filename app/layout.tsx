import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import { ModalProvider } from "@/providers/ModalProvider";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoParts Pro — High-Concurrency Automotive Store",
  description: "Plataforma e-commerce construida con Next.js y Supabase",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { FavoritosProvider } from "@/providers/FavoritosProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light overflow-x-hidden">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased overflow-x-hidden w-full relative`}>
        <QueryProvider>
          <FavoritosProvider>
            <PublicNavbar />
            {children}
            <PublicFooter />
          </FavoritosProvider>
        </QueryProvider>
        <ModalProvider />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
