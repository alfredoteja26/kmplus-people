import { createInitialState } from "../src/lib/fixtures";
import { saveTenantState, seedDemoUserPasswords } from "../src/lib/server/persist";

async function main() {
  await saveTenantState(createInitialState());
  await seedDemoUserPasswords();
  console.log("Seeded tenant kmplus");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
