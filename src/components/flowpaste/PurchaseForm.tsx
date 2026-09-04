import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLANS, createOrder, getPlan, type Order, type PlanId } from "@/lib/flowpaste";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your full name" })
    .max(100, { message: "Name must be under 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be under 255 characters" }),
});

export function PurchaseForm({
  planId,
  onPlanChange,
  onOrderCreated,
}: {
  planId: PlanId;
  onPlanChange: (id: PlanId) => void;
  onOrderCreated: (order: Order) => void;
}) {
  const plan = getPlan(planId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string | undefined; email?: string | undefined }>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = schema.safeParse({ name, email });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ name: flat.name?.[0], email: flat.email?.[0] });
      toast.error(flat.name?.[0] ?? flat.email?.[0] ?? "Please check your details");
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const order = await createOrder(parsed.data, plan);
      onOrderCreated(order);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="surface-card animate-rise p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Get FlowPaste</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your details to create your order. Payment is completed on the next step.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Aarav Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            className="h-11"
          />
          {errors.name ? (
            <p id="name-error" role="alert" className="text-xs text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : "email-hint"}
            className="h-11"
          />
          {errors.email ? (
            <p id="email-error" role="alert" className="text-xs text-destructive">
              {errors.email}
            </p>
          ) : (
            <p id="email-hint" className="text-xs text-muted-foreground">
              Your access details will be sent here.
            </p>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Selected plan</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => {
              const selected = p.id === planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPlanChange(p.id)}
                  aria-pressed={selected}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    selected
                      ? "border-primary bg-accent"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">One-time purchase</span>
                  </span>
                  <span className="font-display shrink-0 text-base font-bold">{p.priceLabel}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/70 px-4 py-3">
          <span className="text-sm text-muted-foreground">Total payable</span>
          <span className="font-display text-lg font-bold">{plan.priceLabel}</span>
        </div>

        <Button type="submit" variant="hero" size="xl" disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating order…
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>
      </form>
    </div>
  );
}
