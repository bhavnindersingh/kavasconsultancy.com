/**
 * ————————————————————————————————————————————————————————
 * CASE STUDIES
 *
 * Five cases, one per engagement type.
 *
 * ✅ RAPIDQS IS REAL — written from vivekchittauria.com/rapid_qs with
 * the project's own imagery. It deliberately claims no metrics, because
 * none were measured; the impact row describes what changed instead.
 *
 * ⚠️ THE REMAINING FOUR ARE DRAFTS, not real engagements.
 * The narratives are illustrative. Before anything goes live:
 *   • replace [Client Name] and the industry/stage with the real ones,
 *   • rewrite the story from what actually happened,
 *   • replace every [bracketed] figure with a number you can defend,
 *   • get the client's written approval for the quote and the numbers.
 * Publishing invented outcomes as real client results would be a lie
 * to your buyers — the placeholders are deliberate.
 * ————————————————————————————————————————————————————————
 */

export type CaseImpact = {
  figure: string; // "48%" | "3×" | "←" | "↑" | "↗" | "5"
  title: string;
  sub: string;
};

export type CaseMedia = {
  src: string;
  alt: string;
  /** width:height, drives the slot in the media strip */
  ratio: string;
};

export type CaseStudy = {
  slug: string;
  client: string;
  dek: string;
  program: string;
  industry: string;
  stage: string;
  lede: string;
  story: string[];
  built: { title: string; body: string };
  impact: CaseImpact[];
  quote?: { text: string; attribution: string };
  tint: "a" | "b" | "c" | "d" | "e";
  aspect: string;
  /** poster art for the grids/filmstrips — omit to fall back to a tint */
  poster?: string;
  /** media strip on the case page — omit to fall back to placeholders */
  media?: CaseMedia[];
  /** external link, e.g. the live site */
  link?: { label: string; href: string };
};

export const CASES: CaseStudy[] = [
  /* ——— REAL ENGAGEMENT ———
     Sourced from vivekchittauria.com/rapid_qs and the project imagery.
     Copy is written from that material; no metrics are claimed because
     none were measured. Confirm the client is happy to be named. */
  {
    slug: "rapidqs",
    client: "RapidQS",
    dek: "A quantity surveying service that finally reads as clearly as it works.",
    program: "Product Build",
    industry: "Construction / Quantity Surveying",
    stage: "Established, New Zealand & Australia",
    lede: "RapidQS produces the pre-construction cost estimates that builders, architects and developers plan around. Their promise is a good one — we estimate, you build, everyone goes home on time — and almost none of it survived contact with their old website.",
    story: [
      "The service was never the problem. Builders who used RapidQS came back; the reports were fast, detailed and jargon-free. But a first-time visitor met walls of text, a navigation menu that opened into a list of every region in the country, and a value proposition buried three scrolls down the page.",
      "We audited the existing site with the team and their clients, and the findings were consistent: the pages were text-heavy, the visual language changed from section to section, the information hierarchy made the services hard to compare, and the upload form — the one action the whole business depends on — sat at the bottom of the page with almost nothing leading to it.",
      "That gave us a single objective to design against: communicate the value quickly, build trust, and move people toward submitting a project. Everything on the new site had to earn its place against that sentence.",
      "The homepage was rebuilt around the offer rather than the company history, with a clearer hierarchy and a navigation that no longer asks people to find themselves on a map. The four services — full plans, cost breakdowns, labour costings, cost updates — became scannable cards with icons instead of paragraphs. The pricing section, previously a block of prose, became clear project categories a visitor can select between to find their own case.",
      "The visual language was rebuilt at the same time: softer neutrals around the signature yellow, and photography of the people the reports are actually for — the builder who gets to go home on time — replacing generic construction stock.",
      "The upload flow was streamlined and given context at the point of decision, so submitting plans is the obvious next step rather than a form to hunt for.",
      "The result is a site that explains the business in seconds, and a structure that is ready for where RapidQS is heading: an interactive, AI-assisted estimation tool sitting behind the same front door.",
    ],
    built: {
      title: "The Site",
      body: "A rebuilt marketing site and enquiry flow: clearer navigation and hierarchy, services and pricing restructured into scannable categories, a warmer visual language, and a streamlined upload journey — designed to extend into an interactive estimation app.",
    },
    impact: [
      {
        figure: "↓",
        title: "Less to read, faster to grasp",
        sub: "Text-heavy pages replaced with scannable services and pricing",
      },
      {
        figure: "↗",
        title: "Upload flow given a run-up",
        sub: "Context and prompts lead to the enquiry rather than hiding it",
      },
      {
        figure: "4",
        title: "Services made comparable",
        sub: "Full plans, cost breakdowns, labour costings, cost updates",
      },
      {
        figure: "→",
        title: "Built to extend",
        sub: "Structured for the AI-assisted estimation tool that follows",
      },
    ],
    tint: "b",
    aspect: "3/4",
    poster: "/cases/rapidqs/poster.jpg",
    link: { label: "Full case study", href: "https://vivekchittauria.com/rapid_qs" },
    media: [
      { src: "/cases/rapidqs/hero.jpg", alt: "RapidQS homepage hero", ratio: "3/2" },
      { src: "/cases/rapidqs/mobile.jpg", alt: "RapidQS hero on mobile", ratio: "3/2" },
      { src: "/cases/rapidqs/services.jpg", alt: "Redesigned services section", ratio: "3/2" },
      { src: "/cases/rapidqs/pricing.jpg", alt: "Restructured pricing categories", ratio: "3/2" },
      { src: "/cases/rapidqs/navigation.jpg", alt: "Simplified navigation", ratio: "3/2" },
      { src: "/cases/rapidqs/upload.jpg", alt: "Streamlined upload flow", ratio: "3/2" },
    ],
  },
  {
    slug: "case-02",
    client: "[Client Name]",
    dek: "Support answers in seconds, and a model that knows when to stop.",
    program: "Applied AI",
    industry: "[Industry]",
    stage: "[Stage — e.g. Enterprise]",
    lede: "[Client Name]'s support team is good at a hard job: a small group answering a large volume of questions, most of which have been answered before, some of which absolutely must reach a human.",
    story: [
      "The backlog was not caused by difficult questions. It was caused by repetition — the same handful of cases arriving in a hundred phrasings, buried among the ones that genuinely needed judgement.",
      "They had already tried a generic chatbot. It answered confidently, was wrong often enough to matter, and customers learned to skip past it, which made the queue worse rather than better.",
      "We started with their resolved tickets rather than a model. A sample was split into what an assistant should answer, what it should escalate and what it should never touch, and scored the way the support lead scores it. That evaluation set became the contract for what 'working' meant.",
      "[Describe the build and the real results — resolution rate, first-response time, refusal accuracy, tickets deflected. Replace the figures below to match.]",
      "The assistant, the evaluation set and the retrieval pipeline are theirs. When a better model appears, they can swap it in and re-run the evaluation to see if it is actually better for their business.",
    ],
    built: {
      title: "The Assistant",
      body: "A support copilot grounded in their own resolved tickets and documentation, with permissions enforced at retrieval and a hard rule about when to hand over to a person.",
    },
    impact: [
      { figure: "00s", title: "First response", sub: "[Median, before vs after]" },
      { figure: "00%", title: "Handled without a human", sub: "[Of eligible tickets]" },
      { figure: "↑", title: "Correct escalations", sub: "[Cases correctly routed to a person]" },
      { figure: "↗", title: "Owned outright", sub: "[Evaluation set and pipeline handed over]" },
    ],
    quote: {
      text: "[A real client quote — one or two sentences, approved in writing.]",
      attribution: "[Name, Title, Company]",
    },
    tint: "a",
    aspect: "4/5",
    // real thumbnail supplied; story/metrics still to be written
    poster: "/cases/case-02/poster.jpg",
  },
  {
    slug: "case-03",
    client: "[Client Name]",
    dek: "One system of record, instead of fourteen spreadsheets.",
    program: "Operations & Data",
    industry: "[Industry]",
    stage: "[Stage — e.g. SMB]",
    lede: "[Client Name] runs a business where the operational detail is the product: what was promised, what shipped, what it cost, and who needs to know.",
    story: [
      "That detail lived in spreadsheets — one per site, per month, per person who had ever needed a report. Each was correct on its own and none of them agreed. Month-end was a reconciliation exercise, and the answer to a simple question depended on who you asked.",
      "The instinct in this situation is to buy an ERP. We scoped that honestly with them: the licence cost, the implementation, and the parts of their process they would have to abandon to fit the software. It did not pay.",
      "Instead we built the smallest system that could be the single source of truth — the operational records, the workflows around them, and the handful of reports the business actually runs on — and imported the history so nothing was lost.",
      "[Describe the change: hours saved at month-end, reporting turnaround, errors caught, decisions now possible. Real numbers only.]",
      "It is an ordinary database and an ordinary application, documented and handed over. Their team adds fields and reports themselves.",
    ],
    built: {
      title: "The System of Record",
      body: "A single operational database with the workflows and reports the business runs on, migrated from years of spreadsheets — deliberately small, and built so their team can extend it.",
    },
    impact: [
      { figure: "00h", title: "Saved at month-end", sub: "[Per cycle, measured]" },
      { figure: "←", title: "One source of truth", sub: "[Spreadsheets retired]" },
      { figure: "00%", title: "Faster reporting", sub: "[Time from question to answer]" },
      { figure: "↗", title: "Extended in-house", sub: "[Changes made by their team since hand-over]" },
    ],
    quote: {
      text: "[A real client quote — one or two sentences, approved in writing.]",
      attribution: "[Name, Title, Company]",
    },
    tint: "e",
    aspect: "1/1",
    // real thumbnail supplied; story/metrics still to be written
    poster: "/cases/case-03/poster.jpg",
  },
  {
    slug: "case-04",
    client: "[Client Name]",
    dek: "Twenty years of legacy retired without a big-bang launch.",
    program: "Modernisation",
    industry: "[Industry]",
    stage: "[Stage]",
    lede: "The system at the centre of [Client Name]'s operation had been running for two decades. It worked. Almost nobody understood it, the people who wrote it had moved on, and every proposed change came with the same question: what else will this break?",
    story: [
      "Systems like this are not badly built. They are heavily loaded with logic that was correct for reasons nobody wrote down, and the risk is not the code — it is the knowledge that left with the people.",
      "A full rewrite was the obvious plan and the wrong one. The failure mode is well documented: two years of parallel development, a launch weekend, and a business discovering which undocumented behaviours it depended on.",
      "We took the opposite approach. We mapped what the system actually does in production, wrote tests around the behaviour worth keeping, and moved it out one capability at a time — with the old system still running until each piece had proven itself.",
      "[Describe the actual migration: what moved, over what period, what it now costs to run and change. Replace the figures below.]",
      "The logic that mattered survived, documented this time. The parts nobody used were retired rather than faithfully recreated.",
    ],
    built: {
      title: "The Migration",
      body: "A capability-by-capability move off the legacy platform, with characterisation tests around the behaviour worth keeping and the old system live until each piece proved itself.",
    },
    impact: [
      { figure: "0×", title: "Faster to change", sub: "[Time to ship a change, before vs after]" },
      { figure: "00%", title: "Lower running cost", sub: "[Infrastructure and licence, annualised]" },
      { figure: "↑", title: "Behaviour under test", sub: "[Coverage of the logic that mattered]" },
      { figure: "↗", title: "No big-bang launch", sub: "[Migrated with no unplanned downtime]" },
    ],
    quote: {
      text: "[A real client quote — one or two sentences, approved in writing.]",
      attribution: "[Name, Title, Company]",
    },
    tint: "d",
    aspect: "3/4",
  },
  {
    slug: "case-05",
    client: "[Client Name]",
    dek: "An embedded team that shipped the roadmap, then handed it back.",
    program: "Embedded Team",
    industry: "[Industry]",
    stage: "[Stage]",
    lede: "[Client Name] had the roadmap, the product sense and the customers. What they did not have was enough senior engineering time to build it before the opportunity moved.",
    story: [
      "Hiring was the obvious answer and the slow one — months to fill a role, longer to make it productive, and a permanent cost for what was a temporary peak.",
      "We embedded instead: our engineers and designers inside their sprints, in their tools, reviewed by their leads. Not a black-box project running in parallel, but additional senior hands on their own roadmap.",
      "The condition we set was that everything we wrote had to be maintainable by their team, reviewed by their engineers, and documented as we went — because the engagement was designed to end.",
      "[Describe what shipped and what it unlocked — features delivered, cycle time, what their team could do afterwards. Real numbers.]",
      "When their own hires came through, the work transferred without a hand-over event, because there was nothing hidden to hand over.",
    ],
    built: {
      title: "The Team",
      body: "Senior engineers and designers working inside the client's sprints, tools and review process — sized to the peak and structured to be absorbed by their own team afterwards.",
    },
    impact: [
      { figure: "00", title: "Features shipped", sub: "[Over the engagement]" },
      { figure: "↑", title: "Sprint throughput", sub: "[Before vs during]" },
      { figure: "00%", title: "Code reviewed in-house", sub: "[By the client's own engineers]" },
      { figure: "↗", title: "Absorbed cleanly", sub: "[Handed to their team on schedule]" },
    ],
    quote: {
      text: "[A real client quote — one or two sentences, approved in writing.]",
      attribution: "[Name, Title, Company]",
    },
    tint: "c",
    aspect: "4/5",
  },
];

export function getCase(slug: string) {
  return CASES.find((c) => c.slug === slug);
}

export function nextCase(slug: string) {
  const i = CASES.findIndex((c) => c.slug === slug);
  return CASES[(i + 1) % CASES.length];
}
