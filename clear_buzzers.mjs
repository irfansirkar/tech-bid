import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearBuzzers() {
  console.log('Clearing all buzzer_entries...');
  const { data, error } = await supabase.from('buzzer_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Error deleting buzzer entries:', error);
  } else {
    console.log('Successfully cleared all buzzer entries!');
  }
}

clearBuzzers();
