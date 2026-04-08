const url = "https://wrbeytpyaostbpsaooxp.supabase.co";
const key = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);

console.log("🧪 Testing Participant Answer Submission Flow\n");

// 1. Check user exists
console.log("1️⃣ Verify user exists...");
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("id", "admin-test-user-001")
  .single();

if (user) {
  console.log(`   ✅ User found: ${user.id}`);
} else {
  console.log("   ❌ User not found");
  process.exit(1);
}

// 2. Get a question from any domain
console.log("\n2️⃣ Get a test question...");
const { data: questions } = await supabase
  .from("questions")
  .select("*")
  .limit(1);

if (questions && questions.length > 0) {
  const question = questions[0];
  console.log(`   ✅ Question found: ${question.content?.substring(0, 50)}...`);
  console.log(`   Domain: ${question.domain_id}`);
  console.log(`   Correct answer: ${question.correct_answer}`);

  // 3. Simulate answer submission
  console.log("\n3️⃣ Simulate answer submission...");
  const { data: inserted, error } = await supabase
    .from("answers")
    .insert({
      user_id: user.id,
      question_id: question.id,
      text: question.correct_answer,
      is_correct: true
    });

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
  } else {
    console.log(`   ✅ Answer submitted successfully!`);
    if (inserted && inserted.length > 0) {
      console.log(`   Answer ID: ${inserted[0].id}`);
    }
  }
} else {
  console.log("   ❌ No questions found");
}

console.log("\n✨ Test complete!");
