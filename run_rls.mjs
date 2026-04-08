import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://wrbeytpyaostbpsaooxp.supabase.co';
const supabaseAnonKey = 'sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔒 Applying RLS Security Policies...\n');

// Read the RLS migration file
const migrationSql = fs.readFileSync('./supabase/migrations/00002_enable_rls.sql', 'utf-8');

// Split into individual statements using regex to handle multi-line statements
const statements = [];
let currentStatement = '';

migrationSql.split('\n').forEach(line => {
  if (line.trim().startsWith('--')) {
    // Skip comments but print them
    if (currentStatement.trim()) {
      statements.push(currentStatement);
      currentStatement = '';
    }
    console.log(`📝 ${line}`);
  } else {
    currentStatement += line + '\n';
    if (line.includes(';')) {
      statements.push(currentStatement);
      currentStatement = '';
    }
  }
});

if (currentStatement.trim()) {
  statements.push(currentStatement);
}

// Filter empty statements
const validStatements = statements
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`\n⚙️ Found ${validStatements.length} SQL statements to execute\n`);

let successCount = 0;
let errorCount = 0;

// Try to execute via SQL endpoint
try {
  // Note: This requires SUPER/ADMIN access which anon key doesn't have
  // We'll display instructions for manual execution
  
  console.log('❌ Client SDK cannot execute DDL (RLS/Policies)\n');
  console.log('📋 MANUAL EXECUTION REQUIRED:\n');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to: SQL Editor (left sidebar)');
  console.log('4. Click "+ New Query"');
  console.log('5. Paste the SQL below:');
  console.log('\n' + '='.repeat(80));
  console.log(migrationSql);
  console.log('='.repeat(80));
  console.log('\n6. Click "Run" button');
  console.log('\n✅ RLS will be enabled on all 5 tables');
  
} catch (err) {
  console.error('Error:', err.message);
}
