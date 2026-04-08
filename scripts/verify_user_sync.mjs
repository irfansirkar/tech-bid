import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyUserSync() {
  console.log("🔍 Checking if mock user exists in database...\n");

  // Check if user exists
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", "admin-test-user-001")
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Query error:", error.message);
    return;
  }

  if (user) {
    console.log("✅ User found in database:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.created_at}`);
  } else {
    console.log("❌ User NOT found in database");
    console.log("   This means the arena page sync hasn't run yet");
    console.log("   ACTION: Visit http://localhost:3001/participant/arena/[domain-id]");
  }

  // List all users
  console.log("\n📋 All users in database:");
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, email, role")
    .order("created_at", { ascending: false })
    .limit(10);

  if (allUsers && allUsers.length > 0) {
    allUsers.forEach((u) => {
      console.log(`   • ${u.id} (${u.email}) - ${u.role}`);
    });
  } else {
    console.log("   No users found");
  }
}

verifyUserSync().catch(console.error);
