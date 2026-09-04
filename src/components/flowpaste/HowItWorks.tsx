const STEPS = [
  {
    title: "Enter your details",
    body: "Create your FlowPaste account using your name and email.",
  },
  {
    title: "Complete your purchase",
    body: "Choose a plan and scan the displayed QR code to make payment.",
  },
  {
    title: "Get access",
    body: "After payment confirmation, your account access credentials will be generated.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Three steps to FlowPaste.</h2>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="surface-card relative p-6">
              <span className="gradient-primary font-display grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
