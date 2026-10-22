import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planes de Suscripción Concesionario - Onboarding | AutoParts Pro",
  description: "Elige el plan de suscripción que mejor se adapte al tamaño de tu empresa o concesionario. Activa tu cuenta básica gratis o mejora a Destacado o Premium.",
};

export default function PlanesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
