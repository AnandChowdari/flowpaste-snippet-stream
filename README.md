# FlowPaste Landing Page

Build a polished, modern, mobile-responsive landing page and purchase flow for a lightweight browser productivity extension called FlowPaste.

Product positioning

FlowPaste is a browser productivity utility designed to make repetitive text-entry workflows faster and easier.

Position it around:

Faster text workflows

Personal productivity

Reusable text snippets

Streamlined repetitive input

Better workflow efficiency

Do NOT make the website about bypassing restrictions, cheating, scraping, or circumventing website controls.

Brand

Name: FlowPaste

Tagline:
Make repetitive text workflows effortless.

Short description:
“FlowPaste helps you manage and reuse frequently entered text so you can spend less time repeating the same work.”

Visual style:

Premium SaaS/productivity startup aesthetic

Clean, minimal interface

Modern typography

Subtle gradients

Rounded cards

Soft shadows

Professional rather than flashy

White/light background with a dark navy/indigo accent

Excellent spacing

Smooth but subtle animations

Must look trustworthy enough for a paid product

Use a simple abstract browser/productivity icon instead of a complicated logo.

Landing page structure

1. Hero section

Large headline:

Stop repeating the same text.

Supporting text:

“FlowPaste makes repetitive text workflows faster with reusable snippets and a streamlined browser experience.”

Primary CTA:
Get FlowPaste

Secondary CTA:
See how it works

Add a tasteful browser-extension mockup on the right showing:

Saved snippets

Quick insert buttons

Search

Recently used text

Clean extension UI

The mockup should be illustrative only, not an actual functioning extension.

2. Problem / solution section

Headline:

Small repetitive tasks add up.

Show 3 cards:

Repeat Less
Reuse frequently entered text instead of typing it again.

Work Faster
Keep useful snippets organized and accessible.

Stay Organized
Find the text you need without digging through notes or documents.

3. Features

Create a clean 2-column feature grid:

Reusable text snippets

Quick-access extension interface

Search your saved snippets

Recently used items

Lightweight and fast

Simple setup

Works directly in the browser

Privacy-focused local workflow

Keep the copy concise.

4. How it works

Three steps:

1. Enter your details
Create your FlowPaste account using your name and email.

2. Complete your purchase
Choose a plan and scan the displayed QR code to make payment.

3. Get access
After payment confirmation, your account/access credentials will be generated.

For this first version, payment verification does NOT need to be implemented. Build the UI and interaction flow so it can be connected to Google Apps Script later.

5. Pricing

Use a simple pricing section with 2 plans.

Starter
₹99

FlowPaste extension

Core text workflow features

Basic snippet management

One-time purchase

CTA:
Get Starter

Pro
₹199

Everything in Starter

Advanced snippet organization

Faster workflow tools

Priority updates

One-time purchase

CTA:
Get Pro

Make Pro visually highlighted as the recommended option.

Do not implement real payment processing yet.

6. Purchase flow

When the user clicks a pricing CTA, open a clean purchase form/page.

Heading:

Get FlowPaste

Fields:

Full Name

Email Address

Plan selection should show the selected plan and price.

Button:
Continue to Payment

Validate:

Name required

Valid email required

After submission, show a payment screen.

7. QR payment screen

Create a polished payment card.

Heading:

Complete your payment

Show:

Selected plan

Amount

Large QR-code placeholder

“Scan with your preferred UPI app”

Payment instructions

Payment reference/order ID placeholder

Include a button:

I’ve Completed Payment

Since the real payment system will be connected later, clicking this should currently show a confirmation state rather than actually verify payment.

Example confirmation:

Payment submitted

“Your payment details have been submitted. Once payment is verified, your FlowPaste access credentials will be sent to your email.”

Add a small note:

“Never share your payment PIN or OTP.”

8. Success screen

Create a polished success state:

You’re all set.

“Thanks for choosing FlowPaste. Your access details will appear here once payment verification is connected.”

Show:

Customer name

Email

Selected plan

Order/reference ID

Access status: Pending verification

Button:
Back to Home

Future backend readiness

Structure the frontend so it can later connect to Google Apps Script.

Create clear placeholder functions/services for:

submitCustomerDetails()

createOrder()

generatePaymentReference()

verifyPayment()

createUserCredentials()

sendAccessEmail()

Do NOT actually implement these backend integrations yet.

For now, use mock/local state.

The eventual flow will be:

Name + Email
→ Create order
→ Display QR
→ User pays
→ Payment verification
→ Google Apps Script creates credentials
→ Email credentials to customer

Important UX requirements

Fully responsive on mobile, tablet, and desktop.

Mobile purchase flow should be especially polished.

Pricing cards should stack cleanly on mobile.

QR code should remain large enough to scan on mobile.

Use clear loading states.

Use toast notifications for validation/errors.

Prevent duplicate submission.

Use accessible labels and keyboard navigation.

Keep animations subtle and fast.

No unnecessary pages.

No login/dashboard for this version.

Keep the implementation lightweight.

Technical requirements

Use the standard Lovable stack.

Prefer:

React

TypeScript

Tailwind CSS

shadcn/ui where useful

Keep components modular:

Navbar

Hero

FeatureGrid

Pricing

PurchaseForm

PaymentScreen

SuccessScreen

Footer

Use mock data for plans and orders so the backend can be replaced later without redesigning the UI.

Navbar

Logo:
FlowPaste

Links:

Features

How it works

Pricing

CTA:
Get FlowPaste

On mobile use a clean hamburger menu.

Footer

FlowPaste

“Simple tools for faster digital workflows.”

Links:

Privacy

Terms

Contact

Final quality bar

The website should feel like a real small SaaS product, not a student project.

Prioritize:

Fast loading

Clean responsive design

Extremely simple purchase flow

Strong visual hierarchy

Clear pricing

QR-payment-ready architecture

Easy future Google Apps Script integration

Do not over-engineer the application. Build the complete frontend in one pass with mock payment/order functionality and make every major interaction work.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0cb73ab5-83e0-4020-80c1-3dbb7bbc6b6d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
