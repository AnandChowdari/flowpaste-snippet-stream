export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="gradient-primary grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] shadow-[var(--shadow-glow)]"
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor">
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="3.5"
            className="stroke-primary-foreground"
            strokeWidth="1.8"
          />
          <path d="M3 8.5h18" className="stroke-primary-foreground" strokeWidth="1.8" />
          <path
            d="M8 13.5h6M8 16.5h4"
            className="stroke-primary-foreground"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight">FlowPaste</span>
    </span>
  );
}
