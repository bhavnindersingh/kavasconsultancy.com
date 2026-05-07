interface TeamCardProps {
  name: string;
  role: string;
  initials: string;
  photo?: string;
  index: number;
  onBlue?: boolean;
}

export default function TeamCard({ name, role, initials, photo, index, onBlue }: TeamCardProps) {
  const hues = ['#001D88', '#0730C6', '#0D22B9', '#0B43D0', '#00249F', '#0730C6'];
  const bg = hues[index % hues.length];

  if (onBlue) {
    return (
      <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white shadow"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          {photo ? (
            <img src={photo} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold text-white text-sm">{name}</p>
          <p className="text-xs text-white/60 mt-0.5">{role}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white border border-brand-border shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white shadow"
        style={{ background: bg }}
      >
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="text-center">
        <p className="font-semibold text-brand-ink text-sm">{name}</p>
        <p className="text-xs text-brand-muted mt-0.5">{role}</p>
      </div>
    </div>
  );
}
