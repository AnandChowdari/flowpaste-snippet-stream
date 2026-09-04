import { FolderTree, Repeat2, Zap } from "lucide-react";

const CARDS = [
  {
    icon: Repeat2,
    title: "Repeat Less",
    body: "Reuse frequently entered text instead of typing it again.",
  },
  {
    icon: Zap,
    title: "Work Faster",
    body: "Keep useful snippets organized and accessible.",
  },
  {
    icon: FolderTree,
    title: "Stay Organized",
    body: "Find the text you need without digging through notes or documents.",
  },
];

export function ProblemSolution() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Small repetitive tasks add up.</h2>
        <p className="mt-3 text-muted-foreground">
          A few seconds of retyping, dozens of times a day. FlowPaste gives those minutes back.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="surface-card group p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
