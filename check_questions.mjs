const url = "https://wrbeytpyaostbpsaooxp.supabase.co";
const key = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);

// Check for active questions in the Cloud Computing domain
const { data: questions } = await supabase
  .from("questions")
  .select("*")
  .eq("domain_id", "e6dece66-ad91-4438-8033-9b01ad52ba69")
  .eq("is_active", true)
  .eq("round_type", "bidding");

console.log("Active bidding questions for Cloud Computing:");
if (questions && questions.length > 0) {
  questions.forEach((q, i) => {
    console.log(`${i + 1}. ${q.text.substring(0, 50)}...`);
    console.log(`   Options: A=${q.option_a}, B=${q.option_b}, C=${q.option_c}, D=${q.option_d}`);
    console.log(`   Correct: ${q.correct_answer}`);
  });
} else {
  console.log("❌ No active questions found");
  console.log("   Admin needs to run Quick Setup");
}

// Check all questions in the domain
const { data: allQ } = await supabase
  .from("questions")
  .select("*")
  .eq("domain_id", "e6dece66-ad91-4438-8033-9b01ad52ba69");

console.log(`\nTotal questions in domain: ${allQ?.length || 0}`);
