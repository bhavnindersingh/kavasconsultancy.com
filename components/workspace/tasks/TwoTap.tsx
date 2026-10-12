"use client";

import { useEffect, useRef, useState } from "react";

/** Arms on the first tap, acts on a second within four seconds. */
export const CONFIRM_MS = 4000;
/** A second tap sooner than this is a double-click, not a decision. */
const MIN_GAP_MS = 350;

export default function TwoTap({
  label,
  armedLabel,
  onConfirm,
  className = "ws-btn ws-btn--danger",
  armedClassName = "!border-[#b42318] !text-[#b42318]",
  title,
  armedTitle,
  disabled,
  ariaLabel,
}: {
  label: React.ReactNode;
  armedLabel: React.ReactNode;
  onConfirm: () => void;
  className?: string;
  armedClassName?: string;
  title?: string;
  armedTitle?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const armedAt = useRef(0);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      title={armed ? armedTitle ?? title : title}
      aria-label={ariaLabel}
      className={`${className} ${armed ? armedClassName : ""}`}
      onClick={() => {
        if (armed) {
          if (Date.now() - armedAt.current < MIN_GAP_MS) return;
          setArmed(false);
          onConfirm();
        } else {
          armedAt.current = Date.now();
          setArmed(true);
        }
      }}
    >
      {armed ? armedLabel : label}
    </button>
  );
}
