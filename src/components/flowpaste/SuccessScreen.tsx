import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/flowpaste";

export function SuccessScreen({ order }: { order: Order }) {
  const rows: [string, string][] = [
    ["Customer name", order.customer.name],
    ["Email", order.customer.email],
    ["Selected plan", `FlowPaste ${order.plan.name} · ${order.plan.priceLabel}`],
    ["Order reference", order.reference],
    ["Order ID", order.id],
  ];

  return (
    <div className="surface-card animate-rise p-6 text-center sm:p-8">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/12 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">You&apos;re all set.</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Thanks for choosing FlowPaste. Your access details will appear here once payment
        verification is connected.
      </p>

      <dl className="mt-7 divide-y divide-border overflow-hidden rounded-xl border border-border text-left">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-4 py-3"
          >
            <dt className="min-w-0 text-xs text-muted-foreground sm:text-sm">{label}</dt>
            <dd className="min-w-0 truncate text-right text-sm font-medium">{value}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <dt className="text-xs text-muted-foreground sm:text-sm">Access status</dt>
          <dd>
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
              Pending verification
            </span>
          </dd>
        </div>
      </dl>

      <Button asChild variant="hero" size="xl" className="mt-7 w-full">
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  );
}
