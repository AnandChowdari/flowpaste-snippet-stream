/**
 * Server-side communication bridge with Google Apps Script Web App.
 * Proxies Orders, Licenses, and Administrative actions directly to Google Sheets.
 */

const APPS_SCRIPT_URL =
  process.env["APPS_SCRIPT_URL"] ||
  "https://script.google.com/macros/s/AKfycbw6q2BwgHt_okFuanf-hPga9KeirtQDzaZbxbw1nDSfPc3p4m33Xvdn7omrbTb6VnDi/exec";
const ADMIN_SECRET = process.env["ADMIN_PASSWORD"] || "support.support49";

export interface AppsScriptResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

export async function callAppsScript<T = unknown>(
  payload: Record<string, unknown>
): Promise<AppsScriptResponse<T> | null> {
  const url = APPS_SCRIPT_URL.trim();
  if (!url) {
    console.warn("[AppsScript] No APPS_SCRIPT_URL configured.");
    return null;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const text = await res.text();
    try {
      return JSON.parse(text) as AppsScriptResponse<T>;
    } catch {
      console.error("[AppsScript] Non-JSON response received:", text.slice(0, 200));
      return {
        success: false,
        error: `Invalid response format from Apps Script (${res.status})`,
      };
    }
  } catch (err) {
    console.error("[AppsScript] Network or fetch error calling Apps Script:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error contacting Apps Script",
    };
  }
}

export const appsScriptBridge = {
  /**
   * Sync newly created order to Google Sheets 'Orders' sheet
   */
  async createOrder(order: {
    orderId: string;
    customerName: string;
    email: string;
    paymentReferenceId?: string;
    amount: number;
    currency: string;
    paymentStatus?: string;
  }) {
    return callAppsScript({
      action: "createOrder",
      orderId: order.orderId,
      customerName: order.customerName,
      email: order.email,
      paymentReferenceId: order.paymentReferenceId || "",
      amount: order.amount,
      currency: order.currency,
      paymentStatus: order.paymentStatus || "UNACTIVE",
    });
  },

  /**
   * Sync payment status updates (ACTIVE, UNACTIVE, PAID, FAILED, CANCELLED, REFUNDED)
   */
  async updatePaymentStatus(orderId: string, paymentReferenceId: string, paymentStatus: string) {
    return callAppsScript({
      action: "updatePaymentStatus",
      orderId,
      paymentReferenceId,
      paymentStatus,
    });
  },

  /**
   * Fetch real-time order status and credentials directly from Google Sheets
   */
  async getOrderStatus(params: { orderId?: string; paymentReferenceId?: string; email?: string }) {
    return callAppsScript<{
      orderId: string;
      customerName: string;
      email: string;
      paymentReferenceId: string;
      amount: number;
      currency: string;
      paymentStatus: string;
      paymentVerified: boolean;
      licenseId: string | null;
      licenseKey: string | null;
      licenseStatus: string;
      deviceId: string | null;
      verifiedAt: string | null;
      credentialsSentAt: string | null;
    }>({
      action: "getOrderStatus",
      ...params,
    });
  },

  /**
   * Verify payment, generate license idempotently, and trigger email delivery
   */
  async verifyPayment(orderId: string, adminUser = "support.support49") {
    return callAppsScript({
      action: "verifyPayment",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
      adminUser,
      orderId,
    });
  },

  /**
   * Unverify payment and suspend license to PENDING
   */
  async unverifyPayment(orderId: string, adminUser = "support.support49") {
    return callAppsScript({
      action: "unverifyPayment",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
      adminUser,
      orderId,
    });
  },

  /**
   * Resend credentials email to customer
   */
  async resendCredentials(orderId: string, adminUser = "support.support49") {
    return callAppsScript({
      action: "resendCredentials",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
      adminUser,
      orderId,
    });
  },

  /**
   * Reset device binding (Max 1 device)
   */
  async resetDevice(licenseId: string, adminUser = "support.support49") {
    return callAppsScript({
      action: "resetDevice",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
      adminUser,
      licenseId,
    });
  },

  /**
   * Revoke license
   */
  async revokeLicense(licenseId: string, adminUser = "support.support49") {
    return callAppsScript({
      action: "revokeLicense",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
      adminUser,
      licenseId,
    });
  },

  /**
   * Delete order from Google Sheets
   */
  async deleteOrder(orderId: string, adminUser = "support.support49") {
    return callAppsScript({
      action: "deleteOrder",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
      adminUser,
      orderId,
    });
  },

  /**
   * Fetch all orders from Google Sheets
   */
  async getOrders() {
    return callAppsScript<{ orders: unknown[] }>({
      action: "getOrders",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
    });
  },

  /**
   * Fetch audit logs from Google Sheets
   */
  async getAuditLogs(limit = 100) {
    return callAppsScript<{ logs: unknown[] }>({
      action: "getAuditLogs",
      adminToken: ADMIN_SECRET,
      adminSecret: ADMIN_SECRET,
      limit,
    });
  },
};
