import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/flowpaste/Navbar";
import { Footer } from "@/components/flowpaste/Footer";
import { PurchaseForm } from "@/components/flowpaste/PurchaseForm";
import { PaymentScreen } from "@/components/flowpaste/PaymentScreen";
import { SuccessScreen } from "@/components/flowpaste/SuccessScreen";
import { getPlan, type Order, type PlanId } from "@/lib/flowpaste";

const title = "Get FlowPaste — Checkout";
const description =
  "Create your FlowPaste order, pay with UPI, and receive your access details by email.";

export const Route = createFileRoute("/purchase")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: (search.plan === "starter" ? "starter" : "pro") as PlanId,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchasePage,
});

type Step = "details" | "payment" | "success";

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "payment", label: "Payment" },
  { key: "success", label: "Access" },
];

function PurchasePage() {
  const { plan: planId } = Route.useSearch();
  const navigate = useNavigate({ from: "/purchase" });
  const [step, setStep] = useState<Step>("details");
  const [order, setOrder] = useState<Order | null>(null);

  const activeIndex = STEP_LABELS.findIndex((s) => s.key === step);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="gradient-halo flex-1">
        <div className="mx-auto w-full max-w-xl px-5 py-10 sm:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <ol className="mt-6 mb-6 flex items-center gap-2" aria-label="Checkout progress">
            {STEP_LABELS.map((s, i) => (
              <li key={s.key} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  aria-current={i === activeIndex ? "step" : undefined}
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    i <= activeIndex ? "gradient-primary" : "bg-border"
                  }`}
                />
                <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:inline">
                  {s.label}
                </span>
              </li>
            ))}
          </ol>

          {step === "details" ? (
            <PurchaseForm
              planId={planId}
              onPlanChange={(id) => navigate({ search: { plan: id }, replace: true })}
              onOrderCreated={(o) => {
                setOrder(o);
                setStep("payment");
              }}
            />
          ) : null}

          {step === "payment" && order ? (
            <PaymentScreen
              order={order}
              onBack={() => setStep("details")}
              onSubmitted={(o) => {
                setOrder(o);
                setStep("success");
              }}
            />
          ) : null}

          {step === "success" && order ? <SuccessScreen order={order} /> : null}

          {step === "details" ? (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              You selected FlowPaste {getPlan(planId).name} · {getPlan(planId).priceLabel} one-time.
            </p>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
