# Tamara's Downtown Inventory

Kitchen inventory, manager ordering, and the house recipe book for [Tamara's Downtown](https://tamarasdowntownfairhope.com/) in Fairhope, Alabama.

Prep staff and managers use the sheets with no login. Only admin can change pars, delete items, and edit recipes.

## What it does

- **Prep inventory** — par (admin-only), on hand, made today. **Save inventory** keeps a draft so you can leave and come back. If made today is over par, a reason is required. **Send** stores a dated record, keeps the ending on-hand on the sheet, and emails [fairhopefood@ymail.com](mailto:fairhopefood@ymail.com).
- **Records** — everyone can open saved drafts and sent prep/order sheets, dated.
- **Manager ordering** — par, on hand, and how much to order. Suggested order is `par − on hand`. Send emails the owner the dated order sheet.
- **Add inventory** — prep or managers can add items. New items start at par 0 until admin sets par.
- **Recipes** — crab cakes, gumbo, crawfish joule, hollandaise, desserts, and other house starters based on the [online menu](https://tamarasdowntownfairhope.com/menu/). Admin can add or replace them with Tamara's exact formulas.
- **Admin** — login, edit pars, review dated records, manage recipes.

Default admin login: `admin` / `Downtown2008` (change this in `.env.local` or Vercel env vars).

## Vercel database (required for the live site)

Vercel cannot keep a local file. Add Neon Postgres so inventory, drafts, and records stay saved.

1. In the Vercel project, open **Storage**.
2. Click **Create Database** and choose **Neon** (or **Postgres**).
3. Accept the defaults and connect it to this project.
4. Vercel should add `DATABASE_URL` (or `POSTGRES_URL`) automatically.
5. Also set these Environment Variables for Production (and Preview if you use it):
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET` (any long random string)
   - `OWNER_EMAIL=fairhopefood@ymail.com`
6. **Redeploy** after the database is connected.

The first page load creates the tables and seeds Tamara’s items and recipes. After that, Save and Send write to the database.

On your laptop, if `DATABASE_URL` is not set, the app still uses a local file. That is fine for testing.

## Run it

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Email

Reports always save locally with a date. To also send them to the owner, add Yahoo (or another) SMTP settings in `.env.local`:

```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=465
SMTP_USER=your-yahoo-login
SMTP_PASS=your-app-password
OWNER_EMAIL=fairhopefood@ymail.com
```

Yahoo usually needs an app password, not the regular mailbox password.
