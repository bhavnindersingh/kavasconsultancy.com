"use client";

import { useEffect } from "react";

/** Centered dialog on desktop, bottom sheet on phones. `side` makes it a right-hand drawer. */
export default function Modal({
  title,
  onClose,
  children,
  side = false,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  side?: boolean;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex ${side ? "" : "p-4"}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        className={
          side
            ? "relative ml-auto h-full w-full max-w-[560px] bg-paper shadow-2xl overflow-y-auto"
            : `relative m-auto w-full ${wide ? "max-w-[760px]" : "max-w-[480px]"} max-h-full overflow-y-auto rounded-2xl bg-paper shadow-2xl`
        }
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3">
          <h2 className="font-serif text-xl truncate">{title}</h2>
          <button className="ws-btn !px-3" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
