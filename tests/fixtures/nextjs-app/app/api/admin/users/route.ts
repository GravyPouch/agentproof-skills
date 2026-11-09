import { users } from "@/lib/db";

// Protected by middleware.ts
export async function GET() {
  return Response.json(users.map(u => ({ id: u.id, email: u.email, role: u.role })));
}
