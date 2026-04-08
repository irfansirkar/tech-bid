import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    const docPath = "C:\\Users\\sirka\\.gemini\\antigravity\\brain\\73cb1fc2-45d1-49fb-8863-bebd59dda584\\.system_generated\\steps\\227\\content.md";
    const docContent = fs.readFileSync(docPath, 'utf8');

    const { data: questions, error } = await supabase.from('questions').select('id, content, correct_answer');
    if (error) throw error;

    let results = {
      updated: [],
      alreadyCorrect: 0,
      noMatch: []
    };

    for (let q of questions) {
      // Extract only the question wording (before " A)")
      let qText = q.content;
      const optionIndex = qText.indexOf('A)');
      if (optionIndex !== -1) {
        qText = qText.substring(0, optionIndex);
      } else {
        const qMark = qText.indexOf('?');
        if (qMark !== -1) qText = qText.substring(0, qMark + 1);
      }
      
      // Clean up brackets, newlines, and limit size to ensure flexible matching
      qText = qText.replace(/\[Smart Strike\]/g, '')
                   .replace(/[\n\r\t]/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
                   
      if (qText.length > 60) qText = qText.slice(0, 60);

      const regexPattern = qText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      
      // Look forward max 1500 chars to find Correct Answer
      const matchRegex = new RegExp(regexPattern + '.{0,1500}?Correct Answer:\\s*([A-D])', 'si');
      
      const match = docContent.match(matchRegex);

      if (match) {
        const docAnswer = match[1].toUpperCase();
        if (q.correct_answer === docAnswer) {
          results.alreadyCorrect++;
        } else {
          results.updated.push({
            id: q.id,
            question: qText,
            old: q.correct_answer,
            new: docAnswer
          });
          // Perform the update
          await supabase.from('questions').update({ correct_answer: docAnswer }).eq('id', q.id);
        }
      } else {
        results.noMatch.push(qText);
      }
    }

    fs.writeFileSync('update_results.json', JSON.stringify(results, null, 2));
    console.log(`Finished processing. Updated: ${results.updated.length}, Already correct: ${results.alreadyCorrect}, No match: ${results.noMatch.length}`);
  } catch (err) {
    console.error('FATAL ERROR:', err);
  }
}

main();
