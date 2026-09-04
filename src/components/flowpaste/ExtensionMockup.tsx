import { Clock, Copy, Search } from "lucide-react";

const SNIPPETS = [
  { label: "Client intro email", tag: "Email", preview: "Hi there — thanks for reaching out…" },
  { label: "Support signature", tag: "Signature", preview: "Best regards, Team FlowPaste" },
  { label: "Invoice details", tag: "Billing", preview: "PO #4821 · Net 15 · Bank transfer" },
  { label: "Standup update", tag: "Work", preview: "Yesterday: · Today: · Blockers:" },
];

const RECENT = ["Shipping address", "Meeting agenda", "Thank-you note"];

export function ExtensionMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-sm select-none lg:max-w-md"
      role="presentation"
    >
      <div className="gradient-primary absolute -inset-6 rounded-[2rem] opacity-15 blur-2xl" />
      <div className="surface-card relative overflow-hidden rounded-3xl p-0 shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
          <div className="ml-2 h-6 flex-1 rounded-md border border-border bg-card" />
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm font-bold">Snippets</p>
            <span className="rounded-full bg-accent px-2.5 py-1 text-[0.65rem] font-semibold text-accent-foreground">
              12 saved
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm text-muted-foreground">Search snippets…</span>
          </div>

          <ul className="space-y-2">
            {SNIPPETS.map((s) => (
              <li
                key={s.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[var(--shadow-soft)]"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold">{s.label}</p>
                    <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
                      {s.tag}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.preview}</p>
                </div>
                <span className="gradient-primary inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[0.68rem] font-semibold text-primary-foreground">
                  <Copy className="h-3 w-3" />
                  Insert
                </span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
              <Clock className="h-3.5 w-3.5" /> Recently used
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RECENT.map((r) => (
                <span
                  key={r}
                  className="rounded-lg bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
