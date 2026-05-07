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

const fadeMask =
  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 5%, rgba(0,0,0,0.85) 9%, #000 13%, #000 100%)';

export default function HeroCanvas() {
  return (
    <div
      className="w-full h-full"
      style={{
        background: '#020916',
        WebkitMaskImage: fadeMask,
        maskImage: fadeMask,
      }}
      aria-hidden="true"
    >
      <GalaxyScene />
    </div>
  );
}
