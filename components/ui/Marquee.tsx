interface MarqueeProps {
  items: readonly string[];
}

function MarqueeRow({ items, hidden = false }: MarqueeProps & { hidden?: boolean }) {
  return (
    <div className="flex items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-[22px] px-[22px]">
          <span className="text-base tracking-[0.01em] text-light/90">{item}</span>
          <span className="text-light/25">◇</span>
        </span>
      ))}
    </div>
  );
}

/** Infinite-scrolling capability marquee on the dark band. */
export default function Marquee({ items }: MarqueeProps) {
  return (
    <div className="overflow-hidden bg-dark py-5 text-light">
      <div className="kavas-marquee">
        <MarqueeRow items={items} />
        <MarqueeRow items={items} hidden />
      </div>
    </div>
  );
}
