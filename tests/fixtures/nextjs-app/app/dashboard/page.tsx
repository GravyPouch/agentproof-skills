import { projects } from "@/lib/db";
import { getSession } from "@/lib/session";
import { deleteProject } from "../projects/actions";
import AdminPanel from "@/components/AdminPanel";

export default async function Dashboard() {
  const session = await getSession();
  const mine = projects.filter(p => p.ownerId === session?.userId);
  return (
    <main>
      <h1>{process.env.NEXT_PUBLIC_APP_NAME}</h1>
      <ul>
        {mine.map(p => (
          <li key={p.id}>
            {p.name}
            <form action={deleteProject.bind(null, p.id)}>
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>
      {session?.role === "admin" && <AdminPanel />}
    </main>
  );
}
