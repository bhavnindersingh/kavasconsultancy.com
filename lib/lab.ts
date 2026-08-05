/**
 * ————————————————————————————————————————————————————————
 * LAB — experiments, benchmarks and small tools.
 *
 * This section exists to prove capability rather than assert it:
 * "we train models, not just prompt them" is a claim; a published
 * evaluation with numbers is evidence.
 *
 * A good entry is cheap to produce — a screenshot, a table, and three
 * short sections (what we tried / what we found / why it matters).
 *
 * DRAFT NOTICE: the entries below are written by Kavas' positioning,
 * not from measured runs. Before publishing, either re-run each one and
 * replace the figures with real results, or delete the entry. Numbers
 * shown as [bracketed] must be filled in from an actual test.
 * ————————————————————————————————————————————————————————
 */

export type LabEntry = {
  slug: string;
  title: string;
  kind: "Benchmark" | "Experiment" | "Tool";
  date: string;
  dek: string; // one-line summary
  /** short takeaway shown on the entry page under "What we found" */
  finding: string;
  body: string[];
};

export const LAB: LabEntry[] = [
  {
    slug: "support-copilot-evals",
    title: "Scoring a support copilot before it answers a customer",
    kind: "Benchmark",
    date: "Aug 2026",
    dek: "We built the scoreboard first, using a client's own resolved tickets.",
    finding:
      "On [n] historical tickets, the assistant matched the human answer [00]% of the time and — more importantly — correctly declined to answer [00]% of the cases it should never have touched.",
    body: [
      "Every support assistant demos well. The question that matters is what happens on the ticket nobody anticipated, and you cannot answer that with a demo.",
      "So we start with the client's resolved-ticket history rather than the model. A sample is split into cases the assistant should answer, cases it should escalate, and cases it should refuse outright. Each one is scored the way the support lead would score it, not by string similarity.",
      "That gives a number to argue with. It also gives a safety measure that most teams skip: the refusal rate. An assistant that is right 95% of the time and confidently wrong the other 5% is worse than no assistant, because it teaches customers to trust it.",
      "The evaluation set is a deliverable in its own right. It belongs to the client, runs on every change, and survives whichever model is fashionable next quarter.",
    ],
  },
  {
    slug: "small-models-real-tasks",
    title: "What actually runs on one GPU",
    kind: "Benchmark",
    date: "Jul 2026",
    dek: "Comparing small open models against a frontier API on three business tasks.",
    finding:
      "For classification and extraction, a small self-hosted model came within [0] points of the frontier API at roughly [00]% of the cost per million tokens. For open-ended drafting, it did not come close.",
    body: [
      "Not every task needs the largest available model. Classification, extraction and routing are narrow, repetitive, and — crucially — easy to measure, which makes them the best candidates for a smaller model you host yourself.",
      "We ran three representative business tasks: categorising inbound enquiries, pulling line items out of supplier documents, and drafting a customer-facing reply.",
      "The first two are where self-hosting pays. The last one is where it does not — quality fell off in a way that a cost saving does not justify.",
      "The practical conclusion is that 'which model' is the wrong question. The right one is which tasks are narrow enough to own outright, and which are worth renting from an API.",
    ],
  },
  {
    slug: "twenty-years-of-scans",
    title: "Twenty years of scanned documents, made queryable",
    kind: "Experiment",
    date: "Jun 2026",
    dek: "Turning an archive nobody could search into structured, checkable records.",
    finding:
      "[00]% of documents were parsed to structured records with no human review; the remainder were routed to a review queue rather than guessed at.",
    body: [
      "Most businesses of a certain age have an archive like this: filing cabinets that became folders of scans, holding information the business genuinely needs and cannot query.",
      "The interesting problem is not extraction, it is confidence. A pipeline that returns an answer for every document will quietly return wrong answers for the hard ones, and nobody notices until a number is off.",
      "We built the pipeline to know what it does not know: pages below a confidence threshold go to a review queue with the crop that caused the doubt, so a person spends their time only where it is needed.",
      "The output is an ordinary database the client's team can query with ordinary tools. That is the point — the value is the structured records, not the model that produced them.",
    ],
  },
  {
    slug: "retrieval-that-respects-permissions",
    title: "Retrieval that respects who is asking",
    kind: "Experiment",
    date: "May 2026",
    dek: "Most internal assistants leak. We tested ours against that.",
    finding:
      "Across [n] adversarial prompts designed to surface documents the user could not open, the assistant returned zero restricted passages.",
    body: [
      "An assistant over internal documents inherits a problem the documents already had: not everyone is allowed to read everything. Salary bands, contracts, board material and HR cases sit in the same drives as the harmless material.",
      "The naive build indexes everything and hopes the prompt keeps it in line. It will not — that is a filter on generation, not on access.",
      "We enforce permissions at retrieval instead: the query runs against the slice of the index the person asking is entitled to, so restricted material is never a candidate in the first place.",
      "Then we tried to break it, with prompts written to trick it into quoting things it should not have. That test belongs in the hand-over pack, so the client can re-run it after their own changes.",
    ],
  },
  {
    slug: "what-an-ai-feature-costs",
    title: "A cost model for AI features",
    kind: "Tool",
    date: "Apr 2026",
    dek: "A spreadsheet that turns tokens and volumes into a monthly number.",
    finding:
      "Most surprises come from retries, long contexts and staff usage growth — not from the headline price per token.",
    body: [
      "Teams usually estimate the cost of an AI feature from the per-token price, then get a bill several times larger. The gap is in the parts nobody models: retries, unexpectedly long inputs, evaluation runs, and the fact that usage rises once the feature is good.",
      "We built a small model that takes volume, average input and output length, retry rate and a growth assumption, and returns a monthly cost with a sensible upper bound.",
      "It is deliberately boring, and we hand it to clients during scoping so the business case is settled before anything is built.",
      "[Publish the sheet here, or link to it — this entry should end with something the reader can actually use.]",
    ],
  },
];

export function getLabEntry(slug: string) {
  return LAB.find((e) => e.slug === slug);
}
