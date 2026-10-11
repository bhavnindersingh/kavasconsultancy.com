"use client";

import { useState } from "react";

/** Two-step destructive button: first click arms it, second click acts. */
export default function ConfirmButton({
  label,
  confirmLabel = "Click again to confirm",
  onConfirm,
  className = "",
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={`ws-btn ws-btn--danger ${armed ? "!border-[#b42318] !text-[#b42318]" : ""} ${className}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
