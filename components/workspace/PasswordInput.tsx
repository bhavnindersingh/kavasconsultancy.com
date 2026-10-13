"use client";

import { useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  /** On the wrapper, for spacing (the input itself is always .ws-input). */
  className?: string;
};

/** A password field with an eye button that shows what's been typed. */
export default function PasswordInput({ className = "", ...input }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input {...input} type={shown ? "text" : "password"} className="ws-input pr-10" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        title={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-[10px] text-mute hover:text-ink focus-visible:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
