/**
 * Impact-card figure. Arrow characters render as straight-line SVG
 * (mitred joints, flat caps — no curved terminals); anything else
 * (numbers, "3×", "48%") renders as type.
 */
const ARROWS: Record<string, string> = {
  "←": "M40 22 H6 M18 10 L6 22 L18 34",
  "→": "M4 22 H38 M26 10 L38 22 L26 34",
  "↑": "M22 40 V6 M10 18 L22 6 L34 18",
  "↓": "M22 4 V38 M10 26 L22 38 L34 26",
  "↗": "M7 37 L36 8 M18 8 H36 V26",
  "↘": "M7 8 L36 37 M36 19 V37 H18",
};

export default function Glyph({ figure }: { figure: string }) {
  const path = ARROWS[figure.trim()];

  if (!path) {
    return <p className="icard__glyph serif">{figure}</p>;
  }

  return (
    <svg
      className="icard__glyph"
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      role="img"
      aria-label={`${figure} trend`}
    >
      <path d={path} />
    </svg>
  );
}
