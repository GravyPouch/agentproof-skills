"use client";

import { useEffect, useState } from "react";

export default function AdminPanel() {
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  useEffect(() => {
    fetch("https://admin-api.example.test/v1/users", {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_TOKEN}` },
    })
      .then(r => r.json())
      .then(setUsers);
  }, []);
  return <ul>{users.map(u => <li key={u.id}>{u.email}</li>)}</ul>;
}
