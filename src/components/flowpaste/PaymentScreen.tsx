import { useState } from "react";
import { Info, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { verifyPayment, type Order } from "@/lib/flowpaste";
import { QrPlaceholder } from "./QrPlaceholder";

export function PaymentScreen({
  order,
  onSubmitted,
  onBack,
}: {
  order: Order;
  onSubmitted: (order: Order) => void;
  onBack: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await verifyPayment(order);
      toast.success("Payment submitted", {
        description: "We'll email your access details once payment is verified.",
      });
      onSubmitted(result.order);
    } catch {
      toast.error("Could not submit payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="surface-card animate-rise p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Complete your payment</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Scan the QR code with your preferred UPI app to pay for FlowPaste {order.plan.name}.
      </p>

      <dl className="mt-6 grid gap-3 rounded-xl bg-secondary/70 p-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Selected plan</dt>
          <dd className="truncate text-sm font-semibold">FlowPaste {order.plan.name}</dd>
        </div>
        <div className="min-w-0 sm:text-right">
          <dt className="text-xs text-muted-foreground">Amount</dt>
          <dd className="font-display text-lg font-bold">{order.plan.priceLabel}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col items-center">
        <div className="w-full max-w-[260px] rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="aspect-square w-full">
            <QrPlaceholder seed={order.reference} />
          </div>
        </div>
        <p className="mt-3 text-sm font-medium">Scan with your preferred UPI app</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Placeholder QR — live payment details will appear here once payments are connected.
        </p>
      </div>

      <ol className="mt-6 space-y-2 text-sm text-muted-foreground">
        <li>1. Open any UPI app and scan the QR code above.</li>
        <li>2. Pay exactly {order.plan.priceLabel}.</li>
        <li>3. Add the reference below in the payment note, then return here.</li>
      </ol>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Payment reference</p>
          <p className="truncate font-mono text-sm font-semibold">{order.reference}</p>
        </div>
        <span className="shrink-0 rounded-md bg-accent px-2 py-1 text-[0.65rem] font-semibold text-accent-foreground">
          {order.id}
        </span>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" />
        Never share your payment PIN or OTP.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          variant="hero"
          size="xl"
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full sm:flex-1"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            "I've Completed Payment"
          )}
        </Button>
        <Button
          variant="outline"
          size="xl"
          onClick={onBack}
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          Back
        </Button>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        Payment verification is not connected yet — submitting records your details for manual
        review.
      </p>
    </div>
  );
}
