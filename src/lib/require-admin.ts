import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * The authorization check for every admin server action.
 *
 * This used to be copy-pasted into each actions file. Eight near-identical
 * copies of a security check is eight places for one of them to quietly drift
 * weaker, so it lives here once.
 *
 * The role is enforced, not just the session. UserRole has a STAFF value that
 * nothing was checking, which meant a staff account would have had the same
 * power as an owner — including deleting projects and changing prices.
 */
export type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

/** Returns the signed-in admin, or null. For actions that report errors as data. */
export async function getAdmin(): Promise<AdminUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as AdminUser | undefined;
  if (!user) return null;
  if (user.role && user.role !== "ADMIN") return null;
  return user;
}

/** Returns the signed-in admin, or throws. For actions that let errors bubble. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdmin();
  if (!user) throw new Error("Unauthorized");
  return user;
}
