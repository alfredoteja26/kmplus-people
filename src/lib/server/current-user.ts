import type { Role } from "@/lib/types";
import { TENANT_ID } from "@/lib/types";
import { getPrisma } from "./prisma";
import { readSession } from "./session";

export type SessionUser = {
  id: string;
  personId: string;
  email: string;
  role: Role;
  mustSetPassword: boolean;
  preferredName: string;
  legalName: string;
};

export async function currentSessionUser(): Promise<SessionUser | null> {
  const session = await readSession();
  if (!session) return null;
  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: TENANT_ID },
    include: { person: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    personId: user.personId,
    email: user.email,
    role: user.role as Role,
    mustSetPassword: user.mustSetPassword,
    preferredName: user.person.preferredName,
    legalName: user.person.legalName,
  };
}
