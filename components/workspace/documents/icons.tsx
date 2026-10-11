// Small inline icons for the document cabinet. Stroke-only, currentColor.

const base = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function FolderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} className="flex-none text-mute">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg {...base} width={12} height={12} className={`motion-safe:transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg {...base}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  );
}

export function MoveIcon() {
  return (
    <svg {...base}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M10 13h6m-2-2 2 2-2 2" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...base}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg {...base}>
      <path d="M12 16V4m-5 5 5-5 5 5M5 20h14" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg {...base}>
      <path d="M12 4v12m-5-5 5 5 5-5M5 20h14" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg {...base}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** A folded sheet with the kind written on it; spreadsheets get a green grid. */
export function KindBadge({ label, sheet }: { label: string; sheet?: boolean }) {
  return (
    <span
      className={`relative grid h-10 w-8 flex-none place-items-end overflow-hidden rounded-[5px] border pb-1 text-[8.5px] font-semibold tracking-wide ${
        sheet ? "border-[#b7d8bf] bg-[#ecf6ee] text-[#2f6b3b]" : "border-line bg-cream text-body"
      }`}
      aria-hidden
    >
      <span className={`absolute right-0 top-0 size-2.5 rounded-bl-[3px] border-b border-l ${sheet ? "border-[#b7d8bf] bg-white" : "border-line bg-card"}`} />
      {sheet && (
        <span className="absolute inset-x-1.5 top-3 grid grid-cols-2 gap-px opacity-70">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="h-1 bg-[#2f6b3b]/40" />
          ))}
        </span>
      )}
      <span className="w-full text-center">{label}</span>
    </span>
  );
}
