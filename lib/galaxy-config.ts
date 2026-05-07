export const GALAXY_PARAMS = {
  particleCount: 7000,
  arms: 4,
  radius: 5.4,
  twist: 4.2,
  thickness: 0.55,
  randomScatter: 0.42,
  innerCutoff: 0.35,
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
