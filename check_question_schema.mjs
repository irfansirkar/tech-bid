const url = "https://wrbeytpyaostbpsaooxp.supabase.co";
const key = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);

// Get one question to see its structure
const { data, error } = await supabase
  .from("questions")
  .select("*")
  .limit(1);

if (error) {
  console.error("Error:", error);
} else if (data && data.length > 0) {
  console.log("Question structure:");
  console.log(JSON.stringify(data[0], null, 2));
} else {
  console.log("No questions found");
}
