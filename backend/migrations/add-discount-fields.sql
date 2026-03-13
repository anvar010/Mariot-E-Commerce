-- Add discount fields to products table
-- Run this in your MySQL database

USE mariot_b2b;

ALTER TABLE products 
ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER price,
ADD COLUMN offer_price DECIMAL(10,2) DEFAULT NULL AFTER discount_percentage;

-- Verify the changes
DESCRIBE products;
