import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/flowpaste/Navbar";
import { Footer } from "@/components/flowpaste/Footer";

export const Route = createFileRoute("/terms")({
  component: TermsAndConditions,
});

function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-8">
          Terms and Conditions
        </h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p>
            By purchasing, downloading, installing, or using FlowPaste, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, do not use the extension.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">2. License Grant</h2>
          <p>
            Upon successful payment verification, you are granted a non-exclusive, non-transferable license to use FlowPaste on a single device per purchased license. This is a one-time purchase, not a subscription.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Restrictions</h2>
          <p>
            You may not:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Modify, reverse engineer, decompile, or disassemble the extension.</li>
            <li>Share, resell, rent, or lease your license key to third parties.</li>
            <li>Use the extension for any illegal or unauthorized purpose.</li>
          </ul>



          <h2 className="text-2xl font-bold text-foreground mt-8">5. Termination</h2>
          <p>
            We reserve the right to revoke your license without refund if you violate these Terms and Conditions.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">6. Disclaimer of Warranties</h2>
          <p>
            The extension is provided "as is" without warranty of any kind. We do not guarantee that the extension will meet your requirements or that its operation will be uninterrupted or error-free.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">7. Contact Information</h2>
          <p>
            For any inquiries or questions concerning these Terms, please reach out to us at support.support49@gmail.com.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
