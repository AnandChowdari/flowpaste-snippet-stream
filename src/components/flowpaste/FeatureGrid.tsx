import {
  Check,
  Clock3,
  Feather,
  Globe,
  KeyRound,
  LayoutPanelTop,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  { icon: LayoutPanelTop, title: "Reusable text snippets", body: "Save once, insert anywhere." },
  { icon: Sliders, title: "Quick-access interface", body: "Your snippets one click away." },
  { icon: Search, title: "Search your snippets", body: "Filter by name or content instantly." },
  { icon: Clock3, title: "Recently used items", body: "Your latest text stays on top." },
  {
    icon: Sparkles,
    title: "AI Assist",
    body: "One click reads the text on your page, drafts a response with AI, and drops it into the active editor.",
  },
  {
    icon: KeyRound,
    title: "Bring your own key",
    body: "AI Assist runs on your own free Gemini API key — paste it once in the extension and it stays on your device.",
  },
  { icon: Feather, title: "Lightweight and fast", body: "Minimal footprint, no lag." },
  { icon: Check, title: "Simple setup", body: "Install and start in under a minute." },
  { icon: Globe, title: "Works in the browser", body: "No extra apps to install." },
  { icon: ShieldCheck, title: "Privacy-focused", body: "A local-first snippet workflow." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-card/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Features</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Everything you need, nothing you don&apos;t.
          </h2>
        </div>

        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex min-w-0 gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
