import type {
  OrderWithLicense,
  StoredAuditLog,
  DashboardMetrics,
  StoredOrder,
  StoredLicense,
} from "./flowpaste-types";

export interface DashboardResponse {
  success: boolean;
  orders?: OrderWithLicense[];
  licenses?: StoredLicense[];
  auditLogs?: StoredAuditLog[];
  metrics?: DashboardMetrics;
  error?: string;
}

export async function adminLoginClient(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return (await res.json()) as { success: boolean; token?: string; user?: string; error?: string };
  } catch (e: any) {
    return { success: false, error: e?.message || "Login request failed" };
  }
}

export async function adminVerifySessionClient(
  token: string
): Promise<{ authenticated: boolean; username?: string | null }> {
  try {
    const res = await fetch("/api/admin/verify-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });
    return (await res.json()) as { authenticated: boolean; username?: string | null };
  } catch {
    return { authenticated: false };
  }
}

export async function adminGetDashboardClient(token: string): Promise<DashboardResponse> {
  try {
    const res = await fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as DashboardResponse;
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to load dashboard" };
  }
}

export async function adminVerifyPaymentClient(
  token: string,
  orderId: string
): Promise<{
  success: boolean;
  order?: StoredOrder;
  license?: StoredLicense;
  emailSent?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, token }),
    });
    return (await res.json()) as {
      success: boolean;
      order?: StoredOrder;
      license?: StoredLicense;
      emailSent?: boolean;
      error?: string;
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Verify payment failed" };
  }
}

export async function adminUnverifyPaymentClient(
  token: string,
  orderId: string
): Promise<{ success: boolean; order?: StoredOrder; error?: string }> {
  try {
    const res = await fetch("/api/admin/unverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, token }),
    });
    return (await res.json()) as { success: boolean; order?: StoredOrder; error?: string };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unverify payment failed" };
  }
}

export async function adminResendCredentialsClient(
  token: string,
  orderId: string
): Promise<{ success: boolean; licenseId?: string; licenseKey?: string; sentTo?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/resend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, token }),
    });
    return (await res.json()) as {
      success: boolean;
      licenseId?: string;
      licenseKey?: string;
      sentTo?: string;
      error?: string;
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Resend failed" };
  }
}

export async function adminResetDeviceClient(
  token: string,
  licenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/reset-device", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ licenseId, token }),
    });
    return (await res.json()) as { success: boolean; error?: string };
  } catch (e: any) {
    return { success: false, error: e?.message || "Reset device failed" };
  }
}

export async function adminRevokeLicenseClient(
  token: string,
  licenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/revoke-license", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ licenseId, token }),
    });
    return (await res.json()) as { success: boolean; error?: string };
  } catch (e: any) {
    return { success: false, error: e?.message || "Revoke failed" };
  }
}

export async function adminDeleteOrderClient(
  token: string,
  orderId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, token }),
    });
    return (await res.json()) as { success: boolean; message?: string; error?: string };
  } catch (e: any) {
    return { success: false, error: e?.message || "Delete failed" };
  }
}
