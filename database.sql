CREATE DATABASE IF NOT EXISTS imaz_homes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE imaz_homes;

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
);

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
);
