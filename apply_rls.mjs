import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrbeytpyaostbpsaooxp.supabase.co';
const supabaseAnonKey = 'sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Read the RLS migration file
import fs from 'fs';
const migrationSql = fs.readFileSync('./supabase/migrations/00002_enable_rls.sql', 'utf-8');

// Split by semicolon and filter empty statements
const statements = migrationSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute\n`);

try {
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql: statement }).catch(() => ({
      error: 'RPC not available - use Supabase dashboard'
    }));
    
    if (error && error !== 'RPC not available - use Supabase dashboard') {
      console.error(`  ❌ Error: ${error}`);
    } else if (error === 'RPC not available - use Supabase dashboard') {
      console.warn(`  ⚠️ Cannot execute via client - use Supabase Dashboard SQL Editor`);
      break;
    } else {
      console.log(`  ✓ Success`);
    }
  }
} catch (err) {
  console.error('Error executing statements:', err.message);
  console.log('\n📋 Copy the SQL from ./supabase/migrations/00002_enable_rls.sql');
  console.log('📍 Paste it into Supabase Admin Dashboard > SQL Editor > Run');
}
