"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Header } from "@/components/Header";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setError("Wrong username or password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <>
      <Header title="Admin login" subtitle="Only admin can change pars, delete items, and edit the recipe book." />
      <form onSubmit={login} className="card mx-auto mt-10 max-w-md p-6">
        <label className="block text-sm">
          Username
          <input className="sheet-input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="mt-4 block text-sm">
          Password
          <input
            className="sheet-input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-wine">{error}</p> : null}
        <button className="btn btn-wine mt-5 w-full" type="submit">
          Sign in
        </button>
        <p className="mt-4 text-xs text-muted">
          Default is admin / Downtown2008 until you change ADMIN_USER and ADMIN_PASSWORD in .env.local.
        </p>
      </form>
    </>
  );
}
