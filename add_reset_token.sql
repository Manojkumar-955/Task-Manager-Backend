-- Add reset_token column to users table for forgot password functionality
ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL;