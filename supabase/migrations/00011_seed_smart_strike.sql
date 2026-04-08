DO $$
DECLARE
    q RECORD;
BEGIN
    FOR q IN 
        SELECT content, correct_answer, domain_id, difficulty 
        FROM questions 
        WHERE round_type = 'bidding' 
        LIMIT 20
    LOOP
        INSERT INTO questions (content, correct_answer, domain_id, round_type, is_active, difficulty)
        VALUES (
            '[Smart Strike] ' || q.content, 
            q.correct_answer, 
            q.domain_id, 
            'smart_strike', 
            false,
            q.difficulty
        );
    END LOOP;
END $$;
