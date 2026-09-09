"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setAdmin(Boolean(data.admin)))
      .catch(() => setAdmin(false));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAdmin(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-[#eadcc6] bg-[#fffaf2]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-wine">Tamara&apos;s Downtown</p>
          <h1 className="serif text-3xl leading-none text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="btn btn-ghost !min-h-10" href="/prep">
            Prep
          </Link>
          <Link className="btn btn-ghost !min-h-10" href="/ordering">
            Ordering
          </Link>
          <Link className="btn btn-ghost !min-h-10" href="/recipes">
            Recipes
          </Link>
          {admin ? (
            <>
              <Link className="btn btn-gold !min-h-10" href="/admin">
                Admin
              </Link>
              <button className="btn btn-ghost !min-h-10" onClick={logout} type="button">
                Log out
              </button>
            </>
          ) : (
            <Link className="btn btn-ghost !min-h-10" href="/admin/login">
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
