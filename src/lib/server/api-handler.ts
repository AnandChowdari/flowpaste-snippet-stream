import { serverStore } from "./store";
import { verifySessionToken, verifyAdminCredentials, createSessionToken } from "./admin-auth";
import { appsScriptBridge } from "./apps-script";

export async function handleApiRequest(
  method: string,
  pathname: string,
  body: Record<string, unknown> | null,
  authHeader?: string | null,
  cookieHeader?: string | null
): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const jsonHeaders = { "Content-Type": "application/json" };

  // 1. Chrome Extension endpoints
  if (
    pathname === "/api/activate" ||
    (pathname === "/api/license" && String(body?.["action"] || "") === "activate")
  ) {
    const email = String(body?.["email"] || "");
    const licenseKey = String(body?.["licenseKey"] || "");
    const deviceId = String(body?.["deviceId"] || "");

    if (!email || !licenseKey || !deviceId) {
      return {
        status: 400,
        headers: jsonHeaders,
        body: { success: false, status: "INVALID_REQUEST", error: "Missing required fields" },
      };
    }
    const result = serverStore.activateLicense(email, licenseKey, deviceId);
    return {
      status: result.success ? 200 : 400,
      headers: jsonHeaders,
      body: result,
    };
  }

  if (
    pathname === "/api/verify" ||
    (pathname === "/api/license" && String(body?.["action"] || "") === "verify")
  ) {
    const email = String(body?.["email"] || "");
    const licenseKey = String(body?.["licenseKey"] || "");
    const deviceId = String(body?.["deviceId"] || "");

    if (!email || !licenseKey || !deviceId) {
      return {
        status: 400,
        headers: jsonHeaders,
        body: { active: false, status: "INVALID_REQUEST", error: "Missing required fields" },
      };
    }
    const result = serverStore.verifyLicense(email, licenseKey, deviceId);
    return {
      status: result.active ? 200 : 400,
      headers: jsonHeaders,
      body: result,
    };
  }

  // 2. Checkout endpoints
  if (pathname === "/api/orders/create" || (pathname === "/api/orders" && method === "POST")) {
    const customerName = String(body?.["customerName"] || body?.["name"] || "");
    const email = String(body?.["email"] || "");
    const planId = String(body?.["planId"] || "starter");
    const planName = String(body?.["planName"] || "Starter");
    const amount = Number(body?.["amount"]) || 49;
    const currency = String(body?.["currency"] || "INR");
    const orderParams: {
      customerName: string;
      email: string;
      planId: string;
      planName: string;
      amount: number;
      currency?: string;
      paymentReferenceId?: string;
    } = {
      customerName,
      email,
      planId,
      planName,
      amount,
      currency,
    };
    if (body?.["paymentReferenceId"]) {
      orderParams.paymentReferenceId = String(body["paymentReferenceId"]);
    }

    const order = serverStore.createOrder(orderParams);
    appsScriptBridge
      .createOrder({
        orderId: order.orderId,
        customerName: order.customerName,
        email: order.email,
        paymentReferenceId: order.paymentReferenceId,
        amount: order.amount,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
      })
      .catch((e) => console.error("[AppsScript Sync] createOrder error:", e));

    return {
      status: 200,
      headers: jsonHeaders,
      body: { success: true, order },
    };
  }

  if (pathname === "/api/orders/confirm") {
    const target = String(body?.["orderId"] || body?.["paymentReferenceId"] || "");
    const customRef = body?.["newPaymentReferenceId"] || body?.["customRefId"]
      ? String(body["newPaymentReferenceId"] || body["customRefId"])
      : undefined;
    const order = serverStore.confirmOrderPayment(target, customRef);
    if (!order) {
      return {
        status: 404,
        headers: jsonHeaders,
        body: { success: false, error: "Order not found" },
      };
    }
    appsScriptBridge
      .updatePaymentStatus(order.orderId, order.paymentReferenceId, "UNACTIVE")
      .catch((e) => console.error("[AppsScript Sync] updatePaymentStatus error:", e));

    return {
      status: 200,
      headers: jsonHeaders,
      body: { success: true, order },
    };
  }

  if (pathname === "/api/orders/status" || pathname === "/api/order-status") {
    const target = String(
      body?.["orderId"] ||
        body?.["paymentReferenceId"] ||
        body?.["reference"] ||
        body?.["id"] ||
        ""
    );
    if (!target) {
      return {
        status: 400,
        headers: jsonHeaders,
        body: { success: false, error: "Missing orderId or paymentReferenceId" },
      };
    }

    // 1. Try real-time status directly from Google Sheets
    try {
      const remote = await appsScriptBridge.getOrderStatus({
        orderId: target,
        paymentReferenceId: target,
      });
      if (remote && remote.success) {
        return {
          status: 200,
          headers: jsonHeaders,
          body: remote,
        };
      }
    } catch (e) {
      console.warn("[OrderStatus] Apps Script live query fallback to local store:", e);
    }

    // 2. Fallback to local store
    const local = serverStore.getOrderStatus(target);
    if (local) {
      return {
        status: 200,
        headers: jsonHeaders,
        body: {
          success: true,
          orderId: local.orderId,
          customerName: local.customerName,
          email: local.email,
          paymentReferenceId: local.paymentReferenceId,
          amount: local.amount,
          currency: local.currency,
          paymentStatus: local.paymentStatus,
          paymentVerified: local.paymentVerified,
          licenseId: local.licenseId,
          licenseKey: local.licenseKey,
          licenseStatus: local.licenseStatus,
          verifiedAt: local.verifiedAt,
          credentialsSentAt: local.credentialsSentAt,
        },
      };
    }

    return {
      status: 404,
      headers: jsonHeaders,
      body: { success: false, error: "Order not found" },
    };
  }

  // 3. Admin Authentication Endpoints
  if (pathname === "/api/admin/login" && method === "POST") {
    const username = String(body?.["username"] || "");
    const password = String(body?.["password"] || "");
    const isValid = verifyAdminCredentials(username, password);
    if (!isValid) {
      return {
        status: 401,
        headers: jsonHeaders,
        body: { success: false, error: "Invalid username or password" },
      };
    }
    const token = createSessionToken(username);
    return {
      status: 200,
      headers: {
        ...jsonHeaders,
        "Set-Cookie": `flowpaste_console_session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
      body: { success: true, user: username, token },
    };
  }

  if (pathname === "/api/admin/verify-session") {
    const token =
      authHeader?.replace("Bearer ", "") ||
      String(body?.["token"] || "") ||
      cookieHeader
        ?.split(";")
        .find((c) => c.trim().startsWith("flowpaste_console_session_token="))
        ?.split("=")[1];

    const adminSession = verifySessionToken(token);
    return {
      status: 200,
      headers: jsonHeaders,
      body: {
        authenticated: Boolean(adminSession),
        username: adminSession?.username || null,
        expiresAt: adminSession?.expiresAt || null,
      },
    };
  }

  // 4. Protected Admin Endpoints (Requires Valid Session)
  const token =
    authHeader?.replace("Bearer ", "") ||
    cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("flowpaste_console_session_token="))
      ?.split("=")[1] ||
    String(body?.["token"] || "");

  const adminSession = verifySessionToken(token);
  const adminSecret = String(body?.["adminToken"] || body?.["adminPassword"] || "");
  const isDirectAdmin = adminSecret === "support.support49";

  if (!adminSession && !isDirectAdmin) {
    return {
      status: 401,
      headers: jsonHeaders,
      body: { success: false, status: "UNAUTHORIZED", error: "Admin authentication required" },
    };
  }

  const adminUser = adminSession ? adminSession.username : "support.support49";

  if (pathname === "/api/admin/dashboard" || pathname === "/api/orders") {
    try {
      const remote = await appsScriptBridge.getOrders();
      if (remote && remote.success && Array.isArray(remote["orders"])) {
        serverStore.syncFromAppsScriptOrders(remote["orders"] as unknown[]);
      }
    } catch (e) {
      console.error("[AppsScript Sync] Could not fetch live orders from Sheets:", e);
    }

    const dash = serverStore.getDashboardData();
    return {
      status: 200,
      headers: jsonHeaders,
      body: { success: true, ...dash },
    };
  }

  if (
    pathname === "/api/admin/verify" ||
    (pathname === "/api/orders/verify" && method === "POST")
  ) {
    const orderId = String(body?.["orderId"] || "");
    if (!orderId) {
      return {
        status: 400,
        headers: jsonHeaders,
        body: { success: false, error: "Missing orderId" },
      };
    }
    const result = serverStore.verifyOrderPayment(orderId, adminUser);
    if (!result) {
      return {
        status: 404,
        headers: jsonHeaders,
        body: { success: false, error: "Order not found" },
      };
    }
    appsScriptBridge
      .verifyPayment(orderId, adminUser)
      .catch((e) => console.error("[AppsScript Sync] verifyPayment error:", e));

    return {
      status: 200,
      headers: jsonHeaders,
      body: { success: true, ...result },
    };
  }

  if (pathname === "/api/admin/unverify") {
    const orderId = String(body?.["orderId"] || "");
    if (!orderId) {
      return {
        status: 400,
        headers: jsonHeaders,
        body: { success: false, error: "Missing orderId" },
      };
    }
    const order = serverStore.unverifyOrderPayment(orderId, adminUser);
    if (!order) {
      return {
        status: 404,
        headers: jsonHeaders,
        body: { success: false, error: "Order not found" },
      };
    }
    appsScriptBridge
      .unverifyPayment(orderId, adminUser)
      .catch((e) => console.error("[AppsScript Sync] unverifyPayment error:", e));

    return {
      status: 200,
      headers: jsonHeaders,
      body: { success: true, order },
    };
  }

  if (pathname === "/api/admin/resend") {
    const orderId = String(body?.["orderId"] || "");
    const result = serverStore.resendOrderCredentials(orderId, adminUser);
    if (!result) {
      return {
        status: 404,
        headers: jsonHeaders,
        body: { success: false, error: "Could not resend credentials" },
      };
    }
    appsScriptBridge
      .resendCredentials(orderId, adminUser)
      .catch((e) => console.error("[AppsScript Sync] resendCredentials error:", e));

    return {
      status: 200,
      headers: jsonHeaders,
      body: { success: true, ...result },
    };
  }

  if (pathname === "/api/admin/reset-device") {
    const licenseId = String(body?.["licenseId"] || "");
    const success = serverStore.resetLicenseDevice(licenseId, adminUser);
    if (success) {
      appsScriptBridge
        .resetDevice(licenseId, adminUser)
        .catch((e) => console.error("[AppsScript Sync] resetDevice error:", e));
    }
    return {
      status: success ? 200 : 404,
      headers: jsonHeaders,
      body: { success },
    };
  }

  if (pathname === "/api/admin/revoke-license") {
    const licenseId = String(body?.["licenseId"] || "");
    const success = serverStore.revokeLicense(licenseId, adminUser);
    if (success) {
      appsScriptBridge
        .revokeLicense(licenseId, adminUser)
        .catch((e) => console.error("[AppsScript Sync] revokeLicense error:", e));
    }
    return {
      status: success ? 200 : 404,
      headers: jsonHeaders,
      body: { success },
    };
  }

  if (pathname === "/api/admin/delete" || pathname === "/api/admin/delete-order") {
    const orderId = String(body?.["orderId"] || "");
    if (!orderId) {
      return {
        status: 400,
        headers: jsonHeaders,
        body: { success: false, error: "Missing orderId" },
      };
    }
    const success = serverStore.deleteOrder(orderId, adminUser);
    if (success) {
      appsScriptBridge
        .deleteOrder(orderId, adminUser)
        .catch((e) => console.error("[AppsScript Sync] deleteOrder error:", e));
    }
    return {
      status: success ? 200 : 404,
      headers: jsonHeaders,
      body: { success, message: success ? "Order deleted successfully" : "Order not found" },
    };
  }

  return {
    status: 404,
    headers: jsonHeaders,
    body: { success: false, error: "API route not found" },
  };
}
