import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-wine">Fairhope, Alabama</p>
      <h1 className="serif mt-2 text-5xl leading-none sm:text-7xl">Tamara&apos;s Downtown</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Kitchen inventory, manager ordering, and the house recipe book. Prep staff can enter counts
        without logging in. Only admin can change pars.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/prep" className="card group p-6 transition hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Prep team</p>
          <h2 className="serif mt-2 text-3xl">Daily inventory</h2>
          <p className="mt-2 text-sm text-muted">
            Enter on-hand and what you made today. If you go over par, you&apos;ll add a reason. Send
            emails the owner the dated sheet.
          </p>
        </Link>
        <Link href="/ordering" className="card group p-6 transition hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Managers</p>
          <h2 className="serif mt-2 text-3xl">Ordering</h2>
          <p className="mt-2 text-sm text-muted">
            Same par sheet, built for purchasing: what we have and how much to order.
          </p>
        </Link>
        <Link href="/recipes" className="card group p-6 transition hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Kitchen</p>
          <h2 className="serif mt-2 text-3xl">Recipes</h2>
          <p className="mt-2 text-sm text-muted">
            Crab cakes, gumbo, joule, hollandaise, desserts, and the rest of the house book.
          </p>
        </Link>
        <Link href="/records" className="card group p-6 transition hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">History</p>
          <h2 className="serif mt-2 text-3xl">Records</h2>
          <p className="mt-2 text-sm text-muted">
            See every saved draft and every sent prep or order sheet, with the date and who sent it.
          </p>
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">104 N Section St · Owner reports go to fairhopefood@ymail.com</p>
        <Link href="/admin/login" className="btn btn-ghost">
          Admin login
        </Link>
      </div>
    </main>
  );
}
