-- Create buzzer_entries table to track who clicks first for each domain
CREATE TABLE IF NOT EXISTS public.buzzer_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    user_name VARCHAR NOT NULL,
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_buzzer_entries_domain ON public.buzzer_entries(domain_id);
CREATE INDEX IF NOT EXISTS idx_buzzer_entries_user ON public.buzzer_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_buzzer_entries_timestamp ON public.buzzer_entries(timestamp);

-- Create a view to show first buzzer for each domain
CREATE OR REPLACE VIEW public.domain_buzzer_winners AS
SELECT DISTINCT ON (be.domain_id)
    be.domain_id,
    d.name as domain_name,
    be.user_id,
    be.user_name,
    be.timestamp as buzzed_at
FROM public.buzzer_entries be
LEFT JOIN public.domains d ON be.domain_id = d.id
ORDER BY be.domain_id, be.timestamp ASC;
