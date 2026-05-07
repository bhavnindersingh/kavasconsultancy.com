export const HERO = {
  eyebrow: 'Custom Software for Modern Businesses',
  headline: 'Software.\nBuilt for how\nyou actually work.',
  subheadline:
    'We build custom software end-to-end — from your storefront to your database, from payroll to marketing — so every part of your business runs on tools that fit you, not the other way around.',
  cta: 'Start a Conversation',
  ctaSecondary: 'See How It Works',
} as const;

export const PAIN_POINTS = [
  {
    icon: 'Package',
    title: 'Bloated by default',
    body: 'Off-the-shelf platforms ship with thousands of features your team will never use. That complexity slows everyone down from day one.',
  },
  {
    icon: 'AlertTriangle',
    title: 'Never fully implemented',
    body: 'Most generic-software rollouts stall at 40–60% completion. You end up paying for the whole stack but running on half of it.',
  },
  {
    icon: 'Zap',
    title: 'Resource heavy',
    body: 'Generic systems demand dedicated IT support, third-party consultants, and constant maintenance just to stay running.',
  },
] as const;

export const SOLUTION = {
  eyebrow: 'The Kavas Difference',
  headline: 'Custom-built means built to fit.',
  body: 'We scope, design, and build your software from scratch — shaped around your workflows, your team, and your industry. From the website your customers see to the dashboards your team lives in.',
  points: [
    {
      title: 'Designed around your workflows',
      body: 'No forcing your business into a rigid template. We map how you actually work and build to match it.',
    },
    {
      title: 'Full-stack — front to backend',
      body: 'Four engineers covering every layer: websites, dashboards, APIs, databases, integrations, automation.',
    },
    {
      title: 'Built for any industry with operational complexity',
      body: 'Retail, services, manufacturing, logistics, hospitality — wherever process, data, and people meet, we build the system that runs it.',
    },
    {
      title: 'Analytics, automation, and ops included',
      body: 'Real-time visibility across your business plus automated workflows that replace manual handoffs. No third-party BI tool required.',
    },
  ],
} as const;

export const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Discover',
    body: 'We map your current workflows, pain points, and data flows in detail before writing a single line of code.',
  },
  {
    step: '02',
    title: 'Design',
    body: 'Our designers create wireframes and architecture tailored to your team — reviewed and refined with you.',
  },
  {
    step: '03',
    title: 'Build',
    body: 'Four full-stack engineers build your software end-to-end, with weekly check-ins and a live preview environment.',
  },
  {
    step: '04',
    title: 'Deploy',
    body: 'We launch with full documentation, staff onboarding, and a 30-day hypercare period.',
  },
  {
    step: '05',
    title: 'Evolve',
    body: 'As your business grows, your software grows with it. Ongoing support and feature sprints on demand.',
  },
] as const;

export const CAPABILITIES = [
  {
    icon: 'Monitor',
    title: 'Frontend & Website',
    body: 'Marketing sites, storefronts, and customer-facing apps designed to convert and crafted to load fast.',
  },
  {
    icon: 'Server',
    title: 'Backend & Database',
    body: 'APIs, business logic, and Postgres-grade data layers engineered to scale without breaking.',
  },
  {
    icon: 'LayoutDashboard',
    title: 'Dashboards',
    body: 'Operational dashboards built for the people who actually use them — clear, fast, focused on the next action.',
  },
  {
    icon: 'BarChart3',
    title: 'Analytics & Reporting',
    body: 'Real-time insights on revenue, performance, and ops — no separate BI tool required.',
  },
  {
    icon: 'Boxes',
    title: 'Inventory & Operations',
    body: 'Stock, suppliers, work orders, fulfillment — the moving parts of operations in one system you control.',
  },
  {
    icon: 'Users',
    title: 'CRM & Customer Data',
    body: 'A single source of truth for every customer interaction — sales, support, retention, lifecycle.',
  },
  {
    icon: 'Wallet',
    title: 'Payroll & HR',
    body: 'Payroll runs, attendance, leave, compliance, and employee records — wired into your ops, not a silo.',
  },
  {
    icon: 'Search',
    title: 'SEO & Content',
    body: 'Technical SEO, structured data, content systems, and Core Web Vitals tuned to actually rank.',
  },
  {
    icon: 'Megaphone',
    title: 'Digital Marketing & Automation',
    body: 'Email, lifecycle, ads attribution, and journey automations connected to your real customer data.',
  },
  {
    icon: 'Plug',
    title: 'Custom Integrations',
    body: 'Payments, marketplaces, logistics, accounting — connected without the middleware tax.',
  },
] as const;

export const TEAM_MEMBERS = [
  { name: 'Engineer', role: 'Full-Stack Engineer', initials: 'E1' },
  { name: 'Engineer', role: 'Full-Stack Engineer', initials: 'E2' },
  { name: 'Engineer', role: 'Full-Stack Engineer', initials: 'E3' },
  { name: 'Engineer', role: 'Full-Stack Engineer', initials: 'E4' },
  { name: 'Designer', role: 'Product Designer', initials: 'D1' },
  { name: 'Designer', role: 'Product Designer', initials: 'D2' },
] as const;

export const TEAM = {
  eyebrow: 'The Team',
  headline: '4 engineers. 2 designers. One focus.',
  body: 'A small, senior team that has shipped production software across retail, services, logistics, and SaaS. No junior handoffs, no outsourcing.',
} as const;

export const CTA = {
  eyebrow: 'Get in Touch',
  headline: "Let's build your software.",
  body: 'Tell us about your business and what is not working. We will get back within 24 hours.',
} as const;

export const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Team', href: '#team' },
] as const;

export const STATS = [
  { value: '[N]+', label: 'Systems Delivered',     sub: 'End-to-end, production-ready' },
  { value: '4',    label: 'Full-Stack Engineers',  sub: 'No junior handoffs' },
  { value: '100%', label: 'Source Code Owned',     sub: 'Zero vendor lock-in' },
  { value: '30 Days', label: 'Hypercare Window',   sub: 'Post-launch support included' },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      'Replace this with a real client testimonial — what problem did Kavas solve for your business?',
    author: 'Client Name',
    role: 'Owner, [Business]',
    initials: 'CN',
  },
  {
    quote:
      'Replace this with a real client testimonial — how has the custom system changed how your team works?',
    author: 'Client Name',
    role: 'Operations Lead, [Company]',
    initials: 'CN',
  },
  {
    quote:
      'Replace this with a real client testimonial — what would you tell another business considering Kavas?',
    author: 'Client Name',
    role: 'Founder, [Company]',
    initials: 'CN',
  },
] as const;

export const FOOTER = {
  tagline: 'Custom software for modern businesses — built by engineers, not consultants.',
  email: 'hello@kavasconsultancy.com',
  copyright: `© ${new Date().getFullYear()} Kavas Consultancy. All rights reserved.`,
  microline: 'Custom Software for Modern Businesses',
} as const;
