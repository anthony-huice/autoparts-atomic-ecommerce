"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFiltros, PanelContenido } from "./VehiculosFiltros";

export default function VehiculosFiltrosMobile({ totalResultados }: { totalResultados: number }) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { hayFiltrosActivos } = useFiltros();

  const openDrawer = useCallback(async () => {
    const drawer = drawerRef.current;
    const scroller = scrollerRef.current;
    if (!drawer || !scroller) return;

    if (typeof (drawer as HTMLElement & { showPopover?: () => void }).showPopover === "function") {
      (drawer as HTMLElement & { showPopover: () => void }).showPopover();
    } else {
      drawer.style.display = "block";
    }

    // Fallback para scroll-initial-target
    if (!CSS.supports("scroll-initial-target", "nearest")) {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: "instant" });
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
    }
    scroller.scrollTo({ left: 0, behavior: "smooth" });
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: scroller.offsetWidth, behavior: "smooth" });
  }, []);

  // IntersectionObserver para detectar estado del drawer
  useEffect(() => {
    const drawer = drawerRef.current;
    const sheet = sheetRef.current;
    if (!drawer || !sheet) return;

    const visibleThreshold = 0.01;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry.intersectionRatio < visibleThreshold) {
          // Drawer cerrado
          if (typeof (drawer as HTMLElement & { hidePopover?: () => void }).hidePopover === "function") {
            (drawer as HTMLElement & { hidePopover: () => void }).hidePopover();
          } else {
            drawer.style.display = "none";
          }
          document.body.style.overflow = "";
          openBtnRef.current?.setAttribute("aria-expanded", "false");
          setIsOpen(false);
        }
        if (entry.intersectionRatio >= 0.5) {
          document.body.style.overflow = "hidden";
          openBtnRef.current?.setAttribute("aria-expanded", "true");
          setIsOpen(true);
        }
      },
      { root: drawer, threshold: [visibleThreshold, 0.5] }
    );
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) closeDrawer();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeDrawer]);

  return (
    <>
      {/* Botón flotante "Filtrar" — anclado en la zona del pulgar */}
      <button
        ref={openBtnRef}
        id="btn-abrir-filtros-mobile"
        aria-expanded="false"
        aria-haspopup="dialog"
        onClick={openDrawer}
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-6 py-3.5 bg-slate-900 text-white font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
        style={{ minWidth: "160px", justifyContent: "center" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Filtrar
        {hayFiltrosActivos && (
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs font-bold">
            •
          </span>
        )}
      </button>

      {/* Drawer: popover manual */}
      <div
        ref={drawerRef}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — popover is a valid HTML attribute
        popover="manual"
        role="dialog"
        aria-modal="true"
        aria-label="Filtros de búsqueda"
        className="lg:hidden fixed inset-0 z-50 p-0 m-0 w-full h-full max-w-none max-h-none border-0 bg-transparent overflow-hidden"
        style={{ display: "none" }}
        onClick={(e) => {
          // Light dismiss al clicar fuera del sheet
          if (e.target === e.currentTarget || (scrollerRef.current && e.target === scrollerRef.current)) {
            closeDrawer();
          }
        }}
      >
        {/* Backdrop oscuro */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={{ pointerEvents: "none" }}
        />

        {/* Scroller horizontal que implementa el scroll-snap */}
        <div
          ref={scrollerRef}
          className="absolute inset-0 overflow-x-auto flex"
          style={{
            scrollSnapType: "x mandatory",
            overscrollBehavior: "none",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Sheet — el panel real de filtros */}
          <div
            ref={sheetRef}
            tabIndex={-1}
            className="relative flex-shrink-0 w-full max-w-md ml-auto h-full bg-white flex flex-col p-5 overflow-hidden"
            style={{
              scrollSnapAlign: "start",
              // Ocupa 85% del ancho en móvil
              maxWidth: "min(420px, 90vw)",
            }}
          >
            {/* Handle visual */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-300" />
            <div className="mt-4 flex-1 overflow-hidden flex flex-col">
              <PanelContenido
                totalResultados={totalResultados}
                onClose={closeDrawer}
              />
            </div>
          </div>

          {/* Spacer — cuando el scroller está scrolleado hasta aquí, el drawer está cerrado */}
          <div
            style={{
              flexShrink: 0,
              width: "min(420px, 90vw)",
              scrollSnapAlign: "start",
            }}
          />
        </div>
      </div>
    </>
  );
}
