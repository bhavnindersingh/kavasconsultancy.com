// ─────────────────────────────────────────────────────────────────────────
// Centralized content for the Kavas Consultancy site.
// Single source of truth for copy and data across every page.
// ─────────────────────────────────────────────────────────────────────────

export const SITE = {
  email: 'hello@kavasconsultancy.com',
  tagline:
    'Custom software and applied AI — designed, built, and trained by engineers, owned by you.',
  year: 2026,
} as const;

export const NAV_LINKS = [
  { label: 'Work', href: '/work' },
  { label: 'Applied AI', href: '/ai' },
  { label: 'About', href: '/about' },
] as const;

// ── Home ─────────────────────────────────────────────────────────────────
export const HOME = {
  hero: {
    eyebrow: 'Custom Software · LLM Training · Applied AI',
    headlineLead: 'We build the software',
    headlineEmphasis: '— and train the models —',
    headlineTail: 'your business runs on.',
    body: 'From storefronts and dashboards to fine-tuned language models and AI agents, Kavas designs, builds, and ships custom systems end-to-end — engineered by a senior team and owned entirely by you.',
    ctaPrimary: 'Start a Conversation',
    ctaSecondary: 'See Our Work',
    badges: ['4 Engineers · 2 Designers', 'Code & Model Ownership', 'Software + Applied AI'],
  },
  marquee: [
    'Frontend & Web', 'Dashboards', 'Backend & Databases', 'LLM Fine-tuning',
    'Retrieval (RAG)', 'AI Agents', 'Evaluation & Safety', 'Analytics',
    'Forecasting', 'Integrations', 'Inventory & Ops', 'Payroll & HR',
    'SEO & Content', 'Automation',
  ],
  practicesEyebrow: 'What We Do',
  practicesHeadline: 'Engineering and intelligence, under one roof.',
  practices: [
    {
      n: '01',
      t: 'Product Engineering',
      d: 'Websites, dashboards, APIs, and databases — built end-to-end and shaped around how your team actually works.',
      items: ['Frontend & Web', 'Backend & Databases', 'Dashboards', 'Integrations'],
      href: '/work',
      cta: 'See the work',
    },
    {
      n: '02',
      t: 'Applied AI & LLMs',
      d: 'Fine-tuned models, retrieval, and agents — grounded in your data and measured before they ever reach a customer.',
      items: ['LLM Fine-tuning', 'Retrieval (RAG)', 'Agents & Automation', 'Evaluation & Safety'],
      href: '/ai',
      cta: 'Explore AI practice',
    },
    {
      n: '03',
      t: 'Operations & Data',
      d: 'Analytics, forecasting, and the data plumbing that makes everything else fast, current, and trustworthy.',
      items: ['Analytics & Reporting', 'Forecasting', 'Automation', 'Data Pipelines'],
      href: '/work',
      cta: 'See the work',
    },
  ],
  aiBand: {
    eyebrow: 'Applied AI & LLMs',
    headlineLead: 'Models trained on your data.',
    headlineEmphasis: 'Owned by you.',
    body: "We don't bolt a generic chatbot onto your business. We curate your data, fine-tune and evaluate models against it, ground them in your live systems, and hand over everything — weights, pipelines, and infrastructure included.",
    bullets: [
      'LLM fine-tuning & training',
      'Retrieval (RAG) & search',
      'Agents & workflow automation',
      'Evaluation, guardrails & safety',
    ],
    cta: 'Explore our AI practice',
    evals: [
      { l: 'Answer accuracy', v: '94.2', w: '94%' },
      { l: 'Brand-tone match', v: '0.91', w: '91%' },
      { l: 'Safety / policy', v: '99.1', w: '99%' },
    ],
  },
  featuredEyebrow: 'Selected Work',
  featuredHeadline: "Systems we've shipped, in production.",
  featured: ['support-copilot', 'retail-pos', 'doc-intelligence'],
  process: [
    { n: '01', t: 'Discover', d: 'We map your workflows, pain points, and data before any code or model is written.' },
    { n: '02', t: 'Design', d: 'Wireframes, architecture, and a data plan — reviewed and refined with you.' },
    { n: '03', t: 'Build & Train', d: 'Engineers ship the system; where it helps, we fine-tune and evaluate models.' },
    { n: '04', t: 'Deploy', d: 'Launch with documentation, onboarding, and a 30-day hypercare window.' },
    { n: '05', t: 'Evolve', d: 'Ongoing support and feature sprints as your business grows.' },
  ],
  processEyebrow: 'How We Work',
  processHeadline: 'From discovery to handover.',
  stats: [
    { k: 'N+', l: 'Systems Delivered', s: 'End-to-end, production-ready' },
    { k: '4', l: 'Full-Stack Engineers', s: 'No junior handoffs' },
    { k: '100%', l: 'Source & Model Ownership', s: 'Zero vendor lock-in' },
    { k: '30-Day', l: 'Hypercare Window', s: 'Post-launch support included' },
  ],
  teamPreview: {
    eyebrow: 'The Team',
    headline: 'A senior team of four engineers and two designers.',
    body: 'No junior handoffs, no outsourcing. The people who scope your project are the people who build it — and train it.',
    cta: 'Meet the team',
    ids: ['E1', 'E2', 'E3', 'E4', 'D1', 'D2'],
  },
} as const;

// ── Shared CTA blocks ────────────────────────────────────────────────────
export const CTA_HOME = {
  headline: "Let's build the software your business runs on.",
  body: "Tell us about your business and what isn't working. No sales pitch — just a conversation, and a reply within 24 hours.",
  button: 'Start a Conversation',
} as const;

export const CTA_WORK = {
  headline: 'Your project could be the next one here.',
  button: 'Start a Conversation',
} as const;

export const CTA_AI = {
  headline: 'Have data and a problem worth solving?',
  body: "Tell us what you want the model to do. We'll tell you honestly whether AI is the right tool — and how we'd build it.",
  button: 'Scope an AI Project',
} as const;

export const CTA_ABOUT = {
  headline: "Let's talk about what you're building.",
  button: 'Start a Conversation',
} as const;

export const CTA_CASE = {
  headline: 'Want results like these?',
  button: 'Start a Conversation',
} as const;

// ── Work index ───────────────────────────────────────────────────────────
export const WORK = {
  eyebrowHead: 'Selected Work',
  headlineLead: 'Software and AI,',
  headlineEmphasis: 'shipped to production.',
  body: "A cross-section of the systems we've built end-to-end — each shaped around a real team's workflow, and owned outright by the business that runs it.",
  filters: [
    { key: 'all', label: 'All Work' },
    { key: 'Product Engineering', label: 'Product Engineering' },
    { key: 'Applied AI & LLMs', label: 'Applied AI & LLMs' },
    { key: 'Data & AI', label: 'Data & AI' },
  ],
} as const;

// ── Applied AI page ──────────────────────────────────────────────────────
export const AI = {
  hero: {
    eyebrow: 'Applied AI & LLMs',
    headlineLead: 'Language models, trained on',
    headlineEmphasis: 'your business.',
    body: 'We fine-tune, evaluate, and ship language models grounded in your own data — copilots, retrieval systems, and agents that sound like you, cite real facts, and run on infrastructure you own. Not a generic chatbot bolted onto the side.',
    ctaPrimary: 'Scope an AI Project',
    ctaSecondary: 'See AI Case Studies',
    evals: [
      { l: 'Answer accuracy', v: '94.2', w: '94%' },
      { l: 'Brand-tone match', v: '0.91', w: '91%' },
      { l: 'Safety / policy', v: '99.1', w: '99%' },
      { l: 'Citation coverage', v: '96.5', w: '96%' },
    ],
  },
  principlesEyebrow: 'How We Think About AI',
  principlesHeadline: 'Useful, measured, and yours.',
  principles: [
    { n: '01', t: 'Grounded in your data', d: 'Models learn from your tickets, documents, and records — not the open web — so answers reflect how your business actually operates.' },
    { n: '02', t: 'Measured before they ship', d: 'Every model is scored on held-out data for accuracy, tone, and safety. We release on evidence, not vibes.' },
    { n: '03', t: 'Right-sized, not oversized', d: 'We pick the smallest model that clears the bar — cheaper to run, faster to answer, and far easier to own.' },
    { n: '04', t: 'Owned by you', d: 'Weights, prompts, pipelines, and infrastructure are yours. No black box, no per-seat lock-in.' },
  ],
  servicesEyebrow: 'What We Build',
  servicesHeadline: 'The full AI stack, end to end.',
  services: [
    { n: '01', t: 'LLM Fine-tuning & Training', d: 'Adapt open models to your task and voice with supervised and preference tuning on your curated data.', tech: 'SFT · LoRA / PEFT · DPO' },
    { n: '02', t: 'Retrieval (RAG) & Search', d: 'Semantic search and grounded answers that cite the exact source — over your docs, tickets, and records.', tech: 'Embeddings · pgvector · Rerank' },
    { n: '03', t: 'Agents & Automation', d: 'Multi-step agents that take real actions across your tools, with the guardrails to do it safely.', tech: 'Tools · Planning · Guardrails' },
    { n: '04', t: 'Evaluation & Safety', d: 'Eval harnesses, red-teaming, and guardrails so you know — and can prove — a model is ready.', tech: 'Evals · Red-team · Tracing' },
    { n: '05', t: 'Inference & Deployment', d: 'Efficient serving with quantization and autoscaling — on your infrastructure or ours.', tech: 'vLLM · Quantization · Autoscale' },
    { n: '06', t: 'Data Curation & Labeling', d: 'Turning raw, messy data into the clean, high-signal training sets that make models actually work.', tech: 'Cleaning · Labeling · Synthesis' },
  ],
  trainingBand: {
    eyebrow: 'Model Training',
    headline: 'We train models — not just prompt them.',
    body: 'Prompting only goes so far. When the task is specific, the data is yours, and the bar is high, a trained model is faster, cheaper, and more reliable than a giant general one. We choose the right technique for the job and prove it on your data.',
    techniques: [
      'Supervised fine-tuning (SFT)',
      'LoRA / PEFT',
      'Preference tuning (DPO / RLHF)',
      'Distillation',
      'Quantization (int8 / int4)',
      'Continued pretraining',
    ],
    lifecycle: [
      { n: '01', t: 'Curate', d: 'Assemble and clean a high-quality dataset from your own systems.' },
      { n: '02', t: 'Fine-tune', d: 'Train with the right technique for the task, tracked end to end.' },
      { n: '03', t: 'Evaluate', d: 'Score on held-out data for accuracy, tone, and safety.' },
      { n: '04', t: 'Deploy', d: 'Serve efficiently and ground it in your live systems.' },
      { n: '05', t: 'Monitor', d: 'Watch quality in production and retrain as your data shifts.' },
    ],
  },
  caseEyebrow: 'AI in Production',
  caseHeadline: "AI work we've shipped.",
  aiWork: [
    { id: 'support-copilot', label: 'Customer Support · Fine-tuning', title: 'Support copilot, fine-tuned on your voice', oneLiner: 'A drafting assistant trained on your own resolved tickets — not a generic chatbot.' },
    { id: 'doc-intelligence', label: 'Professional Services · RAG', title: 'Document intelligence platform', oneLiner: 'Turn contracts, invoices, and reports into structured, searchable, cited data.' },
    { id: 'revenue-analytics', label: 'SaaS · Data & Forecasting', title: 'Revenue analytics & forecasting', oneLiner: 'Metering, dashboards, and a forecast with honest uncertainty leaders act on.' },
  ],
} as const;

// ── About page ───────────────────────────────────────────────────────────
export const ABOUT = {
  hero: {
    eyebrow: 'About Kavas',
    headlineLead: 'A small team that ships,',
    headlineEmphasis: 'end to end.',
    body: 'Kavas is four engineers and two designers who build custom software — and, increasingly, the AI behind it. We started because too many businesses were paying for bloated platforms they never fully used. Our answer is the opposite: systems built to fit, owned by you, with no one between you and the people who wrote the code.',
  },
  valuesEyebrow: 'How We Operate',
  valuesHeadline: 'Principles, not a pitch deck.',
  values: [
    { n: '01', t: 'Senior, all the way down', d: 'The people who scope your work build it. No junior handoffs, no offshore black box — just a small team that owns the outcome.' },
    { n: '02', t: 'Built to fit, not to template', d: 'We map how you actually work and build to match. No bending your business around someone else’s software.' },
    { n: '03', t: 'AI only where it earns its place', d: 'We’ll tell you honestly when a model helps and when it doesn’t. When it does, we train and measure it on your data.' },
    { n: '04', t: 'Ownership over lock-in', d: 'Code, weights, pipelines, and infrastructure are handed over in full. You can run and grow it with or without us.' },
  ],
  teamEyebrow: 'The Team',
  teamHeadline: 'Four engineers. Two designers.',
  teamBody: 'The people who scope your project are the people who design, build, and train it. Senior throughout — no handoffs to juniors, no outsourcing.',
  team: [
    { id: 'e1', tag: 'Engineering', name: 'Engineer One', role: 'Full-Stack Engineer', initials: 'E1' },
    { id: 'e2', tag: 'Engineering', name: 'Engineer Two', role: 'Full-Stack Engineer', initials: 'E2' },
    { id: 'e3', tag: 'Engineering', name: 'Engineer Three', role: 'Full-Stack / ML Engineer', initials: 'E3' },
    { id: 'e4', tag: 'Engineering', name: 'Engineer Four', role: 'Full-Stack / ML Engineer', initials: 'E4' },
    { id: 'd1', tag: 'Design', name: 'Designer One', role: 'Product Designer', initials: 'D1' },
    { id: 'd2', tag: 'Design', name: 'Designer Two', role: 'Product Designer', initials: 'D2' },
  ],
  ownership: {
    eyebrow: 'Built by engineers, owned by you',
    headlineLead: 'No lock-in. No black box.',
    headlineEmphasis: 'No middlemen.',
    body: 'When we finish, you get everything: source code, model weights, pipelines, infrastructure, and documentation. The system is yours to run, change, and grow — with or without us.',
  },
} as const;

// ── Contact page ─────────────────────────────────────────────────────────
export const CONTACT = {
  eyebrow: 'Get in Touch',
  headlineLead: "Let's build your",
  headlineEmphasis: 'software.',
  body: "Tell us about your business and what isn't working. We'll get back within 24 hours — no sales pitch, just a conversation.",
  promises: [
    'We respond within 24 hours',
    'No sales pitch — just a conversation',
    'Free scoping call to understand your needs',
  ],
  types: [
    { key: 'software', label: 'Custom Software' },
    { key: 'ai', label: 'Applied AI / LLMs' },
    { key: 'both', label: 'Both' },
    { key: 'unsure', label: 'Not sure yet' },
  ],
} as const;

// ── Case studies (shared source) ─────────────────────────────────────────
export type ApproachStep = { t: string; d: string };
export type Outcome = { k: string; l: string };
export type CaseStudy = {
  id: string;
  sector: string;
  discipline: string;
  title: string;
  oneLiner: string;
  year: string;
  duration: string;
  role: string;
  tags: string[];
  stack: string[];
  challenge: string;
  approach: ApproachStep[];
  outcomes: Outcome[];
  quote: { text: string; name: string; role: string };
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'retail-pos',
    sector: 'Retail',
    discipline: 'Product Engineering',
    title: 'Unified storefront, stock & checkout',
    oneLiner: 'One system from shelf to receipt — real-time inventory across every location.',
    year: '2025',
    duration: '14 weeks',
    role: 'Discovery → Design → Build → Hypercare',
    tags: ['Frontend', 'Backend & DB', 'Inventory', 'Payments'],
    stack: ['React', 'Node', 'PostgreSQL', 'Stripe'],
    challenge:
      'A multi-location retailer was running three disconnected tools — a website, a spreadsheet for stock, and a legacy POS. Inventory was always wrong by closing time and staff reconciled by hand.',
    approach: [
      { t: 'Mapped the real workflow', d: 'We shadowed staff across two stores and the warehouse to chart how stock actually moves, not how the manual said it should.' },
      { t: 'Single source of truth', d: 'A unified data layer wired the storefront, POS, and warehouse to one live inventory ledger with audit history.' },
      { t: 'Built for the counter', d: 'A fast, keyboard-first checkout designed for peak-hour speed — and a back-office that reconciles itself.' },
    ],
    outcomes: [
      { k: 'Real-time', l: 'Stock accuracy across locations' },
      { k: '1 system', l: 'Replaced 3 disconnected tools' },
      { k: 'Owned', l: 'Full source & infrastructure handover' },
    ],
    quote: { text: 'Add a real client quote here — what changed for the team once the system went live.', name: 'Client Name', role: 'Owner, Retail Group' },
  },
  {
    id: 'fleet-dispatch',
    sector: 'Logistics',
    discipline: 'Product Engineering',
    title: 'Fleet routing & live dispatch board',
    oneLiner: 'Assign, track, and reconcile deliveries from a single control room.',
    year: '2025',
    duration: '11 weeks',
    role: 'Design → Build → Deploy',
    tags: ['Dashboards', 'Integrations', 'Maps', 'Realtime'],
    stack: ['React', 'Go', 'PostgreSQL', 'Mapbox'],
    challenge:
      'Dispatchers juggled phone calls, a whiteboard, and a spreadsheet to route a growing fleet. Nobody had a live picture of where vehicles were or whether jobs were on time.',
    approach: [
      { t: 'A single control surface', d: 'One board showing every vehicle, job, and ETA in real time — replacing the whiteboard and the calls.' },
      { t: 'Routing that fits the work', d: "Assignment logic tuned to the operation's real constraints: zones, capacity, and driver shifts." },
      { t: 'Reconciliation built in', d: 'Proof-of-delivery and exceptions flow straight back into billing — no second data entry.' },
    ],
    outcomes: [
      { k: 'Live', l: 'Fleet visibility, end to end' },
      { k: '0', l: 'Double data-entry between dispatch & billing' },
      { k: 'Owned', l: 'Full source & infrastructure handover' },
    ],
    quote: { text: 'Add a real client quote here — what the dispatch team noticed first.', name: 'Client Name', role: 'Operations Lead, Logistics Co.' },
  },
  {
    id: 'support-copilot',
    sector: 'Customer Support',
    discipline: 'Applied AI & LLMs',
    title: 'Support copilot, fine-tuned on your voice',
    oneLiner: 'A drafting assistant trained on your own resolved tickets — not a generic chatbot.',
    year: '2026',
    duration: '9 weeks',
    role: 'Data → Fine-tune → Eval → Deploy',
    tags: ['LLM Fine-tuning', 'RAG', 'Evals', 'Human-in-the-loop'],
    stack: ['Python', 'PyTorch', 'vLLM', 'Postgres + pgvector'],
    challenge:
      'A support team was drowning in repetitive tickets. Off-the-shelf AI replies sounded nothing like the brand and got policy details wrong, so agents stopped trusting it.',
    approach: [
      { t: 'Trained on real resolutions', d: "We curated and fine-tuned on the team's own high-quality resolved tickets so drafts match their tone and policy." },
      { t: 'Grounded in current truth', d: 'A retrieval layer pulls live policy and order data so answers cite the right facts, not stale ones.' },
      { t: 'Measured before trusted', d: 'An evaluation harness scored accuracy, tone, and safety on held-out tickets before anything reached a customer.' },
    ],
    outcomes: [
      { k: 'On-brand', l: "Drafts in the team's own voice" },
      { k: 'Grounded', l: 'Answers cite live policy & order data' },
      { k: 'Eval-gated', l: 'Scored before every release' },
    ],
    quote: { text: 'Add a real client quote here — how the copilot changed the agents’ day.', name: 'Client Name', role: 'Head of Support, SaaS Co.' },
  },
  {
    id: 'doc-intelligence',
    sector: 'Professional Services',
    discipline: 'Applied AI & LLMs',
    title: 'Document intelligence platform',
    oneLiner: 'Turn contracts, invoices, and reports into structured, searchable data.',
    year: '2026',
    duration: '12 weeks',
    role: 'Architecture → Build → Eval → Deploy',
    tags: ['RAG', 'Extraction', 'Search', 'Pipelines'],
    stack: ['Python', 'LangGraph', 'pgvector', 'React'],
    challenge:
      'Analysts spent hours reading long documents to pull the same handful of fields. Knowledge was locked in PDFs no one could search.',
    approach: [
      { t: 'Reliable extraction', d: 'A pipeline that reads documents, extracts the fields that matter, and flags low-confidence results for review.' },
      { t: 'Ask your archive', d: 'Semantic search and grounded answers across the whole document store, with citations back to the source page.' },
      { t: 'Auditable by design', d: 'Every answer links to its evidence so analysts can verify, not just trust.' },
    ],
    outcomes: [
      { k: 'Searchable', l: 'Years of documents, instantly queryable' },
      { k: 'Cited', l: 'Every answer linked to its source' },
      { k: 'Review-ready', l: 'Low-confidence results flagged, not hidden' },
    ],
    quote: { text: "Add a real client quote here — what the analysts can now do that they couldn't.", name: 'Client Name', role: 'Partner, Advisory Firm' },
  },
  {
    id: 'booking-crm',
    sector: 'Services',
    discipline: 'Product Engineering',
    title: 'Scheduling & customer lifecycle',
    oneLiner: 'Bookings, reminders, and history wired into one shared customer record.',
    year: '2024',
    duration: '10 weeks',
    role: 'Discovery → Design → Build',
    tags: ['Booking', 'CRM', 'Automation', 'Payments'],
    stack: ['React', 'Node', 'PostgreSQL', 'Twilio'],
    challenge:
      'A services business ran bookings in one app, customer notes in another, and reminders by hand. Regulars felt like strangers every time they returned.',
    approach: [
      { t: 'One customer record', d: 'Bookings, history, and preferences unified so every interaction starts with full context.' },
      { t: 'Automated the busywork', d: 'Reminders, confirmations, and follow-ups triggered automatically off the schedule.' },
      { t: 'Designed for the front desk', d: 'A calendar the team actually enjoys using, fast enough for a ringing phone.' },
    ],
    outcomes: [
      { k: 'Unified', l: 'One record per customer, full history' },
      { k: 'Automated', l: 'Reminders & follow-ups, hands-off' },
      { k: 'Owned', l: 'Full source & infrastructure handover' },
    ],
    quote: { text: 'Add a real client quote here — what regulars or staff said about the change.', name: 'Client Name', role: 'Founder, Services Studio' },
  },
  {
    id: 'revenue-analytics',
    sector: 'SaaS',
    discipline: 'Data & AI',
    title: 'Revenue analytics & forecasting',
    oneLiner: 'Metering, dashboards, and a forecast leaders actually act on.',
    year: '2025',
    duration: '8 weeks',
    role: 'Data model → Build → Forecast',
    tags: ['Analytics', 'Forecasting', 'Dashboards', 'Pipelines'],
    stack: ['Python', 'dbt', 'PostgreSQL', 'React'],
    challenge:
      'Leadership made decisions on a monthly spreadsheet that was out of date the moment it was sent. Nobody agreed on what the numbers meant.',
    approach: [
      { t: 'One trusted model', d: 'A clean, documented data model so every chart traces back to the same definitions.' },
      { t: 'Decision-ready dashboards', d: 'Revenue, retention, and pipeline surfaced for the people who act on them — not a BI maze.' },
      { t: 'A forecast with a range', d: 'Statistical forecasting that shows the likely range, not a single false-precision number.' },
    ],
    outcomes: [
      { k: 'One source', l: 'Shared definitions across the company' },
      { k: 'Daily', l: 'Numbers fresh, not monthly' },
      { k: 'Ranged', l: 'Forecasts with honest uncertainty' },
    ],
    quote: { text: 'Add a real client quote here — how decisions changed with live numbers.', name: 'Client Name', role: 'COO, SaaS Company' },
  },
];

export function getCaseStudy(id: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.id === id);
}

export const FOOTER = {
  capabilities: [
    'Product Engineering',
    'LLM Training & Fine-tuning',
    'RAG, Agents & Automation',
    'Analytics & Forecasting',
  ],
  explore: [
    { label: 'Work', href: '/work' },
    { label: 'Applied AI', href: '/ai' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
} as const;
