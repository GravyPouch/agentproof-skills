export type User = {
  id: string;
  email: string;
  role: "user" | "admin";
  passwordHash: string;
  sessionToken: string;
};

export type Project = { id: string; ownerId: string; name: string };

export const users: User[] = [
  { id: "user-a", email: "a@example.test", role: "user", passwordHash: "$argon2id$fixture-a", sessionToken: "session-a" },
  { id: "user-b", email: "b@example.test", role: "user", passwordHash: "$argon2id$fixture-b", sessionToken: "session-b" },
  { id: "admin-1", email: "admin@example.test", role: "admin", passwordHash: "$argon2id$fixture-admin", sessionToken: "session-admin" },
];

export const projects: Project[] = [
  { id: "project-of-a", ownerId: "user-a", name: "A's project" },
  { id: "project-of-b", ownerId: "user-b", name: "B's project" },
];
