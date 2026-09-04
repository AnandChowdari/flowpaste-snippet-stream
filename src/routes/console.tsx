import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Shield,
  ShieldCheck,
  Lock,
  Key,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Smartphone,
  RotateCcw,
  Ban,
  ExternalLink,
  DollarSign,
  Users,
  Copy,
  Check,
  LogOut,
  History,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  adminLoginClient,
  adminVerifySessionClient,
  adminGetDashboardClient,
  adminVerifyPaymentClient,
  adminUnverifyPaymentClient,
  adminResendCredentialsClient,
  adminResetDeviceClient,
  adminRevokeLicenseClient,
  adminDeleteOrderClient,
} from "@/lib/admin-client";
import type { OrderWithLicense, StoredAuditLog, DashboardMetrics } from "@/lib/flowpaste-types";

export const Route = createFileRoute("/console")({
  component: AdminConsolePage,
});

const SESSION_STORAGE_KEY = "flowpaste_console_session_token";

export function AdminConsolePage() {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Login form state
  const [usernameInput, setUsernameInput] = useState("support.support49");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard data state
  const [orders, setOrders] = useState<OrderWithLicense[]>([]);
  const [auditLogs, setAuditLogs] = useState<StoredAuditLog[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalOrders: 0,
    pendingVerificationCount: 0,
    activeLicensesCount: 0,
    totalRevenue: 0,
  });
  const [loadingData, setLoadingLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // UI filters & view
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "verified" | "revoked">("all");
  const [activeView, setActiveView] = useState<"orders" | "audit">("orders");

  // Per-order pending operation state to prevent duplicate clicks
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Session Initialization ─────────────────────────────────────────────────
  useEffect(() => {
    async function initSession() {
      try {
        const storedToken = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (storedToken) {
          const res = await adminVerifySessionClient(storedToken);
          if (res.authenticated && res.username) {
            setToken(storedToken);
            setAdminUser(res.username);
            await loadDashboardData(storedToken);
          } else {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error("Session init error:", err);
      } finally {
        setIsInitializing(false);
      }
    }
    void initSession();
  }, []);

  async function loadDashboardData(currentToken: string) {
    setLoadingLoading(true);
    try {
      const res = await adminGetDashboardClient(currentToken);
      if (res.success && res.orders) {
        setOrders(res.orders);
        setAuditLogs(res.auditLogs || []);
        if (res.metrics) setMetrics(res.metrics);
        setLastRefreshed(new Date());
      } else {
        toast.error(res.error || "Failed to load dashboard data");
      }
    } catch (err) {
      toast.error("Network error while loading dashboard data");
    } finally {
      setLoadingLoading(false);
    }
  }

  // ── Login & Logout ─────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim() || loginLoading) return;

    setLoginLoading(true);
    try {
      const res = await adminLoginClient(usernameInput.trim(), passwordInput.trim());

      if (res.success && res.token) {
        setToken(res.token);
        setAdminUser(res.user || "support.support49");
        sessionStorage.setItem(SESSION_STORAGE_KEY, res.token);
        toast.success("Welcome back, Administrator");
        setPasswordInput(""); // Clear password from memory immediately
        await loadDashboardData(res.token);
      } else {
        toast.error(res.error || "Invalid username or password");
      }
    } catch (err) {
      toast.error("An error occurred during authentication");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setToken(null);
    setAdminUser(null);
    setOrders([]);
    setAuditLogs([]);
    toast.info("Logged out of Admin Console");
  }

  // ── Administrative Actions (Idempotent) ────────────────────────────────────
  async function handleTogglePaymentVerified(order: OrderWithLicense) {
    if (!token) return;
    const targetOrderId = order.orderId;
    if (actionInProgress[targetOrderId]) return; // Debounce / prevent duplicate clicks

    setActionInProgress((prev) => ({ ...prev, [targetOrderId]: true }));
    const isCurrentlyVerified = order.paymentVerified;

    try {
      if (!isCurrentlyVerified) {
        // Mark Payment Verified -> Generates License & sends credentials
        const res = await adminVerifyPaymentClient(token, targetOrderId);

        if (res.success && res.order && res.license) {
          toast.success(`Payment verified! License ${res.license.licenseId} provisioned.`, {
            description: res.emailSent
              ? `Credentials emailed to ${res.order.email}`
              : "Credentials email already dispatched previously.",
          });
          await loadDashboardData(token);
        } else {
          toast.error(res.error || "Verification failed");
        }
      } else {
        // Unverify payment
        const res = await adminUnverifyPaymentClient(token, targetOrderId);

        if (res.success && res.order) {
          toast.info(`Payment unverified for ${targetOrderId}. License moved to PENDING.`);
          await loadDashboardData(token);
        } else {
          toast.error(res.error || "Failed to unverify payment");
        }
      }
    } catch (err) {
      toast.error("Operation failed");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [targetOrderId]: false }));
    }
  }

  async function handleResendCredentials(order: OrderWithLicense) {
    if (!token || !order.licenseId) return;
    const orderId = order.orderId;
    if (actionInProgress[orderId]) return;

    setActionInProgress((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await adminResendCredentialsClient(token, orderId);
      if (res.success) {
        toast.success(`Credentials resent to ${res.sentTo}`, {
          description: `Key: ${res.licenseKey} (License ID: ${res.licenseId})`,
        });
        await loadDashboardData(token);
      } else {
        toast.error(res.error || "Failed to resend credentials");
      }
    } catch {
      toast.error("Resend operation failed");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function handleResetDevice(order: OrderWithLicense) {
    if (!token || !order.licenseId) return;
    const orderId = order.orderId;
    if (actionInProgress[orderId]) return;

    setActionInProgress((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await adminResetDeviceClient(token, order.licenseId);
      if (res.success) {
        toast.success(`Device binding reset for ${order.licenseId}`, {
          description: "Customer can now activate on a new device. License Key remains valid.",
        });
        await loadDashboardData(token);
      } else {
        toast.error(res.error || "Failed to reset device");
      }
    } catch {
      toast.error("Reset device operation failed");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function handleRevokeLicense(order: OrderWithLicense) {
    if (!token || !order.licenseId) return;
    const orderId = order.orderId;
    if (actionInProgress[orderId]) return;

    setActionInProgress((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await adminRevokeLicenseClient(token, order.licenseId);
      if (res.success) {
        toast.warning(`License ${order.licenseId} revoked.`, {
          description: "Extension will reject this license on next verification.",
        });
        await loadDashboardData(token);
      } else {
        toast.error(res.error || "Failed to revoke license");
      }
    } catch {
      toast.error("Revoke license operation failed");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function handleDeleteOrder(order: OrderWithLicense) {
    if (!token) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete order ${order.orderId} (${order.customerName})?\n\nThis will remove the order from the console and Google Sheets.`
    );
    if (!confirmDelete) return;

    setActionInProgress((prev) => ({ ...prev, [order.orderId]: true }));
    try {
      const res = await adminDeleteOrderClient(token, order.orderId);
      if (res.success) {
        toast.success(`Order ${order.orderId} deleted successfully.`);
        await loadDashboardData(token);
      } else {
        toast.error(res.error || "Failed to delete order");
      }
    } catch {
      toast.error("Delete order operation failed");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [order.orderId]: false }));
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.info(`Copied to clipboard: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // ── Filtered Orders ────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (filterTab === "pending" && order.paymentVerified) return false;
      if (filterTab === "verified" && !order.paymentVerified) return false;
      if (filterTab === "revoked" && order.licenseStatus !== "REVOKED") return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        order.customerName.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.orderId.toLowerCase().includes(q) ||
        order.paymentReferenceId.toLowerCase().includes(q) ||
        (order.licenseId && order.licenseId.toLowerCase().includes(q))
      );
    });
  }, [orders, filterTab, searchQuery]);

  // ── Loading Skeleton ───────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-lime-400" />
          <p className="text-sm text-slate-400">Loading FlowPaste Admin Console…</p>
        </div>
      </div>
    );
  }

  // ── 1. Unauthenticated Login Screen ────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 font-sans text-slate-100">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
          {/* Subtle lime glow accent */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />

          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-500/30 bg-lime-500/10 text-lime-400 shadow-inner">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
              FlowPaste Console
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Protected Administrator Management Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Administrator Username
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="support.support49"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginLoading}
              className="mt-6 w-full rounded-xl bg-lime-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-lime-300 disabled:opacity-50"
            >
              {loginLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Authenticating…
                </div>
              ) : (
                "Sign In to Console"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-500">
            Internal Operations Portal · Session-authenticated & server-verified
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Authenticated Admin Dashboard ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-lime-500/20 selection:text-lime-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white">FlowPaste Console</span>
              <span className="ml-2 rounded-full border border-lime-500/20 bg-lime-500/10 px-2 py-0.5 text-[10px] font-semibold text-lime-400">
                1 Device License Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
              {adminUser}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => token && loadDashboardData(token)}
              disabled={loadingData}
              className="rounded-lg border-slate-800 bg-slate-900 text-xs text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingData ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs text-slate-400">Total Orders</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{metrics.totalOrders}</span>
              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <span className="text-xs text-amber-400">Pending Verification</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-300">
                {metrics.pendingVerificationCount}
              </span>
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
          </div>

          <div className="rounded-xl border border-lime-500/30 bg-lime-500/5 p-4">
            <span className="text-xs text-lime-400">Active Licenses</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-lime-300">
                {metrics.activeLicensesCount}
              </span>
              <Key className="h-4 w-4 text-lime-400" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs text-slate-400">Total Revenue</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">₹{metrics.totalRevenue}</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            <button
              onClick={() => setActiveView("orders")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                activeView === "orders"
                  ? "bg-lime-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Customer Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveView("audit")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                activeView === "audit"
                  ? "bg-lime-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Audit Trail ({auditLogs.length})
            </button>
          </div>

          {activeView === "orders" && (
            <div className="flex flex-1 items-center gap-3 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search name, email, order, ref, license…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 pr-4 pl-9 text-xs text-white placeholder-slate-500 focus:border-lime-400 focus:outline-none"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="hidden rounded-xl border border-slate-800 bg-slate-900/60 p-1 md:flex">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    filterTab === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterTab("pending")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    filterTab === "pending"
                      ? "bg-amber-500/20 text-amber-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterTab("verified")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    filterTab === "verified"
                      ? "bg-lime-500/20 text-lime-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Verified
                </button>
                <button
                  onClick={() => setFilterTab("revoked")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    filterTab === "revoked"
                      ? "bg-rose-500/20 text-rose-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Revoked
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Orders Table ──────────────────────────────────────────────────── */}
        {activeView === "orders" && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Customer</th>
                    <th className="px-4 py-3.5 font-semibold">Order / Ref</th>
                    <th className="px-4 py-3.5 font-semibold">Amount</th>
                    <th className="px-4 py-3.5 font-semibold">Payment Status</th>
                    <th className="px-4 py-3.5 font-semibold text-center">
                      <span className="inline-flex items-center gap-1 text-lime-400">
                        Payment Verified
                      </span>
                    </th>
                    <th className="px-4 py-3.5 font-semibold">License ID & Status</th>
                    <th className="px-4 py-3.5 font-semibold">Device</th>
                    <th className="px-4 py-3.5 font-semibold">Created / Verified</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        No matching orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const isPendingAction = Boolean(actionInProgress[order.orderId]);
                      const isVerified = order.paymentVerified;

                      return (
                        <tr
                          key={order.orderId}
                          className="transition hover:bg-slate-800/30"
                        >
                          {/* 1. Customer */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-white">{order.customerName}</div>
                            <div className="text-[11px] text-slate-400">{order.email}</div>
                          </td>

                          {/* 2. Order & Payment Ref */}
                          <td className="px-4 py-3.5 font-mono">
                            <div className="flex items-center gap-1.5 text-white">
                              <span>{order.orderId}</span>
                              <button
                                onClick={() => handleCopy(order.orderId, `ord-${order.orderId}`)}
                                className="text-slate-500 hover:text-slate-300"
                                title="Copy Order ID"
                              >
                                {copiedId === `ord-${order.orderId}` ? (
                                  <Check className="h-3 w-3 text-lime-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{order.paymentReferenceId}</span>
                              <button
                                onClick={() =>
                                  handleCopy(order.paymentReferenceId, `ref-${order.orderId}`)
                                }
                                className="text-slate-500 hover:text-slate-300"
                                title="Copy Reference ID"
                              >
                                {copiedId === `ref-${order.orderId}` ? (
                                  <Check className="h-3 w-3 text-lime-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 3. Amount */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-white">₹{order.amount}</span>
                            <span className="block text-[10px] text-slate-400 uppercase">
                              {order.planId}
                            </span>
                          </td>

                          {/* 4. Payment Status */}
                          <td className="px-4 py-3.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                order.paymentStatus === "ACTIVE" || order.paymentStatus === "PAID"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              }`}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </td>

                          {/* 5. BACKEND-CONNECTED PAYMENT VERIFIED CHECKBOX */}
                          <td className="px-4 py-3.5 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isVerified}
                                disabled={isPendingAction}
                                onChange={() => handleTogglePaymentVerified(order)}
                                className="h-5 w-5 rounded-md border-slate-700 bg-slate-900 text-lime-400 accent-lime-400 focus:ring-1 focus:ring-lime-400 disabled:opacity-50"
                              />
                            </label>
                            <span className="block text-[9px] text-slate-400">
                              {isVerified ? "TRUE" : "FALSE"}
                            </span>
                          </td>

                          {/* 6. License ID & Status */}
                          <td className="px-4 py-3.5">
                            {order.licenseId ? (
                              <div>
                                <div className="flex items-center gap-1 font-mono font-bold text-lime-300">
                                  <span>{order.licenseId}</span>
                                  <button
                                    onClick={() =>
                                      handleCopy(order.licenseId!, `lic-${order.orderId}`)
                                    }
                                    className="text-slate-500 hover:text-slate-300"
                                    title="Copy License ID"
                                  >
                                    {copiedId === `lic-${order.orderId}` ? (
                                      <Check className="h-3 w-3 text-lime-400" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`mt-0.5 text-[9px] ${
                                    order.licenseStatus === "ACTIVE"
                                      ? "border-lime-500/30 bg-lime-500/10 text-lime-400"
                                      : order.licenseStatus === "REVOKED"
                                      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                      : "border-slate-700 bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {order.licenseStatus || "PENDING"}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">— None —</span>
                            )}
                          </td>

                          {/* 7. Device ID */}
                          <td className="px-4 py-3.5">
                            {order.deviceId ? (
                              <div className="flex items-center gap-1 text-[11px] text-slate-300">
                                <Smartphone className="h-3.5 w-3.5 text-lime-400 shrink-0" />
                                <span className="font-mono truncate max-w-[80px]" title={order.deviceId}>
                                  {order.deviceId.slice(0, 8)}…
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Unbound (1 free)</span>
                            )}
                          </td>

                          {/* 8. Timestamps */}
                          <td className="px-4 py-3.5 text-[10px] text-slate-400">
                            <div>Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</div>
                            {order.verifiedAt && (
                              <div className="text-lime-400/80">
                                Verified: {new Date(order.verifiedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </td>

                          {/* 9. Action Buttons */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Resend Credentials */}
                              {order.licenseId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isPendingAction}
                                  onClick={() => handleResendCredentials(order)}
                                  className="h-7 px-2 border-slate-800 bg-slate-900 text-[11px] text-slate-300 hover:border-slate-700 hover:text-white"
                                  title="Resend Credentials Email"
                                >
                                  <Mail className="h-3 w-3 mr-1" /> Resend
                                </Button>
                              )}

                              {/* Reset Device */}
                              {order.licenseId && order.deviceId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isPendingAction}
                                  onClick={() => handleResetDevice(order)}
                                  className="h-7 px-2 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-300 hover:bg-amber-500/20"
                                  title="Reset Device Binding (Max 1 Device)"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" /> Reset Device
                                </Button>
                              )}

                              {/* Revoke License */}
                              {order.licenseId && order.licenseStatus !== "REVOKED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isPendingAction}
                                  onClick={() => handleRevokeLicense(order)}
                                  className="h-7 px-2 border-rose-500/30 bg-rose-500/10 text-[11px] text-rose-300 hover:bg-rose-500/20"
                                  title="Revoke License"
                                >
                                  <Ban className="h-3 w-3 mr-1" /> Revoke
                                </Button>
                              )}

                              {/* Delete Order */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isPendingAction}
                                onClick={() => handleDeleteOrder(order)}
                                className="h-7 px-2 border-red-900/40 bg-red-950/30 text-[11px] text-red-400 hover:bg-red-900/40 hover:text-red-300"
                                title="Delete Order permanently"
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Audit Trail View ──────────────────────────────────────────────── */}
        {activeView === "audit" && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
            <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Immutable Audit Log
                </h3>
                <p className="text-[11px] text-slate-400">
                  Chronological record of every administrative and system transaction.
                </p>
              </div>
              <span className="text-[11px] text-slate-500">
                {auditLogs.length} total events
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">No audit logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-800/20 text-xs transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] border-slate-700 bg-slate-800 text-slate-300 font-bold"
                        >
                          {log.action}
                        </Badge>
                        <span className="text-slate-400 font-medium">by {log.adminUser}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 text-slate-300 font-medium">{log.details}</div>

                    <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500 font-mono">
                      {log.orderId && <span>Order: {log.orderId}</span>}
                      {log.paymentReferenceId && <span>Ref: {log.paymentReferenceId}</span>}
                      {log.licenseId && <span className="text-lime-400/80">License: {log.licenseId}</span>}
                      {log.previousStatus && log.newStatus && (
                        <span>
                          Status: {log.previousStatus} → {log.newStatus}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
