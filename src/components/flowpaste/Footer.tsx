import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/60">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Simple tools for faster digital workflows.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link
            to="/privacy"
            className="rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Terms & Conditions
          </Link>
          <Link
            to="/refund"
            className="rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Refund Policy
          </Link>
          <a
            href="mailto:support.support49@gmail.com"
            className="rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Contact
          </a>
        </nav>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto w-full max-w-6xl px-5 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} FlowPaste. Make repetitive text workflows effortless.
        </p>
      </div>
    </footer>
  );
}
