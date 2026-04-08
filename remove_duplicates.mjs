import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrbeytpyaostbpsaooxp.supabase.co';
const supabaseAnonKey = 'sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const result = await supabase
  .from('domains')
  .select('id, name, status')
  .order('name', { ascending: true });

const domains = result.data || [];

// Find duplicates to delete - keep first, delete rest
const seen = new Set();
const toDelete = [];

domains.forEach(domain => {
  if (seen.has(domain.name)) {
    toDelete.push(domain.id);
  } else {
    seen.add(domain.name);
  }
});

console.log(`Found ${toDelete.length} duplicate domain records to delete:`);
console.log(toDelete.join(', '));

if (toDelete.length > 0) {
  // Delete the duplicate records
  const { error, count } = await supabase
    .from('domains')
    .delete()
    .in('id', toDelete);

  if (error) {
    console.error('Error deleting duplicates:', error);
  } else {
    console.log(`✅ Successfully deleted ${count} duplicate domain records!`);
    
    // Show final state
    const finalResult = await supabase
      .from('domains')
      .select('id, name, status')
      .order('name', { ascending: true });
    
    console.log('\nRemaining Domains:');
    finalResult.data?.forEach(d => {
      console.log(`  - ${d.name} (${d.status})`);
    });
  }
} else {
  console.log('No duplicates found!');
}
