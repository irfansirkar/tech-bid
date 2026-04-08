const url = "https://wrbeytpyaostbpsaooxp.supabase.co";
const key = "sb_publishable_0cGQkcSqng9cuniT_IhWyQ_ukxXdJxl";

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);

const { data: domains } = await supabase
  .from("domains")
  .select("id, name, status")
  .limit(1);

if (domains && domains.length > 0) {
  console.log("Domain ID:", domains[0].id);
  console.log("Name:", domains[0].name);
  console.log("Status:", domains[0].status);
} else {
  console.log("No domains found");
}
