# Tamara's Downtown Inventory

Kitchen inventory, manager ordering, and the house recipe book for [Tamara's Downtown](https://tamarasdowntownfairhope.com/) in Fairhope, Alabama.

Prep staff and managers use the sheets with no login. Only admin can change pars, delete items, and edit recipes.

## What it does

- **Prep inventory** — par (admin-only), on hand, made today. If made today is over par, a reason is required. Send stores a dated record and emails [fairhopefood@ymail.com](mailto:fairhopefood@ymail.com).
- **Manager ordering** — par, on hand, and how much to order. Suggested order is `par − on hand`. Send emails the owner the dated order sheet.
- **Add inventory** — prep or managers can add items. New items start at par 0 until admin sets par.
- **Recipes** — crab cakes, gumbo, crawfish joule, hollandaise, desserts, and other house starters based on the [online menu](https://tamarasdowntownfairhope.com/menu/). Admin can add or replace them with Tamara's exact formulas.
- **Admin** — login, edit pars, review dated records, manage recipes.

Default admin login: `admin` / `Downtown2008` (change this in `.env.local`).

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
