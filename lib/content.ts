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
 *
 * CASING RULE (applied throughout): small labels are Title Case,
 * everything else — headings, theses, promises, list lines — is
 * sentence case. Collins-calm, not brochure.
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
  // NOTE: the verb changed from "Own" to "Carve" at your request. That
  // forced the cycle to change too — "Carve your software." doesn't
  // parse, so the old list (software / models / data / roadmap, i.e.
  // the things you literally walk away owning) had to go. The new list
  // keeps the sentence true whichever word lands, but the hero no
  // longer carries the ownership promise on its own; SITE.tagline, the
  // page title and the case-studies thesis now do that work. Say the
  // word if you'd rather have "Own" back.
  hero: "Carve your advantage.",
  heroCycle: ["advantage.", "edge.", "niche.", "roadmap.", "category."],

  // One line under the hero. Its whole job is to land the category in
  // three seconds — the visitor should never have to scroll to find out
  // what we are. Keep it to a single short sentence.
  heroDek: "Software and applied AI, built to be handed over.",

  /** "cycle" = hover-swaps the last word · "glitch" = WebGL shader hero */
  heroMode: "cycle" as "cycle" | "glitch",

  // The media deck now plays the showreel. Its cut lives in lib/reel.ts and
  // the files are built by scripts/build-reel.sh.

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
  labImageAlt: "The Kavas studio floor, mid-work.",
};

/**
 * The five engagements.
 *
 * IMPORTANT — two voices, on purpose:
 *   `when`    is the reader's situation, in their words. It is what the
 *             rows show, because people scan a services list looking for
 *             themselves, not for our vocabulary. "Embedded Team" means
 *             nothing to someone who hasn't bought one before.
 *   `promise` is our answer to it, and heads the section on /what-we-do.
 *
 * Every row now links to a section that EXPLAINS. Nothing drops a reader
 * into a contact form before they understand what they'd be asking for.
 * Applied AI additionally has a page of its own (`more`) — it is the one
 * engagement a buyer disbelieves until it is evidenced.
 */
export const PROGRAMS = [
  {
    name: "Product Build",
    when: "You need something that doesn’t exist yet.",
    promise: "First sketch to production.",
    body: "One team designs it, builds it and puts it into production — no hand-off between an agency that drew it and a shop that has to make it work.",
    makes: "Web apps · Storefronts · Dashboards · APIs",
    slug: "product-build",
  },
  {
    name: "Applied AI",
    when: "A repetitive job is eating your team’s days.",
    promise: "Models trained on your business.",
    body: "Copilots, retrieval and agents trained on your own data, scored against your own cases before launch, and running on infrastructure you own.",
    makes: "Copilots · Retrieval systems · Agents · Evaluation sets",
    slug: "applied-ai",
    more: { label: "How we do it", href: "/what-we-do/applied-ai" },
  },
  {
    name: "Operations & Data",
    when: "Nine spreadsheets, and no single version of the truth.",
    promise: "One system of record.",
    body: "The exports, re-keying and copy-paste rituals your business quietly runs on, replaced with one source of truth — and reporting that answers a question in seconds rather than a fortnight.",
    makes: "Pipelines · Warehouses · Reporting · Forecasting",
    slug: "operations-data",
  },
  {
    name: "Modernisation",
    when: "It still works. Nobody dares touch it.",
    promise: "Retire the legacy. Keep the logic.",
    body: "We put the old system’s behaviour under test first, then move it in phases rather than over one long weekend — keeping the business logic that took years to learn.",
    makes: "Re-platforming · Data migration · Test coverage · Phased cut-over",
    slug: "modernisation",
  },
  {
    name: "Embedded Team",
    when: "You have the plan and not enough hands.",
    promise: "Senior hands, inside your sprint.",
    body: "Engineers and designers working in your standup, on your board, against your definition of done — for a fixed period, with a plan for handing the work back.",
    makes: "Engineers · Designers · ML engineers · In your sprint",
    slug: "embedded-team",
  },
];

export const PROGRAMS_PAGE = {
  label: "What We Do",
  thesis: "Five ways to stop renting the software your business depends on.",
  // The concrete-nouns line, used on both the home page and here. It
  // exists because a positioning statement tells a reader what we
  // believe; this tells them what we make — and until they know that,
  // nothing else on the page can land.
  makes:
    "Storefronts, dashboards, internal tools, APIs, copilots and the data plumbing underneath — designed, built and trained in one place.",
  // These are commitments, not adjectives. Every line is something a
  // client could hold us to — which is the point. If a line here can't
  // be checked at the end of an engagement, it doesn't belong.
  impactLabel: "What Every Engagement Includes",
  impact: [
    "A fixed scope before a line is written",
    "Something usable at the end of every week",
    "The people who designed it are the people building it",
    "Numbers measured on your data, not a demo",
    "Code, models and infrastructure in your accounts",
    "A hand-over your team can build on without us",
  ],
  capabilitiesLabel: "Capabilities",
  capabilitiesHead: "Built to ship what you’ll own",
  capabilitiesBody: [
    "Design, frontend, backend, data and applied AI under one roof. The person who designs the screen builds it and answers for it in production.",
    "Every engagement ends the same way: the code, the models, the infrastructure and the documentation, in your accounts, under your control.",
  ],
};

/**
 * The named first step. A small studio's hardest conversion problem is
 * the gap between "interesting" and "sign a build contract" — Shape is
 * the small, priced, low-risk thing that bridges it.
 *
 * [Confirm the duration and whether you want to publish a price. A
 * number here converts far better than "starts from a conversation".]
 */
export const START = {
  label: "Where It Starts",
  head: "Every engagement starts with Shape.",
  body: "A short paid phase — [two weeks] — to make the project concrete before anyone commits to building it.",
  outcomes: [
    "A fixed scope, priced",
    "A working prototype of the riskiest part",
    "A plan you could hand to another studio",
  ],
  note: "If the answer is that you shouldn’t build it, this is where we say so. You keep the work either way.",
  cta: "Start a Shape phase",
};

/**
 * ————————————————————————————————————————————————————————
 * APPLIED AI — the one engagement that gets its own page.
 *
 * Why it exists: nobody doubts you can build a dashboard; everybody
 * doubts an agency can train and evaluate a model. Disbelief is the
 * default state, and disbelief is only answered with evidence.
 *
 * The page is an argument in four moves — how we work with models,
 * what "measured" actually means, how a build runs, what we can do —
 * and it ends in the Lab, because that is where the evidence is.
 *
 * ⚠️ THE SCOREBOARD FIGURES ARE ILLUSTRATIVE and are labelled as such
 * on the page. The old site published them unlabelled, which is a
 * credibility risk on a site whose whole claim is "proof over promise".
 * Either keep the disclaimer or replace them with a real Lab result.
 * ————————————————————————————————————————————————————————
 */
export const APPLIED_AI = {
  label: "Applied AI",
  hero: "Language models, trained on your business.",
  dek: "Copilots, retrieval and agents grounded in your own data — measured before they meet a customer, and running on infrastructure you own.",
  cta: "Start a conversation",

  principlesLabel: "How We Work With Models",
  principlesHead: "We train models. We don’t just prompt them.",
  principles: [
    {
      name: "Grounded in your data",
      body: "A model trained on the open web knows everything except your business. We start with your documents, tickets and records — and every answer cites where it came from.",
    },
    {
      name: "Measured before it ships",
      body: "We score against cases your team already answered correctly. The evaluation set is yours, runs on every change, and outlives whichever model is fashionable next quarter.",
    },
    {
      name: "Right-sized, not oversized",
      body: "The largest model is rarely the right one. We test the small self-hosted option against the frontier API and tell you which tasks are worth owning — including when the answer is no model at all.",
    },
    {
      name: "Owned by you",
      body: "Weights, prompts, pipelines, evaluations and infrastructure, in your own accounts. No orchestration layer only we can maintain, no licence on your own data.",
    },
  ],

  evalLabel: "Evaluation",
  evalHead: "The scoreboard comes before the model.",
  evalBody:
    "We agree what “good” means and how it gets counted before anything is trained. This is the shape of the report you get back.",
  evalMetrics: [
    {
      figure: "94.2",
      title: "Answer accuracy",
      sub: "Matched the human answer on held-out cases",
    },
    {
      figure: "0.91",
      title: "Brand-tone match",
      sub: "Scored against your own published writing",
    },
    {
      figure: "99.1",
      title: "Safety / policy",
      sub: "Refused what it should refuse",
    },
    {
      figure: "96.5",
      title: "Citation coverage",
      sub: "Answers traceable to a source document",
    },
  ],
  evalNote:
    "An example of the format, not a result. Yours come from your own cases — and we bring them to you whether they flatter us or not.",

  lifecycleLabel: "How a Build Runs",
  lifecycle: [
    {
      step: "01",
      name: "Curate",
      body: "Your exports, documents and transcripts, cleaned and labelled. Most of the quality of the finished system is decided here.",
    },
    {
      step: "02",
      name: "Fine-tune",
      body: "Supervised fine-tuning, adapters, preference tuning — or none of them, when retrieval alone already clears the bar. We try the cheap thing first.",
    },
    {
      step: "03",
      name: "Evaluate",
      body: "Accuracy, tone, safety and citations on held-out cases, plus prompts written to make it misbehave. Nothing ships on a number we can’t show you.",
    },
    {
      step: "04",
      name: "Deploy",
      body: "Your cloud account, your keys, your bill — sized to actual traffic. Where a hosted API is genuinely the better answer, we say so.",
    },
    {
      step: "05",
      name: "Monitor",
      body: "Tracing on every call, drift watched against the evaluation set, and a cost model that accounts for retries rather than the headline token price.",
    },
  ],

  capabilitiesLabel: "Capabilities",
  capabilities: [
    {
      name: "Fine-tuning & training",
      body: "Teaching a base model your domain, your formats and your tone.",
      stack: "SFT · LoRA / PEFT · DPO",
    },
    {
      name: "Retrieval & search",
      body: "Answers grounded in your documents, with permissions enforced at retrieval — not at the prompt.",
      stack: "Embeddings · pgvector · Rerankers",
    },
    {
      name: "Agents & automation",
      body: "Systems that take actions in your tools, bounded by what they’re allowed to touch.",
      stack: "Tool use · Planning · Guardrails",
    },
    {
      name: "Evaluation & safety",
      body: "The scoreboard, the red-team set, and the tracing that shows why an answer happened.",
      stack: "Evals · Red-team · Tracing",
    },
    {
      name: "Inference & deployment",
      body: "Models running on your own infrastructure at a cost you modelled in advance.",
      stack: "vLLM · Quantisation · Autoscaling",
    },
    {
      name: "Data curation & labelling",
      body: "The unglamorous work that decides whether any of the above is worth doing.",
      stack: "Cleaning · Labelling · Synthesis",
    },
  ],

  // The page ends in evidence, not a brochure claim. These slugs must
  // exist in lib/lab.ts.
  proofLabel: "Proof",
  proofHead: "We publish what we measure.",
  proofSlugs: [
    "support-copilot-evals",
    "small-models-real-tasks",
    "retrieval-that-respects-permissions",
  ],
  proofCta: "All of the Lab",
};

export const LABPAGE = {
  title: "Lab",
  dek: "Experiments, benchmarks and small tools. We would rather show you a measurement than tell you we are good at this.",
};

export const STUDIO = {
  heroLabel: "The Studio",
  hero: "A small team, end to end.",
  // [VERIFY the head-count before launch — it is the most checkable
  // claim on the site, and being specific is worth more than "small".]
  intro:
    "Four engineers and two designers. We take on a few engagements at a time and carry each one from the first sketch to the hand-over — because a chain of specialists passing documents to each other is how software gets expensive and nobody ends up accountable.",
  values: [
    {
      name: "Ownership, not lock-in",
      body: "The code, the models, the data and the infrastructure stay in your accounts, under a licence that owes us nothing. We would rather be re-hired than depended on.",
    },
    {
      name: "Small and senior",
      body: "The people in the kick-off are the people writing the code. No account layer, no junior team inheriting the project after the pitch.",
    },
    {
      name: "Proof over promise",
      body: "Anything we claim, we measure — accuracy against your own cases, speed on real devices, hours saved counted honestly. When a number is unflattering, we bring it to you rather than around you.",
    },
    {
      name: "Built to be understood",
      body: "An elegant abstraction is a liability if only its author can maintain it. The test is whether your team can ship a change without calling us.",
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
  body: "Tell us what is slow, expensive, or held together by one person who is about to go on holiday. If we are a fit, the next step is a short call — no pitch deck, no discovery invoice.",
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
  /**
   * The giant centred serif nav is DERIVED from NAV (see Footer.tsx), so
   * the footer can never drift out of sync with the menu again. It used
   * to be a hand-kept subset in a different order, which quietly told
   * visitors the two navigations led to different places.
   *
   * Only two items are held back, and both are still reachable:
   *   "/"        — the wordmark in the header is Home.
   *   "/contact" — it is the pill directly below, as "Work with us".
   */
  bigNavExclude: ["/", "/contact"],
  pill: { name: "Work with us", href: "/contact" },
  newsletterLabel: "Keep up to date",
};
