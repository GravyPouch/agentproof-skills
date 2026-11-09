"use server";

import { revalidatePath } from "next/cache";
import { projects } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function renameProject(id: string, name: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const project = projects.find(p => p.id === id && p.ownerId === session.userId);
  if (!project) throw new Error("Not found");
  project.name = String(name).slice(0, 100);
  revalidatePath("/dashboard");
}

export async function deleteProject(id: string) {
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) projects.splice(index, 1);
  revalidatePath("/dashboard");
}
