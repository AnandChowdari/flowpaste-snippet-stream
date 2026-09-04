/**
 * FlowPaste mock service layer.
 *
 * Every function below is a placeholder for a future Google Apps Script
 * endpoint. They currently resolve with local mock data only — no network
 * calls, no persistence. Swap the bodies for `fetch(APPS_SCRIPT_URL, ...)`
 * later without changing any UI code.
 */

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

/** TODO(apps-script): POST customer details to the sheet. */
export async function submitCustomerDetails(customer: Customer): Promise<Customer> {
  await delay(500);
  return customer;
}

/** TODO(apps-script): generate a unique payment reference server-side. */
export async function generatePaymentReference(): Promise<string> {
  await delay(120);
  return `FP-${new Date().getFullYear()}-${randomToken(6)}`;
}

/** TODO(apps-script): create the order row and return its ID. */
export async function createOrder(customer: Customer, plan: Plan): Promise<Order> {
  await submitCustomerDetails(customer);
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

/** TODO(apps-script): confirm the UPI payment against the reference. */
export async function verifyPayment(order: Order): Promise<{ verified: boolean; order: Order }> {
  await delay(900);
  return { verified: false, order: { ...order, status: "awaiting_verification" } };
}

/** TODO(apps-script): create the licence/credentials for a verified order. */
export async function createUserCredentials(
  order: Order,
): Promise<{ username: string; licenseKey: string } | null> {
  await delay(200);
  void order;
  return null;
}

/** TODO(apps-script): email access details to the customer. */
export async function sendAccessEmail(order: Order): Promise<boolean> {
  await delay(200);
  void order;
  return false;
}
