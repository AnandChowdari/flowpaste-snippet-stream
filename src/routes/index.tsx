import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/flowpaste/Navbar";
import { Hero } from "@/components/flowpaste/Hero";
import { ProblemSolution } from "@/components/flowpaste/ProblemSolution";
import { FeatureGrid } from "@/components/flowpaste/FeatureGrid";
import { HowItWorks } from "@/components/flowpaste/HowItWorks";
import { Pricing } from "@/components/flowpaste/Pricing";
import { Footer } from "@/components/flowpaste/Footer";

const title = "FlowPaste — Make repetitive text workflows effortless";
const description =
  "FlowPaste helps you manage and reuse frequently entered text so you can spend less time repeating the same work.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <ProblemSolution />
        <FeatureGrid />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
