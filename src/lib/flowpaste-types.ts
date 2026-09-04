export type PaymentStatus =
  | "UNACTIVE"
  | "ACTIVE"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";
export type LicenseStatus = "ACTIVE" | "PENDING" | "REVOKED";
export type EmailDeliveryStatus = "PENDING" | "PENDING_AUTH" | "SENT" | "FAILED";

export interface StoredOrder {
  orderId: string;
  customerName: string;
  email: string;
  paymentReferenceId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  paymentStatus: PaymentStatus;
  paymentVerified: boolean;
  licenseId: string | null;
  createdAt: string;
  verifiedAt: string | null;
  credentialsSentAt: string | null;
  emailDeliveryStatus?: EmailDeliveryStatus;
}

export interface StoredLicense {
  licenseId: string;
  customerName: string;
  email: string;
  licenseKey: string;
  deviceId: string;
  maxDevices: number;
  status: LicenseStatus;
  createdAt: string;
  activatedAt: string | null;
  lastVerified: string | null;
  appVersion: string;
}

export interface StoredAuditLog {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  orderId: string | null;
  paymentReferenceId?: string | null;
  licenseId: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  details: string;
}

export interface StoredEmailLog {
  id: string;
  sentAt: string;
  to: string;
  customerName: string;
  licenseId: string;
  licenseKey: string;
  subject: string;
  bodyText: string;
  status: "SENT" | "FAILED";
}

export interface AppStoreData {
  orders: StoredOrder[];
  licenses: StoredLicense[];
  auditLogs: StoredAuditLog[];
  emailLogs: StoredEmailLog[];
  nextLicenseSeq: number;
}

export interface DashboardMetrics {
  totalOrders: number;
  pendingVerificationCount: number;
  activeLicensesCount: number;
  totalRevenue: number;
}

export interface OrderWithLicense extends StoredOrder {
  licenseKey?: string | null;
  deviceId?: string | null;
  licenseStatus?: LicenseStatus;
}
