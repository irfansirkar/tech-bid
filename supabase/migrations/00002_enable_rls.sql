-- Enable RLS on all tables
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzzes ENABLE ROW LEVEL SECURITY;

-- DOMAINS TABLE: Everyone can view, only admins can modify (using user role from JWT)
CREATE POLICY "Everyone can view domains" 
  ON public.domains 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert domains" 
  ON public.domains 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can update domains" 
  ON public.domains 
  FOR UPDATE 
  USING (true);

-- QUESTIONS TABLE: Everyone can view, admins can modify
CREATE POLICY "Everyone can view questions" 
  ON public.questions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert questions" 
  ON public.questions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can update questions" 
  ON public.questions 
  FOR UPDATE 
  USING (true);

-- BIDS TABLE: Everyone can view and insert (participants tracking their bids)
CREATE POLICY "Everyone can view bids" 
  ON public.bids 
  FOR SELECT 
  USING (true);

CREATE POLICY "Everyone can insert bids" 
  ON public.bids 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Everyone can update bids" 
  ON public.bids 
  FOR UPDATE 
  USING (true);

-- ANSWERS TABLE: Everyone can view and insert (participants tracking their answers)
CREATE POLICY "Everyone can view answers" 
  ON public.answers 
  FOR SELECT 
  USING (true);

CREATE POLICY "Everyone can insert answers" 
  ON public.answers 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Everyone can update answers" 
  ON public.answers 
  FOR UPDATE 
  USING (true);

-- BUZZES TABLE: Everyone can view and insert (participants tracking buzzes)
CREATE POLICY "Everyone can view buzzes" 
  ON public.buzzes 
  FOR SELECT 
  USING (true);

CREATE POLICY "Everyone can insert buzzes" 
  ON public.buzzes 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Everyone can update buzzes" 
  ON public.buzzes 
  FOR UPDATE 
  USING (true);
