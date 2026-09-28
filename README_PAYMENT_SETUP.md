# IMAZ HOMES — Database & Payments Setup

## 1. Install packages
Open PowerShell in the project folder:

```powershell
npm install
```

## 2. Start XAMPP
Start **MySQL** in XAMPP. Apache is optional for this Node/Express app.

Open:

`http://localhost/phpmyadmin`

Import `database.sql` using **Import**, or open the SQL tab and run it.

This creates:

- `imaz_homes.bookings`
- `imaz_homes.payments`

Bookings and payment attempts now survive Node restarts.

## 3. Create your local environment file
Copy `.env.example` to `.env`.

For a normal XAMPP MySQL installation, leave:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=imaz_homes
```

If your MySQL root account has a password, put it in `DB_PASSWORD`.

## 4. Test the database
Run:

```powershell
npm run server
```

Then open:

`http://localhost:5000/api/health`

You should see `"database":"connected"`.

## 5. Run the full website
In another PowerShell window:

```powershell
npm run dev
```

The React site runs through Vite and the Express API runs on port 5000.

## 6. Live payments
The project deliberately does **not** fake a successful payment.

To collect real money, IMAZ HOMES needs a merchant/payment-provider account and production credentials. Put the provider's approved endpoint and credentials into `.env`:

```env
PAYMENT_GATEWAY_URL=...
PAYMENT_API_KEY=...
PAYMENT_SECRET=...
PAYMENT_WEBHOOK_SECRET=...
```

The backend accepts these customer-facing provider labels:

- M-Pesa
- Airtel Money
- Mixx by Yas
- T-Pesa
- HaloPesa
- Azam Pesa
- Card

A gateway such as Selcom can provide multi-channel merchant collection, including mobile-wallet and card channels. The exact production request, signature, callback and settlement configuration must follow the credentials/API contract issued to your merchant account.

## 7. Important security rule
Never put API secrets in React code, `VITE_*` variables, GitHub, screenshots, or chat messages.

## 8. Payment confirmation
The endpoint is:

`POST /api/payments/webhook`

Your approved gateway should call it after the transaction status changes. In production, add the provider's signature verification using the exact webhook signing rules supplied by that provider before trusting a `paid` status.
