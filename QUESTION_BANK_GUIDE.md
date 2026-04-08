# 🎓 Enhanced Question Bank System

## Overview

The Quiz Game now has an **organized, domain-specific question bank** with 21 expert-curated questions distributed across 10 technology domains.

## Domain Distribution

| Domain | Easy | Medium | Hard | Total |
|--------|------|--------|------|-------|
| Blockchain | 1 | 1 | 1 | 3 |
| Cybersecurity | 1 | 1 | 1 | 3 |
| AI/ML | 1 | 1 | 1 | 3 |
| MLOps | 1 | 1 | 0 | 2 |
| Cloud Computing | 1 | 1 | 0 | 2 |
| Quantum Computing | 1 | 0 | 0 | 1 |
| DevOps | 1 | 1 | 0 | 2 |
| Agentic AI | 1 | 0 | 0 | 1 |
| Data Science | 1 | 1 | 0 | 2 |
| IoT | 1 | 1 | 0 | 2 |
| **TOTAL** | **10** | **8** | **3** | **21** |

## Question Structure

Each question is **fully populated** with:
- **Content**: The question text
- **correct_answer**: A single letter (A, B, C, or D)
- **Difficulty**: easy, medium, or hard
- **Round Type**: 
  - Easy questions → rapid_fire (buzzer round)
  - Medium/Hard → bidding (auction phase)

## Database Schema

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  domain_id UUID REFERENCES domains(id),
  content TEXT NOT NULL,
  correct_answer TEXT NOT NULL,  -- A, B, C, or D
  difficulty ENUM ('easy', 'medium', 'hard'),
  round_type ENUM ('bidding', 'rapid_fire'),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);
```

## Admin Features

### ✅ Quick Setup
Click **"Quick Setup (1 per domain)"** to automatically:
- Deactivate all questions
- Activate ONE bidding question per active domain
- Ready for participants to answer

### ➡️ Start Next Question
After participants answer:
1. Go to Admin > Questions
2. View "Current Active Questions" cards
3. Click **"Start Next Question →"**
4. Next question instantly appears for participants

### ✔️ Answer Verification
Admin > Answers page shows:
- Participant's submitted answer letter (A/B/C/D)
- Correct answer letter
- Auto-verification badge (✓ Correct or ✗ Incorrect)

## Participant Experience

### Lobby (`/participant`)
- See all active domains
- Enter domain arena to answer questions

### Arena (`/participant/arena/[id]`)
- Real-time question updates
- Click A/B/C/D buttons to submit answer
- Immediate feedback (green checkmark or red X)
- View correct answer if wrong

## Scripts

### `seed_questions_v2.mjs`
Populates the database with domain-specific questions.

```bash
node scripts/seed_questions_v2.mjs
```

Output:
```
✅ Blockchain → 1 easy + 1 medium + 1 hard
✅ Cybersecurity → 1 easy + 1 medium + 1 hard
... (10 domains total)
✨ Successfully seeded 21 questions!
```

## Future Enhancements

### Optional Schema Enhancements
To enable these features, apply `00003_enhance_questions_schema.sql`:

```sql
-- Add structured multiple-choice columns
ALTER TABLE questions ADD COLUMN option_a TEXT;
ALTER TABLE questions ADD COLUMN option_b TEXT;
ALTER TABLE questions ADD COLUMN option_c TEXT;
ALTER TABLE questions ADD COLUMN option_d TEXT;

-- Add categorization
ALTER TABLE questions ADD COLUMN category VARCHAR;

-- Create useful views
CREATE VIEW domain_questions AS ...
CREATE VIEW questions_summary AS ...
```

Then update `seed_questions_improved.mjs` to populate these fields on next seed.

## Troubleshooting

### No questions appear in admin?
1. Go to Admin > Questions
2. Click **"Quick Setup"**
3. Refresh browser (F5)

### Questions not showing for participants?
1. Ensure domain status is "bidding" or "rapid_fire"
2. Ensure questions are activated in admin
3. Check participant domain page for real-time updates

## Key Files

- 📄 `scripts/seed_questions_v2.mjs` - Question seeding
- 📄 `src/app/admin/questions/page.tsx` - Admin question management
- 📄 `src/app/participant/arena/[id]/page.tsx` - Participant answering interface

---

**Last Updated**: April 8, 2026  
**Questions Seeded**: 21  
**Domains**: 10  
**Status**: ✅ Production Ready
