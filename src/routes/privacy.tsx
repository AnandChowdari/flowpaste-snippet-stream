import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/flowpaste/Navbar";
import { Footer } from "@/components/flowpaste/Footer";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8">1. Information We Collect</h2>
          <p>
            When you purchase a license for FlowPaste, we collect your name, email address, and payment reference information. We do not process or store credit card details directly, as payments are handled via external UPI gateways.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">2. How We Use Your Information</h2>
          <p>
            We use your information exclusively to provide you with the product, verify your payment, issue your license key, and provide customer support. We do not sell, rent, or share your personal information with third parties.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Device Binding</h2>
          <p>
            To prevent abuse, your license key is bound to a single device (browser installation). We store a generic device ID associated with your license to enforce this limit. You can request a device reset through our support if you change computers.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">4. Data Security</h2>
          <p>
            We implement standard security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">5. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at support.support49@gmail.com.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
