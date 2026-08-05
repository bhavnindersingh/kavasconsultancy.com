/**
 * ————————————————————————————————————————————————————————
 * KAVAS — SINGLE SOURCE OF TRUTH FOR ALL SITE COPY
 *
 * This is drafted copy, written from Kavas' positioning: a small
 * software and applied-AI studio whose promise is that the client
 * ends up owning what was built.
 *
 * Read it as a strong first draft, not finished truth. Two rules
 * before launch:
 *   1. Anything in [square brackets] is a fact only you can supply.
 *   2. Any claim about team size, response times or client outcomes
 *      must be verified — those are promises, not copy.
 * ————————————————————————————————————————————————————————
 */

export const SITE = {
  name: "Kavas",
  wordmark: "KAVAS",
  tagline:
    "Kavas is a software and applied-AI studio. We design, build and train the systems your business runs on — and you own every part of them.",
  email: "hello@kavasconsultancy.com",
  // TODO: real social URLs
  social: [
    { name: "LinkedIn", href: "#" },
    { name: "Instagram", href: "#" },
  ],
};

export const NAV = [
  { name: "Home", href: "/" },
  { name: "Case Studies", href: "/work" },
  { name: "What We Do", href: "/what-we-do" },
  { name: "Studio", href: "/studio" },
  { name: "Lab", href: "/lab" },
  { name: "Contact", href: "/contact" },
];

export const HOME = {
  // Calm, centered, declarative — Collins "Rewrite your worth."
  // The last word cycles on hover (see components/HeroStatement.tsx):
  // the sentence stays true whichever word lands, and the list doubles
  // as a statement of what clients actually walk away owning.
  hero: "Own your advantage.",
  heroCycle: ["advantage.", "software.", "models.", "data.", "roadmap."],

  /** "cycle" = hover-swaps the last word · "glitch" = WebGL shader hero */
  heroMode: "cycle" as "cycle" | "glitch",

  // wide on desktop, portrait on mobile — supply both crops if you can
  heroMedia: "[Showreel or hero image — drop it here]",

  programsLabel: "What We Do",
  programsThesis:
    "Five ways to stop renting the software your business depends on.",
  programsCta: "Explore",

  casesLabel: "Case Studies",
  casesThesis: "Built to be handed over, not held hostage.",
  casesCta: "Explore",
  casesMore: "In the process of building more →",

  labLabel: "Lab",
  labLine: "We publish what we measure.",
  labCta: "Explore",
  labChip: "[Studio or workbench photo — replace]",
};

export const PROGRAMS = [
  {
    name: "Product Build",
    promise: "First Sketch to Production.",
    slug: "product-build",
  },
  {
    name: "Applied AI",
    promise: "Models Trained on Your Business.",
    slug: "applied-ai",
  },
  {
    name: "Operations & Data",
    promise: "One System of Record.",
    slug: "operations-data",
  },
  {
    name: "Modernisation",
    promise: "Retire the Legacy. Keep the Logic.",
    slug: "modernisation",
  },
  {
    name: "Embedded Team",
    promise: "Senior Hands, Inside Your Sprint.",
    slug: "embedded-team",
  },
];

export const PROGRAMS_PAGE = {
  label: "What We Do",
  thesis: "Five ways to stop renting the software your business depends on.",
  impactLabel: "What Our Work Delivers",
  impact: [
    "Ship in Weeks, Not Quarters",
    "Own Your Stack Outright",
    "Automate the Busywork",
    "Turn Data Into Decisions",
    "Retire Legacy Without Risk",
    "Compound Your Advantage",
  ],
  capabilitiesLabel: "Capabilities",
  capabilitiesHead: "Built to Ship What You’ll Own",
  capabilitiesBody: [
    "Design, frontend, backend, data and applied AI under one roof. The person who designs the screen builds it and answers for it in production, so nothing is lost in translation between teams that never met.",
    "Every engagement is scoped to a fixed shape, ships something usable in weeks rather than quarters, and ends with a hand-over: the code, the models, the infrastructure and the documentation, in your accounts, under your control.",
  ],
};

export const LABPAGE = {
  title: "Lab",
  dek: "Experiments, benchmarks and small tools. We would rather show you a measurement than tell you we are good at this.",
};

export const STUDIO = {
  heroLabel: "The Studio",
  hero: "A small team, end to end.",
  intro:
    "Kavas is a small studio of engineers and designers. We take on a few engagements at a time and carry each one from the first sketch to the hand-over, because the alternative — a chain of specialists passing documents to each other — is how software gets expensive and nobody ends up accountable.",
  values: [
    {
      name: "Ownership, not lock-in",
      body: "You keep the code, the models, the data and the infrastructure, in your own accounts, under a licence that owes us nothing. If you never call us again, everything still runs. We would rather be re-hired than depended on.",
    },
    {
      name: "Small and senior",
      body: "The people in the kick-off are the people writing the code. There is no account layer between you and the work, no junior team inheriting the project after the pitch, and no status meeting that exists to reassure you.",
    },
    {
      name: "Proof over promise",
      body: "Anything we claim, we measure — model accuracy against your own historical cases, page speed on real devices, hours saved counted honestly. When a number is unflattering we bring it to you rather than around you.",
    },
    {
      name: "Built to be understood",
      body: "The most elegant abstraction is a liability if only its author can maintain it. We write boring, obvious code and documentation aimed at whoever inherits it — the test being whether your team can ship a change without calling us.",
    },
  ],
  teamLabel: "The People",
  // Real names and portraits go here — placeholders left deliberately.
  team: [
    { name: "[Name]", role: "Engineering Lead" },
    { name: "[Name]", role: "Product Designer" },
    { name: "[Name]", role: "Full-stack Engineer" },
    { name: "[Name]", role: "ML Engineer" },
    { name: "[Name]", role: "Designer" },
    { name: "[Name]", role: "Engineer" },
  ],
  processLabel: "How We Work",
  process: [
    {
      step: "01",
      name: "Shape",
      body: "A short paid phase to make the project concrete: what it must do, what it must not, and what it costs. You leave with a fixed scope, a prototype of the risky part, and a plan you could hand to someone else.",
    },
    {
      step: "02",
      name: "Build",
      body: "Weekly releases to an environment you can use, not screenshots in a deck. Every Friday there is something running and a short note on what changed, what it cost, and what we learned.",
    },
    {
      step: "03",
      name: "Prove",
      body: "Before launch we measure against the goals set in Shape — accuracy on your real cases, performance on real devices, the workflow timed end to end. If a number misses, we say so and fix it.",
    },
    {
      step: "04",
      name: "Hand over",
      body: "Documentation for the person who inherits it, a walkthrough with your team, and a support window while they drive. Then the accounts, the repositories and the models are yours, and the engagement genuinely ends.",
    },
  ],
};

export const CONTACT = {
  heroLabel: "Contact",
  hero: "Tell us what you want to own.",
  body: "Tell us what is slow, expensive or held together by one person who is about to go on holiday. If we are a fit, the next step is a short call to decide whether a Shape phase makes sense — no pitch deck, no discovery invoice.",
  formNote: "We reply within one working day.",
  projectTypes: [
    "New product",
    "Applied AI",
    "Modernisation",
    "Operations & data",
    "Something else",
  ],
};

export const FOOTER = {
  // Giant centred serif nav — Collins pattern.
  bigNav: [
    { name: "Case Studies", href: "/work" },
    { name: "What We Do", href: "/what-we-do" },
    { name: "Lab", href: "/lab" },
  ],
  pill: { name: "Work with us", href: "/contact" },
  small: [
    { name: "Studio", href: "/studio" },
    { name: "Contact", href: "/contact" },
  ],
  newsletterLabel: "Keep up to date",
};
