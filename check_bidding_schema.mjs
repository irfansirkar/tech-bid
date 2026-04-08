const url = "https://wrbeytpyaostbpsaooxp.supabase.co";
const key = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);

// Check if domain_bids table exists
const { data: bids, error } = await supabase
  .from("domain_bids")
  .select("*")
  .limit(1);

if (error) {
  if (error.code === "PGRST116" || error.message.includes("not found")) {
    console.log("❌ domain_bids table NOT found");
    console.log("   Bidding system schema needs to be applied");
  } else {
    console.log("❌ Error:", error.message);
  }
} else {
  console.log("✅ domain_bids table exists");
  console.log(`   Current records: ${bids?.length || 0}`);
}

// Check if bids table exists  
const { data: legacyBids, error: error2 } = await supabase
  .from("bids")
  .select("*")
  .limit(1);

if (error2) {
  console.log("❌ bids table NOT found");
} else {
  console.log("✅ bids table exists");
}
