import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/flowpaste";

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-card/60">
      <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            One-time price. No subscriptions.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pay once and keep FlowPaste. Choose the plan that matches how much text you reuse.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2 md:items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={
                plan.recommended
                  ? "relative rounded-3xl border-2 border-primary bg-card p-7 shadow-[var(--shadow-lift)] md:-mt-4 md:pb-9"
                  : "surface-card p-7"
              }
            >
              {plan.recommended ? (
                <span className="gradient-primary absolute -top-3 left-7 rounded-full px-3 py-1 text-[0.68rem] font-bold tracking-wide text-primary-foreground uppercase">
                  Recommended
                </span>
              ) : null}

              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>

              <p className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-4xl font-extrabold">{plan.priceLabel}</span>
                <span className="text-sm text-muted-foreground">one-time</span>
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={plan.recommended ? "hero" : "outline"}
                className="mt-7 w-full"
              >
                <Link to="/purchase" search={{ plan: plan.id }}>
                  Get {plan.name}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
