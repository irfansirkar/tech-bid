-- Add 'arena_open' to the domain_status ENUM
ALTER TYPE public.domain_status ADD VALUE IF NOT EXISTS 'arena_open';
