/**
 * ————————————————————————————————————————————————————————
 * HERO REEL
 *
 * The looping showreel in the home page media deck. The video files are
 * built by scripts/build-reel.sh — if you change the cut there, change the
 * chapter marks here too. Nothing keeps them in sync automatically.
 *
 * Type is deliberately NOT burned into the video: the client name is live
 * DOM, so it stays crisp at any size, translates, and can be edited without
 * a re-encode.
 *
 * ⚠️ ATTRIBUTION — check this before the site goes live.
 * The reel shows client names over client-owned imagery. Two things need to
 * be true for each name below, and only you can confirm them:
 *   1. Kavas actually did the work being shown.
 *   2. You have the client's permission to show it publicly.
 * The Nimai and Colours of Nature footage is their campaign and product
 * material, not Kavas' — showing it is normal for a studio reel, but the
 * reel must not imply Kavas shot it. `note` is where you say what Kavas
 * actually did; leave it undefined and only the name shows.
 * ————————————————————————————————————————————————————————
 */

export type ReelChapter = {
  /** shown over the footage */
  client: string;
  /** optional second line — what Kavas built. Keep it to a few words. */
  note?: string;
  /** seconds into the reel where this chapter starts */
  from: number;
};

export const REEL = {
  /** nominal length; the progress bar reads the real one off the element.
      The two cuts differ by ~30ms because zoompan rounds a half-frame
      differently at each resolution — far below anything you can see, but
      it is why nothing here depends on this number being exact. */
  duration: 8.07,

  desktop: {
    src: "/reel/kavas-reel.mp4",
    poster: "/reel/kavas-reel-poster.jpg",
  },
  mobile: {
    src: "/reel/kavas-reel-mobile.mp4",
    poster: "/reel/kavas-reel-mobile-poster.jpg",
  },
  /** matches the .deck__front aspect switch in globals.css */
  mobileQuery: "(max-width: 700px)",

  /** for the reduced-motion still and for screen readers */
  alt: "Showreel of recent Kavas work: Nimai, The Colours of Nature and RapidQS.",

  // Marks are the MOBILE cut's shot boundaries, which run ~30ms ahead of the
  // desktop cut's. Erring early means the caption is never still naming the
  // previous client once the new one is on screen.
  chapters: [
    // TODO: fill in `note` for each once the scope line is agreed with the
    // client. e.g. note: "Storefront and commerce experience"
    { client: "Nimai", from: 0 },
    { client: "The Colours of Nature", from: 3.3 },
    { client: "RapidQS", note: "Pre-construction estimates", from: 5.83 },
  ] satisfies ReelChapter[],
};

/** index of the chapter covering `t`, or 0 before the first mark */
export function chapterAt(t: number) {
  let i = 0;
  for (let n = 0; n < REEL.chapters.length; n++) {
    if (t >= REEL.chapters[n].from) i = n;
  }
  return i;
}
