import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN_MAP = {
  'AIML': 'AI/ML',
  'Agentic AI': 'Agentic AI',
  'Cloud Computing': 'Cloud Computing',
  'DevOps': 'DevOps',
  'Machine Learning Operations': 'MLOps',
  'Data Science': 'Data Science',
  'IoT': 'IoT',
  'Blockchain': 'Blockchain',
  'Cybersecurity': 'Cybersecurity',
  'Quantum Computing': 'Quantum Computing'
};

const rawText = fs.readFileSync('C:\\Users\\sirka\\.gemini\\antigravity\\brain\\c17acf73-6918-459b-8bd9-b786966dcbe0\\.system_generated\\steps\\110\\content.md', 'utf8');

const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

let currentDomain = null;
let currentDifficulty = 'easy';
let currentQuestion = null;
let currentOptions = [];
let correctAnswer = null;

const questions = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // check for domain headers
  for (const [key, val] of Object.entries(DOMAIN_MAP)) {
    if (line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase() === key.toLowerCase()) {
      currentDomain = val;
      currentDifficulty = 'easy'; // reset difficulty on new domain
      break;
    }
  }

  if (line.toLowerCase().includes('medium difficulty')) {
    currentDifficulty = 'medium';
    continue;
  }
  if (line.toLowerCase().includes('hard difficulty')) {
    currentDifficulty = 'hard';
    continue;
  }

  // match finding a question: starts with number dot space
  const qMatch = line.match(/^(\d+)\.\s+(\d+\.\s+)?(.*)/);
  if (qMatch) {
    // save previous question if exists
    if (currentQuestion && currentOptions.length > 0) {
       questions.push({
         domain: currentDomain,
         difficulty: currentDifficulty,
         content: currentQuestion + '\n' + currentOptions.join('\n'),
         correct_answer: correctAnswer || 'A',
         round_type: currentDifficulty === 'easy' ? 'rapid_fire' : 'bidding'
       });
    }

    currentQuestion = qMatch[3];
    currentOptions = [];
    correctAnswer = null;
    continue;
  }

  // match option: e.g. "* A) text" or "A. text"
  const optMatch = line.match(/^[\*\s]*([A-D])[\)\.]?\s+(.*)/);
  if (optMatch && currentQuestion) {
     let optLetter = optMatch[1];
     let optTextRaw = optMatch[2];
     
     // Remove asterisks from text if any
     if (optTextRaw.endsWith('*')) {
       optTextRaw = optTextRaw.substring(0, optTextRaw.length - 1).trim();
       correctAnswer = optLetter;
     } else if (line.trim().endsWith('*') || line.includes('*')) {
       // Just in case it's on the line but not captured properly
       correctAnswer = optLetter;
       optTextRaw = optTextRaw.replace('*', '').trim();
     }

     let optText = `${optLetter}) ${optTextRaw}`;
     currentOptions.push(optText);
  }
}

// flush last question
if (currentQuestion && currentOptions.length > 0) {
  questions.push({
    domain: currentDomain,
    difficulty: currentDifficulty,
    content: currentQuestion + '\n' + currentOptions.join('\n'),
    correct_answer: correctAnswer || 'A',
    round_type: currentDifficulty === 'easy' ? 'rapid_fire' : 'bidding'
  });
}

console.log(`Parsed ${questions.length} questions.`);

async function seed() {
  const { data: domains, error: dErr } = await supabase.from('domains').select('*');
  if (dErr) {
    console.error("Fetch domains error:", dErr);
    return;
  }

  // Clear existing questions
  console.log('Removing old questions from the database...');
  await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const domainNameToId = {};
  domains.forEach(d => domainNameToId[d.name] = d.id);

  let successCount = 0;
  for (const q of questions) {
    if (!q.domain) q.domain = 'AI/ML'; // fallback if parser missed header
    const dId = domainNameToId[q.domain];
    
    if (!dId) {
       console.log(`Missing domain in DB: ${q.domain}`);
       continue;
    }

    const { error } = await supabase.from('questions').insert({
      domain_id: dId,
      round_type: q.round_type,
      difficulty: q.difficulty,
      content: q.content,
      correct_answer: q.correct_answer,
      is_active: false
    });

    if (error) {
       console.error("Insert error:", error);
    } else {
       successCount++;
    }
  }

  console.log(`Successfully seeded ${successCount} questions into Supabase!`);
}

seed();
