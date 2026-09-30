"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean | "xl"; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`adm-card my-8 flex max-h-[90vh] w-full flex-col ${wide === "xl" ? "max-w-5xl" : wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="rounded p-1 text-zinc-500 hover:bg-zinc-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
