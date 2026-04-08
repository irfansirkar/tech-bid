-- Enhanced bidding system with multipliers
-- Track which participants have bid on each domain question
CREATE TABLE IF NOT EXISTS public.domain_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    bid_amount INT NOT NULL DEFAULT 1,
    bid_multiplier INT NOT NULL DEFAULT 1,
    status VARCHAR DEFAULT 'active', -- active, answered, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_domain_bids_domain_question ON public.domain_bids(domain_id, question_id);
CREATE INDEX IF NOT EXISTS idx_domain_bids_user_domain ON public.domain_bids(user_id, domain_id);

-- Function to calculate current multiplier based on bid count
CREATE OR REPLACE FUNCTION get_bid_multiplier(p_domain_id UUID, p_question_id UUID)
RETURNS INT AS $$
DECLARE
    bid_count INT;
BEGIN
    -- Count unique participants who have bid on this domain question
    SELECT COUNT(DISTINCT user_id)
    INTO bid_count
    FROM public.domain_bids
    WHERE domain_id = p_domain_id 
    AND question_id = p_question_id
    AND status = 'active';
    
    -- Multiplier logic:
    -- 0-4 participants: 1x
    -- 5-9 participants: 2x
    -- 10-14 participants: 3x
    -- etc.
    IF bid_count < 5 THEN
        RETURN 1;
    ELSIF bid_count < 10 THEN
        RETURN 2;
    ELSIF bid_count < 15 THEN
        RETURN 3;
    ELSIF bid_count < 20 THEN
        RETURN 4;
    ELSE
        RETURN 5; -- Max multiplier
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get bid count for a domain question
CREATE OR REPLACE FUNCTION get_bid_count(p_domain_id UUID, p_question_id UUID)
RETURNS INT AS $$
DECLARE
    count INT;
BEGIN
    SELECT COUNT(DISTINCT user_id)
    INTO count
    FROM public.domain_bids
    WHERE domain_id = p_domain_id 
    AND question_id = p_question_id
    AND status = 'active';
    
    RETURN count;
END;
$$ LANGUAGE plpgsql;

-- View to track bidding summary per domain question
CREATE OR REPLACE VIEW public.domain_bid_summary AS
SELECT 
    db.domain_id,
    d.name as domain_name,
    db.question_id,
    q.content as question_content,
    COUNT(DISTINCT db.user_id) as total_bidders,
    get_bid_multiplier(db.domain_id, db.question_id) as current_multiplier,
    ROUND(AVG(db.bid_amount)::numeric, 2) as avg_bid,
    MIN(db.bid_amount) as min_bid,
    MAX(db.bid_amount) as max_bid,
    SUM(db.bid_amount) as total_credits_bid
FROM public.domain_bids db
LEFT JOIN public.domains d ON db.domain_id = d.id
LEFT JOIN public.questions q ON db.question_id = q.id
WHERE db.status = 'active'
GROUP BY db.domain_id, d.name, db.question_id, q.content;

-- Trigger to update domain_bids status when question becomes inactive
CREATE OR REPLACE FUNCTION cancel_domain_bids_on_question_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = false AND OLD.is_active = true THEN
        -- Question deactivated, cancel all active bids
        UPDATE public.domain_bids
        SET status = 'cancelled'
        WHERE question_id = NEW.id AND status = 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cancel_bids_on_question_change ON public.questions;
CREATE TRIGGER trigger_cancel_bids_on_question_change
AFTER UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION cancel_domain_bids_on_question_change();
