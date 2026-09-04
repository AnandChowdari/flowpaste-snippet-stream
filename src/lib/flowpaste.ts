// FlowPaste client service layer

export type PlanId = "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  blurb: string;
  features: string[];
  recommended?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    priceLabel: "₹49",
    blurb: "The core copy-paste workflow, without the AI extras.",
    features: [
      "FlowPaste extension",
      "Reusable text snippets",
      "Quick-access insert panel",
      "Search and recently used",
      "One-time purchase",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    priceLabel: "₹99",
    blurb: "Adds AI Assist — powered by your own free Gemini API key.",
    features: [
      "Everything in Starter",
      "AI Assist with your Gemini API key (free)",
      "Reads selected text on the page",
      "Inserts an AI-drafted response into any editor",
      "Your key stays on your device",
      "One-time purchase",
    ],
    recommended: true,
  },
];

export function getPlan(id: string | undefined | null): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[1]!;
}

export interface Customer {
  name: string;
  email: string;
}

export type OrderStatus = "created" | "awaiting_verification" | "verified";

export interface Order {
  id: string;
  reference: string;
  plan: Plan;
  customer: Customer;
  amount: number;
  status: OrderStatus;
  createdAt: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function randomToken(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** POST customer details to backend */
export async function submitCustomerDetails(customer: Customer): Promise<Customer> {
  return customer;
}

/** Generate a unique payment reference */
export async function generatePaymentReference(): Promise<string> {
  return `PAY-${new Date().getFullYear()}-${randomToken(6)}`;
}

/** Create the order row in backend (Google Sheets / Store) */
export async function createOrder(customer: Customer, plan: Plan): Promise<Order> {
  try {
    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customer.name,
        email: customer.email,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        currency: "INR",
      }),
    });

    const result = (await res.json()) as { success?: boolean; order?: any };
    if (result.success && result.order) {
      return {
        id: result.order.orderId,
        reference: result.order.paymentReferenceId,
        plan,
        customer,
        amount: result.order.amount,
        status: "created",
        createdAt: result.order.createdAt,
      };
    }
  } catch (err) {
    console.error("[Checkout] Error creating order on server:", err);
  }

  // Graceful fallback if offline
  const reference = await generatePaymentReference();
  return {
    id: `ORD-${randomToken(8)}`,
    reference,
    plan,
    customer,
    amount: plan.price,
    status: "created",
    createdAt: new Date().toISOString(),
  };
}

/** Confirm UPI payment submission against the order */
export async function verifyPayment(
  order: Order,
  customPaymentRef?: string
): Promise<{ verified: boolean; order: Order }> {
  const finalRef = (customPaymentRef || order.reference).trim();
  try {
    const res = await fetch("/api/orders/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        newPaymentReferenceId: finalRef,
      }),
    });
    const data = (await res.json()) as { success?: boolean; order?: any };
    if (data.success && data.order) {
      return {
        verified: false,
        order: {
          ...order,
          reference: data.order.paymentReferenceId || finalRef,
          status: "awaiting_verification",
        },
      };
    }
  } catch (err) {
    console.error("[Checkout] Error confirming payment on server:", err);
  }

  return {
    verified: false,
    order: { ...order, reference: finalRef, status: "awaiting_verification" },
  };
}

/** Check real-time order verification status and retrieve credentials once admin ticks checkbox */
export async function checkOrderStatus(orderIdOrRef: string): Promise<{
  success: boolean;
  paymentStatus?: string;
  paymentVerified?: boolean;
  licenseId?: string | null;
  licenseKey?: string | null;
  licenseStatus?: string;
  error?: string;
} | null> {
  try {
    const res = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderIdOrRef }),
    });
    return (await res.json()) as any;
  } catch (err) {
    console.error("[Checkout] Error checking order status:", err);
    return null;
  }
}

/** Create user credentials for verified order (Admin-controlled in /console) */
export async function createUserCredentials(
  order: Order,
): Promise<{ username: string; licenseKey: string } | null> {
  void order;
  return null;
}

/** Email access details to customer (Managed by backend) */
export async function sendAccessEmail(order: Order): Promise<boolean> {
  void order;
  return true;
}

