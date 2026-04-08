-- Enhance questions table with structured multiple choice options
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_a TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_b TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_c TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_d TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS category VARCHAR;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source VARCHAR;

-- Create a questions_archive table for backup
CREATE TABLE IF NOT EXISTS public.questions_archive AS SELECT * FROM public.questions WHERE false;

-- Create index for faster domain + active queries
CREATE INDEX IF NOT EXISTS idx_questions_domain_active ON public.questions(domain_id, is_active);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);

-- Create a view for easier question retrieval by domain
CREATE OR REPLACE VIEW public.domain_questions AS
SELECT 
  q.id,
  q.domain_id,
  d.name as domain_name,
  q.content,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d,
  q.correct_answer,
  q.difficulty,
  q.round_type,
  q.is_active,
  q.category,
  q.created_at
FROM public.questions q
LEFT JOIN public.domains d ON q.domain_id = d.id
ORDER BY d.name, q.difficulty, q.created_at;

-- Create a questions summary view
CREATE OR REPLACE VIEW public.questions_summary AS
SELECT 
  d.name as domain_name,
  COUNT(*) as total_questions,
  COUNT(CASE WHEN q.is_active THEN 1 END) as active_questions,
  COUNT(CASE WHEN q.difficulty = 'easy' THEN 1 END) as easy_count,
  COUNT(CASE WHEN q.difficulty = 'medium' THEN 1 END) as medium_count,
  COUNT(CASE WHEN q.difficulty = 'hard' THEN 1 END) as hard_count,
  COUNT(CASE WHEN q.round_type = 'bidding' THEN 1 END) as bidding_count,
  COUNT(CASE WHEN q.round_type = 'rapid_fire' THEN 1 END) as rapid_fire_count
FROM public.domains d
LEFT JOIN public.questions q ON d.id = q.domain_id
GROUP BY d.id, d.name
ORDER BY d.name;
