# Imaz Homes — React Booking + Payment Flow

This is a Vite + React website for Imaz Homes using the real property photos supplied for the project.

## Included

- Responsive Imaz Homes landing page
- Hero section
- Apartment information
- Amenities
- Gallery/lightbox
- Location and review sections
- Booking modal
- Date validation
- Guest validation (maximum 4)
- Guest contact details
- Price calculation
- Mobile-money payment selection
- Card payment placeholder
- Express booking API
- Payment initiation endpoint
- Payment webhook endpoint scaffold

## 1. Install

Open this folder in VS Code, then run:

```bash
npm install
```

## 2. Start everything

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

The React frontend runs on port 5173 and the Express API runs on port 5000.

## 3. Important: live payments

The included payment endpoint is intentionally a **test/demo payment flow**. It creates a pending transaction so you can test the complete website without exposing payment credentials.

Before taking real money, connect a real licensed payment provider in:

```text
server/server.js
```

Use the provider's current official API documentation for authentication, payment initiation, callbacks/webhooks and signature verification.

Never put secret payment API keys in React/Vite frontend code.

## Booking flow

1. Visitor clicks **Book Now**
2. Selects check-in, check-out and guests
3. Enters name, email and phone
4. Chooses Mobile Money or Card
5. Booking is created by `POST /api/bookings`
6. Payment is initiated by `POST /api/payments/initiate`
7. Provider callback can confirm the booking through `POST /api/payments/webhook`

## Production recommendations

For production, replace the in-memory `Map()` database with MySQL/PostgreSQL, add authentication for the admin side, verify payment webhooks, prevent double-booking with database transactions, validate all server inputs, and send confirmation emails/SMS after a successful payment.
