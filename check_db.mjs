import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuestions() {
  const { data, error } = await supabase.from('questions').select('id, domain_id, is_active').limit(5);
  fs.writeFileSync('output.json', JSON.stringify({data, error}, null, 2));
}

checkQuestions();
