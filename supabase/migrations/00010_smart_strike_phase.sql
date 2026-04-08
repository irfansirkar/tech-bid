-- Add smart_strike phase to domain_status enum
ALTER TYPE domain_status ADD VALUE IF NOT EXISTS 'smart_strike';
