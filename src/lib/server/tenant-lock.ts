/**
 * Serializes read-modify-write on the tenant within this server process, so two commands never load the
 * same snapshot and the second save drops the first one's change. Production runs one app container (port 88).
 */
let tail: Promise<unknown> = Promise.resolve();

export function withTenantLock<T>(work: () => Promise<T>): Promise<T> {
  const run = tail.then(work, work);
  tail = run.catch(() => undefined);
  return run;
}
