"use client";

import { useEffect, useRef, useState } from "react";
import { REEL, chapterAt } from "@/lib/reel";

/**
 * The hero showreel in the media deck.
 *
 * Three things this has to get right:
 *
 * · Source per breakpoint. The deck is 16/8.4 on desktop and 3/4.4 on
 *   mobile, so there are two separate cuts. <source media> is ignored by
 *   media elements in every current browser, so the pick happens in JS —
 *   which is also why the poster carries the first paint.
 *
 * · Reduced motion. No autoplay, no loop: the poster stands in and a
 *   button starts it, once, if the visitor asks for it.
 *
 * · Not burning a phone battery. Playback pauses whenever the deck scrolls
 *   out of view, and the rAF that drives the caption only runs while the
 *   video is actually playing.
 */

export default function HeroReel({ className = "" }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [source, setSource] = useState<typeof REEL.desktop | null>(null);
  const [reduced, setReduced] = useState(false);
  const [started, setStarted] = useState(false);
  const [chapter, setChapter] = useState(0);

  /* which cut, and does this visitor want motion at all */
  useEffect(() => {
    const size = window.matchMedia(REEL.mobileQuery);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const pick = () => setSource(size.matches ? REEL.mobile : REEL.desktop);
    const readMotion = () => setReduced(motion.matches);

    pick();
    readMotion();
    size.addEventListener("change", pick);
    motion.addEventListener("change", readMotion);
    return () => {
      size.removeEventListener("change", pick);
      motion.removeEventListener("change", readMotion);
    };
  }, []);

  /* caption + progress, driven off the video clock rather than a timer, so
     they cannot drift away from the picture */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let raf = 0;
    const tick = () => {
      const t = video.currentTime;
      setChapter(chapterAt(t));
      if (barRef.current) {
        // real duration when the metadata has landed, so the bar cannot drift
        // against whichever cut is actually playing
        const total = Number.isFinite(video.duration)
          ? video.duration
          : REEL.duration;
        barRef.current.style.transform = `scaleX(${t / total})`;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const stop = () => cancelAnimationFrame(raf);

    video.addEventListener("play", start);
    video.addEventListener("pause", stop);
    video.addEventListener("ended", stop);
    if (!video.paused) start();

    return () => {
      stop();
      video.removeEventListener("play", start);
      video.removeEventListener("pause", stop);
      video.removeEventListener("ended", stop);
    };
  }, [source]);

  /* don't decode video the visitor isn't looking at */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.1 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [source, reduced]);

  const active = REEL.chapters[chapter];
  const showPlay = reduced && !started;

  return (
    <div className={`reel ${className}`}>
      {source && (
        <video
          ref={videoRef}
          className="reel__video"
          src={source.src}
          poster={source.poster}
          muted
          playsInline
          loop={!reduced}
          autoPlay={!reduced}
          preload={reduced ? "none" : "auto"}
          aria-label={REEL.alt}
        />
      )}

      {showPlay && (
        <button
          type="button"
          className="reel__play"
          onClick={() => {
            setStarted(true);
            void videoRef.current?.play().catch(() => {});
          }}
        >
          Play showreel
        </button>
      )}

      {!showPlay && (
        <>
          <p className="reel__caption" aria-live="off">
            <span className="reel__client">{active.client}</span>
            {active.note && <span className="reel__note">{active.note}</span>}
          </p>
          <span className="reel__track" aria-hidden>
            <span ref={barRef} className="reel__bar" />
          </span>
        </>
      )}
    </div>
  );
}
