// scripts/createTestUsers.js

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUsers() {
  const emails = [
    "test1@email.com",
    "test2@email.com",
    "test3@email.com",
    "test4@email.com",
    "test5@email.com",
    "test6@email.com",
  ];
  const password = "test123";

  for (const email of emails) {
    // Using the Admin API to create and auto-confirm users
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error(`❌ Failed to create ${email}:`, error.message);
    } else {
      console.log(`✅ Created user ${email} (id: ${data.id})`);
    }
  }
}

if (require.main === module) {
  createTestUsers()
    .then(() => {
      console.log("All done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Unexpected error:", err);
      process.exit(1);
    });
}

module.exports = { createTestUsers };
