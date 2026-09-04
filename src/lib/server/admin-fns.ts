import { createServerFn } from "@tanstack/react-start";
import { serverStore } from "./store";
import {
  verifyAdminCredentials,
  createSessionToken,
  verifySessionToken,
} from "./admin-auth";
import type { OrderWithLicense, StoredLicense, StoredAuditLog, DashboardMetrics } from "./types";

/**
 * Admin Login Server Function
 * Validates credentials strictly server-side.
 * Returns signed session token. Never sends the password.
 */
export const adminLoginFn = createServerFn({ method: "POST" })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const isValid = verifyAdminCredentials(data.username, data.password);
    if (!isValid) {
      return { success: false, error: "Invalid username or password" };
    }
    const token = createSessionToken(data.username.trim());
    return {
      success: true,
      user: data.username.trim(),
      token,
    };
  });

/**
 * Admin Session Verification Server Function
 */
export const adminVerifySessionFn = createServerFn({ method: "POST" })
  .validator((d: { token: string | null | undefined }) => d)
  .handler(async ({ data }) => {
    const session = verifySessionToken(data.token);
    if (!session) {
      return { authenticated: false };
    }
    return {
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
    };
  });

/**
 * Fetch Dashboard Data
 */
export const adminGetDashboardFn = createServerFn({ method: "POST" })
  .validator((d: { token: string | null | undefined }) => d)
  .handler(async ({ data }) => {
    const session = verifySessionToken(data.token);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const dash = serverStore.getDashboardData();
    return {
      success: true,
      ...dash,
    };
  });

/**
 * Verify Payment (Admin checkbox: Payment Verified = TRUE)
 * Idempotent!
 */
export const adminVerifyPaymentFn = createServerFn({ method: "POST" })
  .validator((d: { token: string | null | undefined; orderId: string }) => d)
  .handler(async ({ data }) => {
    const session = verifySessionToken(data.token);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const result = serverStore.verifyOrderPayment(data.orderId, session.username);
    if (!result) {
      return { success: false, error: "Order not found" };
    }
    return {
      success: true,
      order: result.order,
      license: result.license,
      emailSent: result.emailSent,
    };
  });

/**
 * Unverify Payment (Admin checkbox: Payment Verified = FALSE)
 */
export const adminUnverifyPaymentFn = createServerFn({ method: "POST" })
  .validator((d: { token: string | null | undefined; orderId: string }) => d)
  .handler(async ({ data }) => {
    const session = verifySessionToken(data.token);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const order = serverStore.unverifyOrderPayment(data.orderId, session.username);
    if (!order) {
      return { success: false, error: "Order not found" };
    }
    return { success: true, order };
  });

/**
 * Resend Credentials
 */
export const adminResendCredentialsFn = createServerFn({ method: "POST" })
  .validator((d: { token: string | null | undefined; orderId: string }) => d)
  .handler(async ({ data }) => {
    const session = verifySessionToken(data.token);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const result = serverStore.resendOrderCredentials(data.orderId, session.username);
    if (!result) {
      return { success: false, error: "Could not resend credentials. License may not exist." };
    }
    return { success: true, ...result };
  });

/**
 * Reset Device
 */
export const adminResetDeviceFn = createServerFn({ method: "POST" })
  .validator((d: { token: string | null | undefined; licenseId: string }) => d)
  .handler(async ({ data }) => {
    const session = verifySessionToken(data.token);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const success = serverStore.resetLicenseDevice(data.licenseId, session.username);
    if (!success) {
      return { success: false, error: "License not found" };
    }
    return { success: true };
  });

/**
 * Revoke License
 */
export const adminRevokeLicenseFn = createServerFn({ method: "POST" })
  .validator((d: { token: string | null | undefined; licenseId: string }) => d)
  .handler(async ({ data }) => {
    const session = verifySessionToken(data.token);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const success = serverStore.revokeLicense(data.licenseId, session.username);
    if (!success) {
      return { success: false, error: "License not found" };
    }
    return { success: true };
  });

/**
 * Public Checkout: Create Order
 */
export const checkoutCreateOrderFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      customerName: string;
      email: string;
      planId: string;
      planName: string;
      amount: number;
      currency?: string;
    }) => d
  )
  .handler(async ({ data }) => {
    const order = serverStore.createOrder(data);
    return { success: true, order };
  });

/**
 * Public Checkout: Confirm Payment Submission
 */
export const checkoutConfirmPaymentFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const order = serverStore.confirmOrderPayment(data.orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }
    return { success: true, order };
  });
