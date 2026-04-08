-- Add quick_add phase to domain_status enum
ALTER TYPE domain_status ADD VALUE IF NOT EXISTS 'quick_add' AFTER 'bidding';
