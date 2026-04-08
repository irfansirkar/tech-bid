import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrbeytpyaostbpsaooxp.supabase.co';
const supabaseAnonKey = 'sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const result = await supabase
  .from('domains')
  .select('id, name, status')
  .order('name', { ascending: true });

console.log('Current Domains:');
console.log(JSON.stringify(result.data, null, 2));

// Count duplicates by name
const nameCount = {};
const duplicates = [];
result.data?.forEach(d => {
  if (!nameCount[d.name]) {
    nameCount[d.name] = [];
  }
  nameCount[d.name].push(d.id);
});

console.log('\nDomain Name Counts:');
Object.entries(nameCount).forEach(([name, ids]) => {
  console.log(`${name}: ${ids.length} records`);
  if (ids.length > 1) {
    duplicates.push({ name, ids });
    console.log(`  Duplicate IDs: ${ids.join(', ')}`);
  }
});

console.log(`\nTotal duplicates found: ${duplicates.length}`);
if (duplicates.length > 0) {
  console.log('To remove duplicates, we need to delete the extra records.');
}
