/**
 * Editorial media placeholder. Swap for a real <Image> by replacing
 * usage sites — the aspect ratio is preserved via the `ratio` prop.
 */
export default function Placeholder({
  label,
  ratio,
  dark = false,
  mark,
  className = "",
}: {
  label: string;
  /** CSS aspect-ratio, e.g. "16/9", "4/3", "3/4", "21/9", "1/1".
   *  Omit when width and height are set by the layout instead. */
  ratio?: string;
  dark?: boolean;
  /** big serif glyph shown at center, defaults to the ratio */
  mark?: string;
  className?: string;
}) {
  return (
    <div
      className={`ph ${dark ? "ph--dark" : ""} ${className}`}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      <span className="ph__mark serif">
        {mark ?? ratio?.replace("/", ":") ?? "img"}
      </span>
      <span className="ph__tag">{label}</span>
    </div>
  );
}
