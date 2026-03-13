-- Migration: Add missing reward points and coupon fields to orders table
-- Run this in your MySQL database

USE mariot_b2b;

ALTER TABLE orders
ADD COLUMN points_used INT DEFAULT 0 AFTER payment_method,
ADD COLUMN points_discount DECIMAL(10, 2) DEFAULT 0.00 AFTER points_used,
ADD COLUMN coupon_id INT DEFAULT NULL AFTER points_discount,
ADD CONSTRAINT fk_order_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- Also verify discount_amount exists (it should be in schema.sql but good to be safe)
-- ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER vat_amount;

-- Verify changes
DESCRIBE orders;
