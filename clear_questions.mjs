import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching all questions...");
  let allIds = [];
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase.from('questions').select('id').limit(500);
    if (data && data.length > 0) {
      allIds = allIds.concat(data.map(q => q.id));
      
      const ids = data.map(q => q.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error } = await supabase.from('questions').delete().in('id', chunk);
        if (error) {
          console.error("Delete error:", error);
        } else {
          console.log(`Deleted chunk of ${chunk.length} questions...`);
        }
      }
    } else {
      hasMore = false;
    }
  }
  console.log(`Done. Total deleted: ${allIds.length}`);
}

main();
