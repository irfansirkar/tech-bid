import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wrbeytpyaostbpsaooxp.supabase.co";
const supabaseKey = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

const supabase = createClient(supabaseUrl, supabaseKey);

// Test if domain_bids table already exists
const { data: bidsCheck, error: bidsError } = await supabase
  .from("domain_bids")
  .select("*")
  .limit(1);

if (bidsError && (bidsError.message.includes("not found") || bidsError.code === "PGRST116")) {
  console.log("❌ domain_bids table NOT FOUND");
  console.log("\n📋 MANUAL SETUP REQUIRED:");
  console.log("1. Go to: https://app.supabase.com");
  console.log("2. Select your project");
  console.log("3. SQL Editor → New Query");
  console.log("4. Copy & Paste content from: supabase/migrations/00004_bidding_system_with_multipliers.sql");
  console.log("5. Click 'Run'");
  console.log("\n🔗 Direct SQL File Location:");
  console.log("   supabase/migrations/00004_bidding_system_with_multipliers.sql");
  process.exit(1);
} else if (bidsError) {
  console.error("❌ Error:", bidsError.message);
  process.exit(1);
} else {
  console.log("✅ domain_bids table EXISTS - Bidding schema is ready!");
}
