import { createInitialState } from "../src/lib/fixtures";
import { saveTenantState, seedDemoUserPasswords } from "../src/lib/server/persist";
import { supabaseAuthConfigured } from "../src/lib/server/supabase-auth";

async function main() {
  // Saving the seeded Users mails each of them a set-password link once Supabase Auth is configured.
  if (supabaseAuthConfigured()) throw new Error("Refusing to seed: Supabase Auth is configured (production?)");
  await saveTenantState(createInitialState());
  await seedDemoUserPasswords();
  console.log("Seeded tenant kmplus");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
