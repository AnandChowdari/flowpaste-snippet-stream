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
  const [userPaymentRef, setUserPaymentRef] = useState(order.reference);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await verifyPayment(order, userPaymentRef.trim() || order.reference);
      toast.success("Payment submitted", {
        description: "Admin will verify your reference ID and activate your credentials.",
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
          Pay via PhonePe, Google Pay, Paytm, or any UPI app.
        </p>
      </div>

      <ol className="mt-6 space-y-2 text-sm text-muted-foreground">
        <li>1. Open any UPI app and scan the QR code above.</li>
        <li>2. Pay exactly {order.plan.priceLabel}.</li>
        <li>3. Enter your UPI Transaction Reference / UTR below so the admin can verify it.</li>
      </ol>

      <div className="mt-5 space-y-3 rounded-xl border border-dashed border-border p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Generated Order Ref</p>
            <p className="truncate font-mono text-sm font-semibold text-primary">{order.reference}</p>
          </div>
          <span className="shrink-0 rounded-md bg-accent px-2 py-1 text-[0.65rem] font-semibold text-accent-foreground">
            {order.id}
          </span>
        </div>

        <div className="pt-2 border-t border-border/50">
          <label htmlFor="upi-ref" className="block text-xs font-semibold text-foreground mb-1.5">
            UPI UTR / Payment Reference ID
          </label>
          <input
            id="upi-ref"
            type="text"
            placeholder="e.g. 423812345678 or UPI reference"
            value={userPaymentRef}
            onChange={(e) => setUserPaymentRef(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            The admin checks this reference ID against their UPI payment to activate your account.
          </p>
        </div>
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
