import express from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../dist");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const dbConfig = dbUrl
  ? {
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "imaz_homes",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    };

const db = mysql.createPool(dbConfig);

function makeId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function normalizePhone(phone) {
  const value = String(phone || "").replace(/\s|-/g, "");
  if (/^0\d{9}$/.test(value)) return `255${value.slice(1)}`;
  if (/^\+255\d{9}$/.test(value)) return value.slice(1);
  if (/^255\d{9}$/.test(value)) return value;
  return null;
}

function safeProvider(provider) {
  return [
    "M-Pesa",
    "Airtel Money",
    "Tigo Pesa",
    "Mixx by Yas",
    "T-Pesa",
    "HaloPesa",
    "Azam Pesa",
    "Card",
  ].includes(provider)
    ? provider
    : null;
}

async function getBooking(id) {
  const [rows] = await db.execute(
    `SELECT b.*, p.transaction_id, p.status AS payment_status, p.provider, p.method,
            p.phone AS payment_phone, p.amount AS payment_amount
       FROM bookings b
       LEFT JOIN payments p ON p.booking_id = b.id
      WHERE b.id = ?
      ORDER BY p.created_at DESC
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");
    res.json({
      ok: rows[0]?.ok === 1,
      service: "Imaz Homes booking API",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: "Imaz Homes booking API",
      database: "disconnected",
      message: error.message,
    });
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const {
      checkIn,
      checkOut,
      guests,
      name,
      email,
      phone,
      nights,
      nightlyRate,
      total,
    } = req.body;

    if (!checkIn || !checkOut || !name || !email || !phone) {
      return res
        .status(400)
        .json({ message: "Missing required booking details." });
    }
    if (
      !Number.isInteger(Number(guests)) ||
      Number(guests) < 1 ||
      Number(guests) > 4
    ) {
      return res
        .status(400)
        .json({ message: "Maximum occupancy is 4 guests." });
    }
    if (!Number.isInteger(Number(nights)) || Number(nights) < 1) {
      return res.status(400).json({ message: "Invalid stay dates." });
    }
    if (!Number.isFinite(Number(total)) || Number(total) <= 0) {
      return res.status(400).json({ message: "Invalid booking total." });
    }

    // CHECK IF THE DATES ARE ALREADY BOOKED
    const [existingBookings] = await db.execute(
      `SELECT id, check_in, check_out, status
   FROM bookings
   WHERE check_in < ?
   AND check_out > ?
   AND status NOT IN ('cancelled', 'payment-failed')
   LIMIT 1`,
      [checkOut, checkIn],
    );

    console.log("Checking dates:", checkIn, checkOut);
    console.log("Existing overlapping booking:", existingBookings);

    if (existingBookings.length > 0) {
      return res.status(409).json({
        message:
          "These dates are already booked. Please choose different dates.",
      });
    }

    const id = makeId("IMAZ");
    await db.execute(
      `INSERT INTO bookings
       (id, property_name, location, check_in, check_out, guests, customer_name,
        customer_email, customer_phone, nights, nightly_rate, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        "Imaz Homes",
        "Dar es Salaam, Tanzania",
        checkIn,
        checkOut,
        Number(guests),
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        Number(nights),
        Number(nightlyRate || 0),
        Number(total),
        "awaiting-payment",
      ],
    );

    const booking = await getBooking(id);
    res.status(201).json({ booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not save booking. Check your MySQL connection.",
    });
  }
});

app.post("/api/payments/initiate", async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      method = "mobile-money",
      provider,
      phone,
    } = req.body;
    const booking = await getBooking(bookingId);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount." });
    }

    if (numericAmount !== Number(booking.total)) {
      return res
        .status(400)
        .json({ message: "Payment amount does not match the booking total." });
    }

    const selectedProvider = safeProvider(provider || "M-Pesa");
    if (method === "mobile-money" && !selectedProvider) {
      return res
        .status(400)
        .json({ message: "Unsupported mobile-money provider." });
    }

    const normalizedPhone =
      method === "mobile-money" ? normalizePhone(phone) : null;
    if (method === "mobile-money" && !normalizedPhone) {
      return res.status(400).json({
        message: "Enter a valid Tanzanian mobile number, e.g. 0712345678.",
      });
    }

    const transactionId = makeId("PAY");
    await db.execute(
      `INSERT INTO payments
       (transaction_id, booking_id, amount, method, provider, phone, status, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        bookingId,
        numericAmount,
        method,
        method === "mobile-money" ? selectedProvider : "Card",
        normalizedPhone,
        "pending",
        JSON.stringify({ mode: "gateway-not-configured" }),
      ],
    );

    await db.execute(
      "UPDATE bookings SET status = 'payment-pending' WHERE id = ?",
      [bookingId],
    );

    const liveConfigured = Boolean(
      process.env.PAYMENT_GATEWAY_URL && process.env.PAYMENT_API_KEY,
    );

    // The provider-specific request belongs here after merchant onboarding.
    // We intentionally do not invent live credentials or pretend this local demo has charged money.
    if (!liveConfigured) {
      return res.json({
        transactionId,
        status: "pending",
        live: false,
        message:
          "Payment record saved. Add your approved payment gateway credentials to .env to enable live collection.",
      });
    }

    const gatewayPayload = {
      reference: transactionId,
      bookingId,
      amount: numericAmount,
      currency: "TZS",
      provider: method === "mobile-money" ? selectedProvider : "CARD",
      phone: normalizedPhone,
      customer: { name: booking.customer_name, email: booking.customer_email },
    };

    const gatewayResponse = await fetch(process.env.PAYMENT_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
      },
      body: JSON.stringify(gatewayPayload),
    });

    const raw = await gatewayResponse.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    await db.execute(
      "UPDATE payments SET raw_response = ?, status = ? WHERE transaction_id = ?",
      [
        JSON.stringify(data),
        gatewayResponse.ok ? "pending" : "failed",
        transactionId,
      ],
    );

    if (!gatewayResponse.ok) {
      return res.status(502).json({
        message: "Payment gateway rejected the request.",
        transactionId,
      });
    }

    res.json({ transactionId, status: "pending", live: true, gateway: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not start payment." });
  }
});

app.post("/api/payments/webhook", async (req, res) => {
  try {
    const { bookingId, transactionId, status } = req.body;
    if (!bookingId || !transactionId)
      return res.status(400).json({ message: "Missing payment reference." });

    const normalizedStatus = String(status || "").toLowerCase();
    const paid = ["paid", "success", "successful", "completed"].includes(
      normalizedStatus,
    );
    const failed = ["failed", "cancelled", "canceled", "rejected"].includes(
      normalizedStatus,
    );
    const nextStatus = paid ? "paid" : failed ? "failed" : "pending";

    await db.execute(
      "UPDATE payments SET status = ?, raw_response = ? WHERE transaction_id = ? AND booking_id = ?",
      [nextStatus, JSON.stringify(req.body), transactionId, bookingId],
    );

    if (paid)
      await db.execute(
        "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
        [bookingId],
      );
    if (failed)
      await db.execute(
        "UPDATE bookings SET status = 'payment-failed' WHERE id = ?",
        [bookingId],
      );

    res.json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Webhook processing failed." });
  }
});

app.get("/api/bookings/:id", async (req, res) => {
  try {
    const booking = await getBooking(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });
    res.json({ booking });
  } catch (error) {
    res.status(500).json({ message: "Could not load booking." });
  }
});

async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(40) PRIMARY KEY,
        property_name VARCHAR(120) NOT NULL,
        location VARCHAR(180) NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        guests TINYINT UNSIGNED NOT NULL,
        customer_name VARCHAR(160) NOT NULL,
        customer_email VARCHAR(190) NOT NULL,
        customer_phone VARCHAR(30) NOT NULL,
        nights INT UNSIGNED NOT NULL,
        nightly_rate DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        status ENUM('awaiting-payment','payment-pending','confirmed','payment-failed','cancelled') NOT NULL DEFAULT 'awaiting-payment',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_dates (check_in, check_out),
        INDEX idx_customer_email (customer_email)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(80) NOT NULL UNIQUE,
        booking_id VARCHAR(40) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'TZS',
        method VARCHAR(40) NOT NULL,
        provider VARCHAR(60) NOT NULL,
        phone VARCHAR(30) NULL,
        status ENUM('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
        raw_response JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        INDEX idx_payment_booking (booking_id),
        INDEX idx_payment_status (status)
      )
    `);
    console.log("Database schema verified/ready.");
  } catch (error) {
    console.warn("Database initialization notice:", error.message);
  }
}

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, async () => {
  console.log(`Imaz Homes API running at http://localhost:${PORT}`);
  await initDb();
});
