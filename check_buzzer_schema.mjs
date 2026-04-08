import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wrbeytpyaostbpsaooxp.supabase.co";
const supabaseKey = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

const supabase = createClient(supabaseUrl, supabaseKey);

// Test if buzzer_entries table exists
const { error: buzzerError } = await supabase
  .from("buzzer_entries")
  .select("*")
  .limit(1);

if (buzzerError && buzzerError.code === "PGRST116") {
  console.log("❌ buzzer_entries table NOT FOUND");
  console.log("\n📋 MANUAL SETUP REQUIRED:");
  console.log("1. Go to: https://app.supabase.com");
  console.log("2. Select your project");
  console.log("3. SQL Editor → New Query");
  console.log("4. Copy & Paste content from: supabase/migrations/00005_buzzer_system.sql");
  console.log("5. Click 'Run'");
  process.exit(1);
} else if (buzzerError) {
  console.error("❌ Error:", buzzerError.message);
  process.exit(1);
} else {
  console.log("✅ buzzer_entries table EXISTS - Buzzer system ready!");
}
