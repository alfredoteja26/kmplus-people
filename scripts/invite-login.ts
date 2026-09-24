import { setLoginEmail } from "../src/lib/commands";
import { loadTenantState, saveTenantState } from "../src/lib/server/persist";
import { overlaySessionIdentity } from "../src/lib/session-identity";

const personId = process.argv[2];
const email = process.argv[3];

if (!personId || !email) {
  console.error("Usage: npx tsx --tsconfig tsconfig.json scripts/invite-login.ts <personId> <email@kmplus.co.id>");
  process.exit(1);
}

async function main() {
  const state = overlaySessionIdentity(await loadTenantState(), {
    personId: "person-denny",
    role: "hr",
  });
  const result = setLoginEmail(state, personId, email);
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  await saveTenantState(result.state);
  console.log(`Set-password email requested for ${result.state.users.find((row) => row.personId === personId)?.email}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
