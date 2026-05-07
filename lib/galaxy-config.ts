// Pixel-zen scene parameters. Single voxel Earth at center, surrounded by
// concentric mandala rings, drifting petals, an orbiting moon, and a deep
// pixel-cube star field. Final pass goes through a Pixelation post-effect.

export const PIXEL_PARAMS = {
  earth: {
    rows: 38,
    cols: 76,
    radius: 1.55,
    voxelSize: 0.115,
  },
  clouds: {
    count: 240,
    radius: 1.80,
    voxelSize: 0.07,
  },
  moon: {
    rows: 14,
    cols: 28,
    radius: 0.42,
    voxelSize: 0.09,
    orbit: {
      radius: 3.7,
      tilt: 0.55,
      speed: 0.18,
    },
  },
  mandala: [
    { radius: 2.55, count: 64,  voxelSize: 0.055, color: '#4D8FFF', sway: 0.18 },
    { radius: 3.10, count: 84,  voxelSize: 0.045, color: '#93C5FD', sway: 0.24 },
    { radius: 3.85, count: 112, voxelSize: 0.050, color: '#1D4ED8', sway: 0.16 },
    { radius: 4.65, count: 148, voxelSize: 0.040, color: '#7C5CFF', sway: 0.30 },
  ],
  petals: {
    count: 130,
    voxelSize: 0.065,
    fieldInner: 4.2,
    fieldOuter: 7.5,
  },
  stars: {
    count: 720,
    fieldRadius: 38,
    voxelSize: 0.12,
  },
  featured: {
    ringRadius: 5.6,
    yLiftScale: 1.15,
  },
} as const;

export const BRAND_COLORS = {
  coreHot:        '#E6F0FF',
  coreWarm:       '#9FBEFF',
  armMid:         '#4D8FFF',
  armOuter:       '#0B43D0',
  edgeDeep:       '#0730C6',
  dustIndigo:     '#1A40CC',
  dustViolet:     '#3B2A88',
  haloInner:      '#93C5FD',
  haloOuter:      '#1D4ED8',
  star:           '#DCEBFF',
  starHalo:       '#4D8FFF',
  label:          '#B8D2FF',
  labelOutline:   '#020916',
} as const;

// Voxel Earth biome palette — all in brand-blue family so the planet reads
// "earth-like" while staying on-brand. Continents are pale; oceans are deep
// navy/blue; ice caps are off-white.
export const EARTH_PALETTE = {
  deep:     '#001A66',
  shallow:  '#0730C6',
  coast:    '#1E5FE8',
  lowland:  '#7FA5FF',
  highland: '#B8D2FF',
  peak:     '#F0F4FF',
  tundra:   '#93C5FD',
  ice:      '#F0F4FF',
} as const;

export type FeaturedStar = {
  label: string;
  arm: number;
  t: number;
  yLift?: number;
};

export const FEATURED_STARS: readonly FeaturedStar[] = [
  { label: 'Frontend',          arm: 0, t: 0.78, yLift:  0.18 },
  { label: 'Backend & Database',arm: 1, t: 0.72, yLift: -0.14 },
  { label: 'Analytics',         arm: 2, t: 0.82, yLift:  0.16 },
  { label: 'Dashboards',        arm: 3, t: 0.66, yLift: -0.20 },
  { label: 'Inventory',         arm: 0, t: 0.45, yLift: -0.12 },
  { label: 'CRM',               arm: 1, t: 0.42, yLift:  0.14 },
  { label: 'Payroll & HR',      arm: 2, t: 0.50, yLift: -0.16 },
  { label: 'SEO',               arm: 3, t: 0.38, yLift:  0.20 },
  { label: 'Digital Marketing', arm: 0, t: 0.92, yLift:  0.10 },
  { label: 'Integrations',      arm: 2, t: 0.30, yLift:  0.22 },
  { label: 'Reporting',         arm: 1, t: 0.88, yLift: -0.18 },
] as const;
