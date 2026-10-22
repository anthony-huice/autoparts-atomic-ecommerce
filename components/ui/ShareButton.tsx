"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import { FaWhatsapp, FaFacebook, FaXTwitter } from "react-icons/fa6";

export function ShareButton({ url, title }: { url?: string; title?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareTitle = title || "¡Mira este vehículo en AutoParts Pro!";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Error al copiar", err);
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: <FaWhatsapp className="w-5 h-5 text-green-500" />,
      action: () =>
        window.open(
          `https://api.whatsapp.com/send?text=${encodeURIComponent(
            shareTitle + " " + shareUrl
          )}`,
          "_blank"
        ),
    },
    {
      name: "Facebook",
      icon: <FaFacebook className="w-5 h-5 text-blue-600" />,
      action: () =>
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            shareUrl
          )}`,
          "_blank"
        ),
    },
    {
      name: "X (Twitter)",
      icon: <FaXTwitter className="w-5 h-5 text-slate-900" />,
      action: () =>
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            shareUrl
          )}&text=${encodeURIComponent(shareTitle)}`,
          "_blank"
        ),
    },
  ];

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm rounded-none"
        aria-label="Compartir"
        title="Compartir"
      >
        <Share2 className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-xl z-50 rounded-none">
          <div className="flex flex-col py-1">
            <div className="px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Compartir vía
              </span>
            </div>
            {shareOptions.map((opt) => (
              <button
                key={opt.name}
                onClick={() => {
                  opt.action();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700 transition-colors rounded-none border-b border-slate-100 last:border-0"
              >
                {opt.icon}
                {opt.name}
              </button>
            ))}

            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700 transition-colors rounded-none"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <LinkIcon className="w-5 h-5 text-slate-500" />
              )}
              {copied ? "¡Enlace copiado!" : "Copiar enlace"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
