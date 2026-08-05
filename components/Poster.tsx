import Link from "next/link";
import Image from "next/image";
import type { CaseStudy } from "@/lib/cases";
import type { CSSProperties } from "react";

/**
 * Collins-style poster card: rounded media block, no visible caption,
 * client-name chip on hover. Uses the case's real poster image when it
 * has one, and falls back to a tint placeholder when it doesn't.
 */
export default function Poster({
  cs,
  width,
  aspect,
  style,
}: {
  cs: CaseStudy;
  /** CSS width, e.g. "22vw" */
  width: string;
  /** override lib aspect for layout variety */
  aspect?: string;
  style?: CSSProperties;
}) {
  return (
    <Link
      href={`/work/${cs.slug}`}
      className="poster"
      style={{ width, aspectRatio: aspect ?? cs.aspect, ...style }}
      aria-label={`${cs.client} case study`}
    >
      {cs.poster ? (
        <Image
          src={cs.poster}
          alt={`${cs.client} — case study`}
          fill
          sizes="(max-width: 700px) 66vw, 24vw"
          className="poster__img"
        />
      ) : (
        <div className={`tint tint--${cs.tint}`}>
          <span className="serif">{cs.client.replace(/[[\]]/g, "")}</span>
        </div>
      )}
      <span className="poster__name">
        {cs.poster ? cs.client : `${cs.client} — replace image`}
      </span>
    </Link>
  );
}
