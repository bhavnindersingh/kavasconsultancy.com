'use client';
import dynamic from 'next/dynamic';

const GalaxyScene = dynamic(() => import('./GalaxyScene'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full"
      style={{ background: '#020916' }}
    />
  ),
});

const desktopFadeMask =
  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 5%, rgba(0,0,0,0.85) 9%, #000 13%, #000 100%)';

const mobileFadeMask =
  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 6%, rgba(0,0,0,0.9) 12%, #000 18%, #000 82%, rgba(0,0,0,0.9) 88%, rgba(0,0,0,0.55) 94%, transparent 100%)';

export default function HeroCanvas({ orientation = 'desktop' }: { orientation?: 'desktop' | 'mobile' }) {
  const mask = orientation === 'mobile' ? mobileFadeMask : desktopFadeMask;
  return (
    <div
      className="w-full h-full"
      style={{
        background: '#020916',
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
      aria-hidden="true"
    >
      <GalaxyScene />
    </div>
  );
}
