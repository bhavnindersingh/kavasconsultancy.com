import { notFound } from "next/navigation";
import Link from "next/link";
import { LAB, getLabEntry } from "@/lib/lab";

export function generateStaticParams() {
  return LAB.map((e) => ({ slug: e.slug }));
}

export default async function LabEntryPage(props: PageProps<"/lab/[slug]">) {
  const { slug } = await props.params;
  const entry = getLabEntry(slug);
  if (!entry) notFound();

  return (
    <div className="inset pt-[calc(var(--header-h)+10vh)] pb-[var(--pad-section)]">
      <div className="mx-auto max-w-[660px]">
        <p className="meta">
          <Link href="/lab" className="footer-link">
            Lab
          </Link>{" "}
          · {entry.kind} · {entry.date}
        </p>
        <h1 className="lede mt-6">{entry.title}</h1>
        <p className="body-text mt-4">{entry.dek}</p>

        {/* headline result, stated up front */}
        <div className="lab-finding mt-12">
          <p className="label">What we found</p>
          <p className="serif mt-3" style={{ fontSize: "var(--fs-thesis)", lineHeight: 1.25 }}>
            {entry.finding}
          </p>
        </div>

        <div className="prose-ed mt-12">
          {entry.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <p className="mt-14">
          <span className="todo-chip">
            Draft — re-run and replace [bracketed] figures before publishing
            (lib/lab.ts)
          </span>
        </p>
      </div>
    </div>
  );
}
