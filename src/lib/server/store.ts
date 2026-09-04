import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  AppStoreData,
  StoredOrder,
  StoredLicense,
  StoredAuditLog,
  StoredEmailLog,
  OrderWithLicense,
  DashboardMetrics,
} from "./types";

const STORE_PATH = path.resolve(process.cwd(), "data", "store.json");
const APPS_SCRIPT_URL = process.env["APPS_SCRIPT_URL"] || "";

// Default fallback database template
const INITIAL_STORE: AppStoreData = {
  orders: [],
  licenses: [],
  auditLogs: [],
  emailLogs: [],
  nextLicenseSeq: 1,
};

function readStore(): AppStoreData {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_STORE, null, 2), "utf-8");
      return INITIAL_STORE;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppStoreData>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      licenses: Array.isArray(parsed.licenses) ? parsed.licenses : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      emailLogs: Array.isArray(parsed.emailLogs) ? parsed.emailLogs : [],
      nextLicenseSeq: typeof parsed.nextLicenseSeq === "number" ? parsed.nextLicenseSeq : 1,
    };
  } catch (err) {
    console.error("[Store] Error reading store.json:", err);
    return INITIAL_STORE;
  }
}

function writeStore(data: AppStoreData): void {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    // Write atomically via tmp file
    const tempPath = `${STORE_PATH}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, STORE_PATH);
  } catch (err) {
    console.error("[Store] Error writing store.json:", err);
  }
}

function generateLicenseId(store: AppStoreData): string {
  let maxNum = 0;
  for (const lic of store.licenses) {
    const match = lic.licenseId.match(/^LIC-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1]!, 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextSeq = Math.max(maxNum + 1, store.nextLicenseSeq);
  store.nextLicenseSeq = nextSeq + 1;
  return `LIC-${String(nextSeq).padStart(6, "0")}`;
}

function generateUniqueLicenseKey(store: AppStoreData): string {
  const existing = new Set(store.licenses.map((l) => l.licenseKey.toUpperCase()));
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let attempt = 0; attempt < 50; attempt++) {
    const parts: string[] = [];
    for (let p = 0; p < 4; p++) {
      let seg = "";
      for (let c = 0; c < 4; c++) {
        seg += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      parts.push(seg);
    }
    const candidate = parts.join("-");
    if (!existing.has(candidate)) {
      return candidate;
    }
  }
  return `LIC-${crypto.randomUUID().slice(0, 16).toUpperCase()}`;
}

function logAudit(
  store: AppStoreData,
  adminUser: string,
  action: string,
  orderId: string | null,
  paymentReferenceId: string | null,
  licenseId: string | null,
  previousStatus: string | null,
  newStatus: string | null,
  details: string
): StoredAuditLog {
  const log: StoredAuditLog = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    adminUser,
    action,
    orderId,
    paymentReferenceId,
    licenseId,
    previousStatus,
    newStatus,
    details,
  };
  store.auditLogs.unshift(log);
  return log;
}

function recordEmailLog(
  store: AppStoreData,
  to: string,
  customerName: string,
  licenseId: string,
  licenseKey: string
): StoredEmailLog {
  const bodyText = [
    `Hello ${customerName || "there"},\n\n`,
    `Thank you for your purchase. Your CodeChef Auto Solver license is ready.\n\n`,
    `Email: ${to}\n`,
    `License Key: ${licenseKey}\n`,
    `License ID: ${licenseId}\n`,
    `Maximum Devices: 1\n\n`,
    `Installation instructions:\n`,
    `1. Open Google Chrome and install the CodeChef Auto Solver extension.\n`,
    `2. Click the extension icon in your Chrome toolbar.\n`,
    `3. Enter your registered email (${to}) and License Key (${licenseKey}).\n`,
    `4. Click "Activate". Your current device will be bound automatically (Max 1 device).\n`,
    `5. Navigate to any CodeChef problem page, choose your mode (API Solver or Paste Code), and press Alt+Q!\n\n`,
    `Thank you,\nCodeChef Auto Solver Team`,
  ].join("");

  const emailLog: StoredEmailLog = {
    id: `EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sentAt: new Date().toISOString(),
    to,
    customerName,
    licenseId,
    licenseKey,
    subject: "Your CodeChef Auto Solver License is Ready",
    bodyText,
    status: "SENT",
  };
  store.emailLogs.unshift(emailLog);
  return emailLog;
}

export const serverStore = {
  getOrders(): StoredOrder[] {
    const store = readStore();
    return store.orders;
  },

  getOrderById(orderId: string): StoredOrder | null {
    const store = readStore();
    return store.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase()) || null;
  },

  getOrderByRef(refId: string): StoredOrder | null {
    const store = readStore();
    return (
      store.orders.find((o) => o.paymentReferenceId.toUpperCase() === refId.toUpperCase()) || null
    );
  },

  getLicenseById(licenseId: string): StoredLicense | null {
    const store = readStore();
    return store.licenses.find((l) => l.licenseId.toUpperCase() === licenseId.toUpperCase()) || null;
  },

  getDashboardData(): {
    orders: OrderWithLicense[];
    licenses: StoredLicense[];
    auditLogs: StoredAuditLog[];
    metrics: DashboardMetrics;
  } {
    const store = readStore();
    const licenseMap = new Map<string, StoredLicense>();
    for (const lic of store.licenses) {
      licenseMap.set(lic.licenseId, lic);
    }

    const ordersWithLicense: OrderWithLicense[] = store.orders.map((ord) => {
      const linkedLic = ord.licenseId ? licenseMap.get(ord.licenseId) : undefined;
      return {
        ...ord,
        licenseKey: linkedLic ? linkedLic.licenseKey : null,
        deviceId: linkedLic ? linkedLic.deviceId : null,
        licenseStatus: linkedLic ? linkedLic.status : ord.paymentVerified ? "ACTIVE" : "PENDING",
      };
    });

    const metrics: DashboardMetrics = {
      totalOrders: store.orders.length,
      pendingVerificationCount: store.orders.filter(
        (o) =>
          (o.paymentStatus === "UNACTIVE" ||
            o.paymentStatus === "PAID" ||
            o.paymentStatus === "PENDING") &&
          !o.paymentVerified
      ).length,
      activeLicensesCount: store.licenses.filter((l) => l.status === "ACTIVE").length,
      totalRevenue: store.orders
        .filter((o) => o.paymentVerified || o.paymentStatus === "ACTIVE" || o.paymentStatus === "PAID")
        .reduce((sum, o) => sum + (o.amount || 0), 0),
    };

    return {
      orders: ordersWithLicense,
      licenses: store.licenses,
      auditLogs: store.auditLogs,
      metrics,
    };
  },

  createOrder(params: {
    customerName: string;
    email: string;
    planId: string;
    planName: string;
    amount: number;
    currency?: string;
    paymentReferenceId?: string;
  }): StoredOrder {
    const store = readStore();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.customerName.trim();

    // Check for existing pending order with identical reference
    if (params.paymentReferenceId) {
      const existing = store.orders.find(
        (o) => o.paymentReferenceId.toUpperCase() === params.paymentReferenceId!.toUpperCase()
      );
      if (existing) return existing;
    }

    const orderId = `ORD-${String(Math.floor(10000000 + Math.random() * 90000000))}`;
    const paymentReferenceId =
      params.paymentReferenceId ||
      `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const now = new Date().toISOString();

    const newOrder: StoredOrder = {
      orderId,
      customerName: cleanName,
      email: cleanEmail,
      paymentReferenceId,
      amount: params.amount,
      currency: (params.currency || "INR").toUpperCase(),
      planId: params.planId,
      planName: params.planName,
      paymentStatus: "UNACTIVE",
      paymentVerified: false,
      licenseId: null,
      createdAt: now,
      verifiedAt: null,
      credentialsSentAt: null,
      emailDeliveryStatus: "PENDING",
    };

    store.orders.unshift(newOrder);
    logAudit(
      store,
      "customer",
      "CREATE_ORDER",
      orderId,
      paymentReferenceId,
      null,
      null,
      "UNACTIVE",
      `Order created by ${cleanName} (${cleanEmail}) with ref ${paymentReferenceId}`
    );

    writeStore(store);
    return newOrder;
  },

  confirmOrderPayment(orderIdOrRef: string, newRefId?: string): StoredOrder | null {
    const store = readStore();
    const order = store.orders.find(
      (o) =>
        o.orderId.toUpperCase() === orderIdOrRef.toUpperCase() ||
        o.paymentReferenceId.toUpperCase() === orderIdOrRef.toUpperCase()
    );
    if (!order) return null;

    if (newRefId && newRefId.trim()) {
      order.paymentReferenceId = newRefId.trim();
    }
    const prevStatus = order.paymentStatus;
    // Customer completed payment form, status remains UNACTIVE until admin ticks checkbox
    order.paymentStatus = "UNACTIVE";
    logAudit(
      store,
      "customer",
      "CONFIRM_PAYMENT",
      order.orderId,
      order.paymentReferenceId,
      order.licenseId,
      prevStatus,
      "UNACTIVE",
      `Customer confirmed payment submission for ${order.paymentReferenceId}`
    );

    writeStore(store);
    return order;
  },

  /**
   * Idempotent Payment Verification
   * If admin checks verify repeatedly, reuses ONE license and does not send duplicate automatic emails.
   */
  verifyOrderPayment(
    orderId: string,
    adminUser = "support.support49"
  ): { order: StoredOrder; license: StoredLicense; emailSent: boolean } | null {
    const store = readStore();
    const order = store.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
    if (!order) return null;

    const now = new Date().toISOString();
    let license: StoredLicense | undefined;

    // Check if license already exists for this order
    if (order.licenseId) {
      license = store.licenses.find((l) => l.licenseId === order.licenseId);
    }

    if (license) {
      // Reuse existing license
      const prevLicStatus = license.status;
      license.status = "ACTIVE";
      if (prevLicStatus !== "ACTIVE") {
        logAudit(
          store,
          adminUser,
          "VERIFY_PAYMENT",
          order.orderId,
          order.paymentReferenceId,
          license.licenseId,
          prevLicStatus,
          "ACTIVE",
          `License ${license.licenseId} reactivated for order ${order.orderId}`
        );
      }
    } else {
      // Generate single new license
      const newLicenseId = generateLicenseId(store);
      const newLicenseKey = generateUniqueLicenseKey(store);

      license = {
        licenseId: newLicenseId,
        customerName: order.customerName,
        email: order.email,
        licenseKey: newLicenseKey,
        deviceId: "",
        maxDevices: 1,
        status: "ACTIVE",
        createdAt: now,
        activatedAt: null,
        lastVerified: null,
        appVersion: "1.0",
      };

      store.licenses.unshift(license);
      order.licenseId = newLicenseId;

      logAudit(
        store,
        adminUser,
        "VERIFY_PAYMENT",
        order.orderId,
        order.paymentReferenceId,
        newLicenseId,
        "PENDING",
        "ACTIVE",
        `License ${newLicenseId} provisioned for ${order.customerName} (${order.email})`
      );
    }

    // Update order status: Payment Status becomes ACTIVE
    order.paymentStatus = "ACTIVE";
    order.paymentVerified = true;
    order.verifiedAt = now;

    // Email dispatch - only if NOT already sent
    let emailSent = false;
    if (!order.credentialsSentAt) {
      recordEmailLog(store, order.email, order.customerName, license.licenseId, license.licenseKey);
      order.credentialsSentAt = now;
      order.emailDeliveryStatus = "SENT";
      emailSent = true;
    }

    writeStore(store);
    return { order, license, emailSent };
  },

  unverifyOrderPayment(orderId: string, adminUser = "support.support49"): StoredOrder | null {
    const store = readStore();
    const order = store.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
    if (!order) return null;

    // Revert payment status to UNACTIVE
    order.paymentStatus = "UNACTIVE";
    order.paymentVerified = false;
    logAudit(
      store,
      adminUser,
      "UNVERIFY_PAYMENT",
      order.orderId,
      order.paymentReferenceId,
      order.licenseId,
      "ACTIVE",
      "UNACTIVE",
      `Payment verification unchecked by admin for order ${order.orderId}`
    );

    if (order.licenseId) {
      const license = store.licenses.find((l) => l.licenseId === order.licenseId);
      if (license) {
        const prevStatus = license.status;
        // Controlled transition: status -> PENDING (DO NOT destroy device ID!)
        license.status = "PENDING";
        logAudit(
          store,
          adminUser,
          "UNVERIFY_PAYMENT",
          null,
          null,
          license.licenseId,
          prevStatus,
          "PENDING",
          `License status changed from ${prevStatus} to PENDING (device binding preserved)`
        );
      }
    }

    writeStore(store);
    return order;
  },

  getOrderStatus(orderIdOrRef: string): OrderWithLicense | null {
    const store = readStore();
    const clean = orderIdOrRef.trim().toUpperCase();
    const order = store.orders.find(
      (o) => o.orderId.toUpperCase() === clean || o.paymentReferenceId.toUpperCase() === clean
    );
    if (!order) return null;

    const license = order.licenseId
      ? store.licenses.find((l) => l.licenseId === order.licenseId)
      : store.licenses.find((l) => l.email.toLowerCase() === order.email.toLowerCase());

    return {
      ...order,
      licenseKey: license ? license.licenseKey : null,
      deviceId: license ? license.deviceId : null,
      licenseStatus: license ? license.status : order.paymentVerified ? "ACTIVE" : "PENDING",
    };
  },

  resendOrderCredentials(
    orderId: string,
    adminUser = "support.support49"
  ): { licenseId: string; licenseKey: string; sentTo: string } | null {
    const store = readStore();
    const order = store.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
    if (!order || !order.licenseId) return null;

    const license = store.licenses.find((l) => l.licenseId === order.licenseId);
    if (!license) return null;

    const now = new Date().toISOString();
    recordEmailLog(store, order.email, order.customerName, license.licenseId, license.licenseKey);

    order.credentialsSentAt = now;
    order.emailDeliveryStatus = "SENT";

    logAudit(
      store,
      adminUser,
      "RESEND_CREDENTIALS",
      order.orderId,
      order.paymentReferenceId,
      license.licenseId,
      null,
      "EMAIL_SENT",
      `Admin resent credentials to ${order.email}`
    );

    writeStore(store);
    return {
      licenseId: license.licenseId,
      licenseKey: license.licenseKey,
      sentTo: order.email,
    };
  },

  resetLicenseDevice(licenseId: string, adminUser = "support.support49"): boolean {
    const store = readStore();
    const license = store.licenses.find((l) => l.licenseId.toUpperCase() === licenseId.toUpperCase());
    if (!license) return false;

    const prevDevice = license.deviceId || "UNBOUND";
    license.deviceId = "";
    license.activatedAt = null;

    logAudit(
      store,
      adminUser,
      "RESET_DEVICE",
      null,
      null,
      license.licenseId,
      prevDevice,
      "CLEARED",
      `Device binding cleared for license ${license.licenseId}`
    );

    writeStore(store);
    return true;
  },

  revokeLicense(licenseId: string, adminUser = "support.support49"): boolean {
    const store = readStore();
    const license = store.licenses.find((l) => l.licenseId.toUpperCase() === licenseId.toUpperCase());
    if (!license) return false;

    const prevStatus = license.status;
    license.status = "REVOKED";

    logAudit(
      store,
      adminUser,
      "REVOKE_LICENSE",
      null,
      null,
      license.licenseId,
      prevStatus,
      "REVOKED",
      `License ${license.licenseId} revoked by administrator`
    );

    writeStore(store);
    return true;
  },

  /**
   * Extension activation handler (matching Google Apps Script exactly)
   */
  activateLicense(
    email: string,
    licenseKey: string,
    deviceId: string
  ): { success: boolean; status: string; message: string; licenseId?: string } {
    const store = readStore();
    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = licenseKey.trim().toUpperCase();
    const cleanDevice = deviceId.trim();

    const license = store.licenses.find(
      (l) => l.email.toLowerCase() === cleanEmail && l.licenseKey.toUpperCase() === cleanKey
    );

    if (!license) {
      return { success: false, status: "INVALID_LICENSE", message: "License not found." };
    }

    if (license.status !== "ACTIVE") {
      return {
        success: false,
        status: license.status === "REVOKED" ? "LICENSE_REVOKED" : "LICENSE_NOT_ACTIVE",
        message: `License is ${license.status.toLowerCase()}.`,
      };
    }

    const now = new Date().toISOString();

    // 1st device
    if (!license.deviceId) {
      license.deviceId = cleanDevice;
      license.activatedAt = now;
      license.lastVerified = now;
      logAudit(
        store,
        "extension",
        "ACTIVATE_DEVICE",
        null,
        null,
        license.licenseId,
        "UNBOUND",
        "BOUND",
        `Bound to device ${cleanDevice}`
      );
      writeStore(store);
      return {
        success: true,
        status: "ACTIVATED",
        licenseId: license.licenseId,
        message: "License activated successfully on this device.",
      };
    }

    // Same device
    if (license.deviceId === cleanDevice) {
      license.lastVerified = now;
      writeStore(store);
      return {
        success: true,
        status: "ALREADY_ACTIVATED",
        licenseId: license.licenseId,
        message: "Device already activated.",
      };
    }

    // Different device -> limit reached
    return {
      success: false,
      status: "DEVICE_LIMIT_REACHED",
      message: `Maximum device limit reached (${license.maxDevices} device). Reset device in console to transfer.`,
    };
  },

  verifyLicense(
    email: string,
    licenseKey: string,
    deviceId: string
  ): { active: boolean; status: string; message: string } {
    const store = readStore();
    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = licenseKey.trim().toUpperCase();
    const cleanDevice = deviceId.trim();

    const license = store.licenses.find(
      (l) => l.email.toLowerCase() === cleanEmail && l.licenseKey.toUpperCase() === cleanKey
    );

    if (!license) {
      return { active: false, status: "INVALID_LICENSE", message: "License not found." };
    }

    if (license.status !== "ACTIVE") {
      return { active: false, status: "LICENSE_NOT_ACTIVE", message: "License not active." };
    }

    if (license.deviceId !== cleanDevice) {
      return { active: false, status: "DEVICE_MISMATCH", message: "Device mismatch." };
    }

    license.lastVerified = new Date().toISOString();
    writeStore(store);
    return { active: true, status: "SUCCESS", message: "License verified." };
  },

  syncFromAppsScriptOrders(remoteOrders: any[]): void {
    if (!Array.isArray(remoteOrders)) return;
    const store = readStore();

    const updatedOrders: StoredOrder[] = remoteOrders
      .filter((ro) => ro && ro.orderId)
      .map((ro) => ({
        orderId: String(ro.orderId || ""),
        customerName: String(ro.customerName || ""),
        email: String(ro.email || "").toLowerCase(),
        paymentReferenceId: String(ro.paymentReferenceId || ""),
        amount: Number(ro.amount || 0),
        currency: String(ro.currency || "USD"),
        planId: "standard",
        planName: "Flow Paste License",
        paymentStatus: String(ro.paymentStatus || "PENDING") as any,
        paymentVerified: Boolean(ro.paymentVerified),
        licenseId: ro.licenseId ? String(ro.licenseId) : null,
        createdAt: ro.createdAt ? String(ro.createdAt) : new Date().toISOString(),
        verifiedAt: ro.verifiedAt ? String(ro.verifiedAt) : null,
        credentialsSentAt: ro.credentialsSentAt ? String(ro.credentialsSentAt) : null,
        emailDeliveryStatus: ro.emailDeliveryStatus || "PENDING",
        emailError: ro.emailError || null,
      }));

    store.orders = updatedOrders;
    writeStore(store);
  },

  deleteOrder(orderId: string, adminUser = "support.support49"): boolean {
    const store = readStore();
    const cleanId = orderId.trim().toUpperCase();
    const orderIdx = store.orders.findIndex((o) => o.orderId.toUpperCase() === cleanId);
    if (orderIdx === -1) return false;

    const deleted = store.orders[orderIdx];
    if (!deleted) return false;

    store.orders.splice(orderIdx, 1);

    if (deleted.licenseId) {
      const licIdx = store.licenses.findIndex((l) => l.licenseId === deleted.licenseId);
      if (licIdx !== -1 && store.licenses[licIdx]) {
        const lic = store.licenses[licIdx]!;
        if (!lic.deviceId) {
          store.licenses.splice(licIdx, 1);
        } else {
          lic.status = "REVOKED";
        }
      }
    }

    logAudit(
      store,
      adminUser,
      "ORDER_DELETED",
      deleted.orderId,
      deleted.paymentReferenceId,
      deleted.licenseId,
      "EXISTING",
      "DELETED",
      `Order ${deleted.orderId} deleted by administrator`
    );
    writeStore(store);
    return true;
  },
};
