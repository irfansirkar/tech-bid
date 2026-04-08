import fs from 'fs';

const DOMAIN_MAP = {
  'AIML': 'AI/ML',
  'AI/ML': 'AI/ML',
  'Agentic AI': 'Agentic AI',
  'Cloud Computing': 'Cloud Computing',
  'DevOps': 'DevOps',
  'Machine Learning Operations': 'MLOps',
  'MLOPS': 'MLOps',
  'Data Science': 'Data Science',
  'IoT': 'IoT',
  'Blockchain': 'Blockchain',
  'Cybersecurity': 'Cybersecurity',
  'Quantum Computing': 'Quantum Computing'
};

const rawText = fs.readFileSync('C:\\Users\\sirka\\.gemini\\antigravity\\brain\\c17acf73-6918-459b-8bd9-b786966dcbe0\\.system_generated\\steps\\110\\content.md', 'utf8');
const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

let currentDomain = 'AI/ML';
let currentDifficulty = 'easy';

const questions = [];

let qText = null;
let opts = [];
let correct = null;

function flush() {
  if (qText && opts.length > 0) {
     questions.push({
       domain: currentDomain,
       difficulty: currentDifficulty,
       content: qText + '\\n' + opts.join('\\n'),
       correct_answer: correct || 'A',
       round_type: currentDifficulty === 'easy' ? 'rapid_fire' : 'bidding'
     });
  }
  qText = null;
  opts = [];
  correct = null;
}

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  let dMatched = false;
  for (const [key, val] of Object.entries(DOMAIN_MAP)) {
    if (line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase() === key.toLowerCase()) {
      flush();
      currentDomain = val;
      currentDifficulty = 'easy';
      dMatched = true;
      break;
    }
  }
  if (dMatched) continue;

  if (line.toLowerCase().includes('medium difficulty') || line.includes('🟡 MEDIUM')) { flush(); currentDifficulty = 'medium'; continue; }
  if (line.toLowerCase().includes('hard difficulty') || line.includes('🔴 HARD')) { flush(); currentDifficulty = 'hard'; continue; }

  if (line.startsWith('____')) continue;
  
  const ansMatch = line.match(/^Answer:\s*([A-D])/i);
  if (ansMatch) {
     correct = ansMatch[1].toUpperCase();
     continue;
  }

  const qMatch = line.match(/^(\d+)\.\s*(.*)/);
  if (qMatch && !line.match(/^[A-D][\.\)]/)) {
     flush();
     let txt = qMatch[2].trim();
     if (txt.match(/^\d+\.\s*(.*)/)) {
        txt = txt.match(/^\d+\.\s*(.*)/)[1].trim(); 
     }
     if (txt.length === 0) {
        if (i + 1 < lines.length) {
           i++;
           txt = lines[i].trim();
        }
     }
     qText = txt.replace(/'/g, "''");
     continue;
  }

  const optMatch = line.match(/^[\*\s\-]*([A-D])[\)\.]\s*(.*)/);
  if (optMatch && qText) {
     let letter = optMatch[1].toUpperCase();
     let content = optMatch[2].trim();
     
     if (content.endsWith('*')) {
       content = content.slice(0, -1).trim();
       correct = letter;
     } else if (line.trim().endsWith('*') || line.includes('*')) {
       correct = letter;
       content = content.replace(/\*/g, '').trim();
     }
     content = content.replace(/'/g, "''");
     opts.push(`${letter}) ${content}`);
     continue;
  }
}
flush();

console.log(`Parsed ${questions.length} properly separated questions.`);

let sql = `-- Clear entirely existing questions
TRUNCATE TABLE public.questions CASCADE;

-- Insert all newly parsed questions
`;

for (const q of questions) {
  if (!q.domain) q.domain = 'AI/ML';
  sql += `INSERT INTO public.questions (domain_id, round_type, difficulty, content, correct_answer) VALUES ((SELECT id FROM public.domains WHERE name = '${q.domain}' LIMIT 1), '${q.round_type}', '${q.difficulty}', E'${q.content}', '${q.correct_answer}');\n`;
}

fs.writeFileSync('C:\\Users\\sirka\\Desktop\\QUIZGAME\\supabase\\migrations\\00008_seed_new_questions.sql', sql);
console.log(`Successfully generated SQL for ${questions.length} questions into 00008_seed_new_questions.sql`);
