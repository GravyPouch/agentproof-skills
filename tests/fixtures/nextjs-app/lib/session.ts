import { cookies } from "next/headers";
import { users } from "./db";

export type Session = { userId: string; role: "user" | "admin" };

export async function getSession(): Promise<Session | null> {
  const value = (await cookies()).get("session")?.value;
  const user = users.find(u => u.sessionToken === value);
  return user ? { userId: user.id, role: user.role } : null;
}
