-- Add updated_at column to domains table
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Also ensure any existing domains have an updated_at value
UPDATE public.domains SET updated_at = NOW() WHERE updated_at IS NULL;
