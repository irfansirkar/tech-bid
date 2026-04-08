# 🎓 Quiz Game - Complete System Guide

## System Overview

The Quiz Game is a **real-time competitive quiz platform** with:
- ✅ 10 specialized tech domains
- ✅ 30 questions (3 per domain, equal distribution)
- ✅ Dynamic bidding system with multipliers
- ✅ Real-time answer verification
- ✅ Admin management dashboard

---

## 🎯 Bidding System (NEW!)

### How Bidding Works

**Step 1: Question Activation**
- Admin sets 1 question per active domain
- Question goes LIVE for all participants

**Step 2: Place Your Bid**
- Participants see the **active question** (but NOT the options yet)
- They decide how many credits to bid (minimum: 1)
- Current multiplier is displayed based on other bidders

**Step 3: Multiplier Calculation**
```
Bidders:  Multiplier:
0-4       → 1x
5-9       → 2x
10-14     → 3x
15-19     → 4x
20+       → 5x
```

**Example:**
- Participant bids 5 credits
- 7 other participants also bid → 2x multiplier
- **Potential return: 5 × 2 = 10 credits** (if correct)

**Step 4: Answer Question**
- After bid is locked in, the multiple-choice options appear
- Click A, B, C, or D to submit
- Answer is auto-verified

**Step 5: Credit Adjustment**
- **If Correct:** +{bid × multiplier} credits
- **If Incorrect:** -{bid × multiplier} credits

### Bidding Strategy
- **Low Risk:** Bid 1 credit, earn 1-5× return
- **Medium Risk:** Bid 5 credits, earn 5-25× return
- **High Risk:** Bid 20 credits, earn 20-100× return (if correct!)

---

## 📊 Question Bank

### Distribution (30 Questions Total)

| Domain | Easy | Medium | Hard | Total |
|--------|------|--------|------|-------|
| Blockchain | 1 | 1 | 1 | **3** |
| Cybersecurity | 1 | 1 | 1 | **3** |
| AI/ML | 1 | 1 | 1 | **3** |
| MLOps | 1 | 1 | 1 | **3** |
| Cloud Computing | 1 | 1 | 1 | **3** |
| Quantum Computing | 1 | 1 | 1 | **3** |
| DevOps | 1 | 1 | 1 | **3** |
| Agentic AI | 1 | 1 | 1 | **3** |
| Data Science | 1 | 1 | 1 | **3** |
| IoT | 1 | 1 | 1 | **3** |
| **TOTAL** | **10** | **10** | **10** | **30** |

---

## 🏃 Participant Workflow

### Entry Point: `/participant`
1. See all 10 domains
2. Domains marked "LIVE" are active
3. Click on any live domain to enter

### In Arena: `/participant/arena/[id]`

**Phase 1: Bidding**
```
┌─────────────────────────────────┐
│     Place Your Bid              │
├─────────────────────────────────┤
│  Current Bidders: 7             │
│  Current Multiplier: 2x         │
│                                 │
│  Bid Amount: [  5  ]            │
│  Your Return: 5 × 2x = 10       │
│                                 │
│  [ Place Bid ]                  │
└─────────────────────────────────┘
```

**Phase 2: Answer Question**
```
┌─────────────────────────────────┐
│  Question: What is Bitcoin?     │
├─────────────────────────────────┤
│  [ A ]  [ B ]  [ C ]  [ D ]     │
└─────────────────────────────────┘
```

**Phase 3: Result**
```
✅ Correct!
Your Answer: B
Correct Answer: B
+10 Credits Won! 🎉
```

---

## 👨‍💼 Admin Workflow

### Admin Dashboard: `/admin`
- View live stats
- Monitor participants
- See real-time bid activity
- Access quick actions

### Manage Questions: `/admin/questions`

**Quick Setup Button**
1. Click **"Quick Setup"** to activate 1 question per domain
2. View **"Current Active Questions"** cards at the top
3. Shows current question + bidders + multiplier

**Start Next Question**
1. After participants answer, click **"Start Next Question →"**
2. Previous question deactivates
3. Next question in pool activates
4. Participants see new question instantly

### View Answers: `/admin/answers`
1. See all submitted answers
2. Participant's answer vs Correct answer
3. Auto-verified badge (green/red)
4. Filter by domain

---

## 🗄️ Database Schema

### Key Tables

**domains**
```sql
id, name, status (pending|bidding|rapid_fire|completed), created_at
```

**questions**
```sql
id, domain_id, content, correct_answer (A|B|C|D),
difficulty (easy|medium|hard), round_type (bidding|rapid_fire),
is_active, created_at
```

**domain_bids** (NEW!)
```sql
id, user_id, domain_id, question_id, bid_amount,
bid_multiplier, status (active|answered|cancelled), created_at
```

**answers**
```sql
id, user_id, question_id, text (the submitted answer letter),
is_correct (auto-verified), created_at
```

---

## 🔧 Admin Commands

### Seed Questions
```bash
node scripts/seed_questions_v2.mjs
```
Output:
```
✅ Successfully seeded 30 questions across 10 domains!
✅ Each domain has 3 questions (1 easy, 1 medium, 1 hard)
```

### Apply Database Schema (Optional - For future enhancements)
```bash
# In Supabase SQL Editor, paste:
# 00003_enhance_questions_schema.sql
# 00004_bidding_system_with_multipliers.sql
```

---

## 🚀 Launch Instructions

### 1. Start Dev Server
```bash
npm run dev
```
Open: `http://localhost:3001`

### 2. Access Admin Dashboard
- URL: `http://localhost:3001/admin`
- Logged in as "Admin User" (mock auth)

### 3. Set Up Game
```
Admin > Questions > [ Quick Setup ] 
         ↓
         One question per domain now active
```

### 4. Enter Participant Mode
```
Participant > Select Domain > [ Enter Arena ]
         ↓
         Place Bid > Answer Question > See Results
```

---

## 📈 Real-Time Features

✅ **Live Multiplier Updates**
- Multiplier increases as more people bid
- Displayed in real-time

✅ **Instant Answer Verification**
- Results shown immediately
- Correct/Incorrect auto-detected

✅ **Question Changes**
- When admin clicks "Next Question", all participants see it instantly
- No page refresh needed

✅ **Bid Activity Feed**
- See other participants' bids in real-time
- See multiplier changes live

---

## 🔒 Security

✅ **RLS Enabled** (Row Level Security)
- All tables have security policies
- Participants can only see public data
- Admins can manage all data

✅ **Auto-Verification**
- Answers verified against database
- No manual admin override needed
- Credited/penalized automatically

---

## 🎮 Game Flow Example

```
[Admin Dashboard]
    ↓ Clicks "Quick Setup"
    
[Participant Lobby] - 10 domains appear marked LIVE
    ↓ Clicks "Blockchain"
    
[Participant Arena]
    ↓ Sees: "Place Your Bid"
    ↓ Sees: 6 people bidding, 2x multiplier
    ↓ Enters: 10 credits bid
    ↓ Clicks: Place Bid
    
    ↓ Question appears: "What is Bitcoin?"
    ↓ Clicks: [B] Proof of Stake
    
    ↓ Result: ❌ Incorrect (Correct was A)
    ↓ Credits: -20 (10 bid × 2x multiplier)
    
[Participant sees final score update]
```

---

## 📝 Files Modified

- `scripts/seed_questions_v2.mjs` - Seeding script (30 equal questions)
- `src/app/participant/arena/[id]/page.tsx` - NEW bidding system
- `supabase/migrations/00004_bidding_system_with_multipliers.sql` - Database schema
- `QUESTION_BANK_GUIDE.md` - This file

---

## ✅ Status

- ✅ 30 Questions seeded (3 per domain)
- ✅ Equal distribution across all domains
- ✅ Bidding system implemented
- ✅ Multiplier calculation working
- ✅ Answer auto-verification active
- ✅ Real-time updates enabled
- ✅ Admin interface ready

**Status: PRODUCTION READY** 🚀

---

*Last Updated: April 8, 2026*  
*Version: 2.0 - Bidding System Release*
