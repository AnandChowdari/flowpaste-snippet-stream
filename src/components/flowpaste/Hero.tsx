import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExtensionMockup } from "./ExtensionMockup";

export function Hero() {
  return (
    <section className="gradient-halo relative overflow-hidden">
      <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
        <div className="animate-rise min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-soft)]">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Make repetitive text workflows effortless
          </span>

          <h1 className="mt-6 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
            Stop repeating <span className="gradient-text">the same text.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            FlowPaste makes repetitive text workflows faster with reusable snippets and a
            streamlined browser experience.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
              <Link to="/purchase" search={{ plan: "pro" }}>
                Get FlowPaste <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              ["One-time", "pricing"],
              ["Local-first", "workflow"],
              ["< 1 min", "setup"],
            ].map(([value, label]) => (
              <div key={label} className="min-w-0">
                <dt className="truncate font-display text-lg font-bold">{value}</dt>
                <dd className="truncate text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-rise [animation-delay:120ms]">
          <ExtensionMockup />
        </div>
      </div>
    </section>
  );
}
