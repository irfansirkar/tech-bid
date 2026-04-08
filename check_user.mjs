const url = "https://wrbeytpyaostbpsaooxp.supabase.co";
const key = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);

// Check if user exists
const { data: user, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", "admin-test-user-001")
  .maybeSingle();

if (error) {
  console.error("Error:", error.message);
} else if (user) {
  console.log("✅ User found in database!");
  console.log("ID:", user.id);
  console.log("Email:", user.email);
  console.log("Role:", user.role);
} else {
  console.log("❌ User not found - sync may not have occurred yet");
}
