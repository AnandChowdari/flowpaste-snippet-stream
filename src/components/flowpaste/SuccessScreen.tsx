import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, Check, RefreshCw, Key, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { checkOrderStatus, type Order } from "@/lib/flowpaste";

export function SuccessScreen({ order }: { order: Order }) {
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusData, setStatusData] = useState<{
    verified: boolean;
    paymentStatus: string;
    licenseKey: string | null;
    licenseId: string | null;
  }>({
    verified: false,
    paymentStatus: "UNACTIVE",
    licenseKey: null,
    licenseId: null,
  });

  async function pollStatus() {
    setChecking(true);
    try {
      const res = await checkOrderStatus(order.id);
      if (res && res.success) {
        const isVer =
          res.paymentVerified === true ||
          res.paymentStatus === "ACTIVE" ||
          res.licenseStatus === "ACTIVE";
        setStatusData({
          verified: isVer,
          paymentStatus: res.paymentStatus || (isVer ? "ACTIVE" : "UNACTIVE"),
          licenseKey: res.licenseKey || null,
          licenseId: res.licenseId || null,
        });
        if (isVer && !statusData.verified) {
          toast.success("Payment Verified!", {
            description: "Your license credentials are ready below.",
          });
        }
      }
    } catch {
      // ignore network hiccups
    } finally {
      setChecking(false);
    }
  }

  // Auto-poll every 6 seconds if not verified yet
  useEffect(() => {
    pollStatus();
    if (statusData.verified) return;

    const timer = setInterval(() => {
      pollStatus();
    }, 6000);

    return () => clearInterval(timer);
  }, [order.id, statusData.verified]);

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success("License Key copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="surface-card animate-rise p-6 text-center sm:p-8">
      {statusData.verified ? (
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <ShieldCheck className="h-8 w-8" />
        </span>
      ) : (
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Clock className="h-7 w-7 animate-pulse" />
        </span>
      )}

      <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
        {statusData.verified ? "License Activated!" : "Payment Submitted"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {statusData.verified
          ? "Admin has verified your payment reference ID. Your credentials are ready to activate in the extension."
          : "We received your order. The admin is checking your payment reference ID. Once verified, your license will activate below automatically."}
      </p>

      {/* Verified Credentials Box */}
      {statusData.verified && statusData.licenseKey ? (
        <div className="mt-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/20 p-5 text-left shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400">
            <Key className="h-4 w-4" />
            <span className="text-xs font-bold tracking-wide uppercase">Your License Credentials</span>
          </div>

          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-900/30 p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-emerald-300/70 font-medium uppercase">License Key</p>
              <p className="font-mono text-base font-bold text-emerald-200 tracking-wider">
                {statusData.licenseKey}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyKey(statusData.licenseKey!)}
              className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20 shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="text-muted-foreground/70">Registered Email: </span>
              <span className="font-semibold text-foreground">{order.customer.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground/70">License ID: </span>
              <span className="font-mono font-semibold text-foreground">{statusData.licenseId}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-emerald-500/20 pt-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Next steps to activate:</p>
            <p>1. Open Google Chrome and click the <strong>FlowPaste</strong> extension icon.</p>
            <p>2. Enter your email (<strong>{order.customer.email}</strong>) and License Key.</p>
            <p>3. Click <strong>Activate</strong> to bind your device.</p>
          </div>
        </div>
      ) : null}

      {/* Order Summary Details */}
      <dl className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border text-left">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-4 py-3">
          <dt className="text-xs text-muted-foreground sm:text-sm">Customer name</dt>
          <dd className="truncate text-right text-sm font-medium">{order.customer.name}</dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-4 py-3">
          <dt className="text-xs text-muted-foreground sm:text-sm">Email</dt>
          <dd className="truncate text-right text-sm font-medium">{order.customer.email}</dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-4 py-3">
          <dt className="text-xs text-muted-foreground sm:text-sm">Selected plan</dt>
          <dd className="truncate text-right text-sm font-medium">
            FlowPaste {order.plan.name} · {order.plan.priceLabel}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-4 py-3">
          <dt className="text-xs text-muted-foreground sm:text-sm">Payment Reference ID</dt>
          <dd className="truncate text-right font-mono text-sm font-semibold text-primary">
            {order.reference}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-4 py-3">
          <dt className="text-xs text-muted-foreground sm:text-sm">Order ID</dt>
          <dd className="truncate text-right font-mono text-sm font-medium text-muted-foreground">
            {order.id}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <dt className="text-xs text-muted-foreground sm:text-sm">Payment & Verification Status</dt>
          <dd>
            {statusData.verified ? (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                ACTIVE / VERIFIED
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-400">
                UNACTIVE (Waiting for admin)
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {!statusData.verified ? (
          <Button
            variant="outline"
            size="lg"
            onClick={pollStatus}
            disabled={checking}
            className="w-full sm:flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Refresh Status"}
          </Button>
        ) : null}
        <Button asChild variant="hero" size="lg" className="w-full sm:flex-1">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
