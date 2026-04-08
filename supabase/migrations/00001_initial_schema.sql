-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'participant');
CREATE TYPE domain_status AS ENUM ('pending', 'bidding', 'rapid_fire', 'completed');
CREATE TYPE round_type AS ENUM ('bidding', 'rapid_fire');
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');

-- 2. USERS (Synced via Clerk)
CREATE TABLE public.users (
    id VARCHAR PRIMARY KEY, -- Clerk User ID
    email VARCHAR NOT NULL,
    role user_role DEFAULT 'participant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. DOMAINS
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    status domain_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PARTICIPANT DOMAIN STATS & CREDITS
CREATE TABLE public.participant_stats (
    user_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
    credits INT DEFAULT 50,
    bidding_score INT DEFAULT 0,
    rapid_fire_score INT DEFAULT 0,
    PRIMARY KEY (user_id, domain_id)
);

-- 5. QUESTIONS
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
    round_type round_type NOT NULL,
    difficulty question_difficulty NOT NULL,
    content TEXT NOT NULL,
    correct_answer TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. BIDS
CREATE TABLE public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ANSWERS
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    explanation TEXT,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. BUZZES
CREATE TABLE public.buzzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
    user_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REALTIME LOGIC
-- Enable Replication on specific tables for Realtime Bidding/Buzzing
ALTER PUBLICATION supabase_realtime ADD TABLE domains;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE buzzes;
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
