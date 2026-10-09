import { TENANT_ID } from "@/lib/types";
import { getPrisma } from "./prisma";

/**
 * Serializes read-modify-write on the tenant, so two commands never load the same snapshot and the second
 * save drops the first one's change. Vercel runs many instances, so the lock is a Postgres advisory lock
 * held by a transaction around the whole command; the in-process queue keeps one instance from tying up
 * several pooled connections while it waits. The work's own load and save use a second connection, so the
 * pool needs at least 2 (`connection_limit` on DATABASE_URL).
 */
let tail: Promise<unknown> = Promise.resolve();

const LOCK_NAME = `kmplus-people:tenant:${TENANT_ID}`;
const HOLD = { maxWait: 15_000, timeout: 60_000 };

function holdDatabaseLock<T>(work: () => Promise<T>): Promise<T> {
  return getPrisma().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK_NAME}))`;
    return work();
  }, HOLD);
}

export function withTenantLock<T>(work: () => Promise<T>): Promise<T> {
  const locked = () => holdDatabaseLock(work);
  const run = tail.then(locked, locked);
  tail = run.catch(() => undefined);
  return run;
}
