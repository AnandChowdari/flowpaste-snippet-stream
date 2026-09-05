import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/flowpaste/Navbar";
import { Footer } from "@/components/flowpaste/Footer";

export const Route = createFileRoute("/refund")({
  component: RefundPolicy,
});

function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-8">
          Refund Policy
        </h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-6 my-8">
            <h2 className="text-xl font-bold text-destructive mt-0">No Refunds for One-Time Purchases</h2>
            <p className="text-destructive/90 mb-0 font-medium">
              FlowPaste is sold as a one-time purchase digital product. Due to the nature of digital software licenses, <strong>we do not offer refunds, returns, or money-back guarantees</strong> once a license key has been issued.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-foreground mt-8">1. Digital Goods</h2>
          <p>
            Since FlowPaste is a digital product delivered instantly (or upon manual admin verification) over the internet, we cannot accept returns or process refunds. By completing your purchase, you acknowledge and agree to this no-refund policy.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">2. Exceptions</h2>
          <p>
            Refunds will only be considered in the highly unlikely event that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You were charged multiple times for the same transaction due to a technical error on our end or the payment processor's end.</li>
            <li>We completely fail to deliver your license key within a reasonable timeframe (e.g., 48 hours) after you have provided a valid payment reference.</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Device Issues</h2>
          <p>
            If you encounter issues activating your license on a new device due to the 1-device limit, please contact support for a device reset. Device limitations are not grounds for a refund.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">Contact Support</h2>
          <p>
            If you have an issue with the extension or need help with your license, we are happy to assist. Please email us at support.support49@gmail.com before considering your purchase a complete loss.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
