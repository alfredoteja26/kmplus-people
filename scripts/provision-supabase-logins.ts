import { normalizeLoginEmail } from "../src/lib/auth-policy";
import { getPrisma } from "../src/lib/server/prisma";
import { ensureLogin, sendPasswordReset, supabaseAuthConfigured } from "../src/lib/server/supabase-auth";
import { TENANT_ID } from "../src/lib/types";

// One-off cutover from Firebase (ADR-0011): every active User gets a Supabase login.
// Passwords do not move, so pass --send to mail each person a set-password link.
const send = process.argv.includes("--send");

async function main() {
  if (!supabaseAuthConfigured()) throw new Error("Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY");
  const users = await getPrisma().user.findMany({
    where: { tenantId: TENANT_ID },
    include: { person: { include: { employments: true } } },
  });
  for (const user of users) {
    const email = normalizeLoginEmail(user.email);
    if (!email || !user.person.employments.some((row) => row.status === "active")) continue;
    const created = await ensureLogin(email);
    if (send) await sendPasswordReset(email);
    console.log(`${created ? "created" : "exists "} ${email}${send ? " (set-password email sent)" : ""}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => getPrisma().$disconnect());
