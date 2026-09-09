import { neon } from "@neondatabase/serverless";
import { seedItems, seedRecipes } from "./seed";
import type { DraftSheet, InventoryItem, ItemType, Recipe, Report, ReportLine } from "./types";

export function databaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

function sql() {
  return neon(databaseUrl());
}

function asItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id),
    type: row.type as ItemType,
    name: String(row.name),
    category: String(row.category),
    unit: String(row.unit),
    par: Number(row.par),
    createdAt: String(row.created_at),
    lastOnHand: row.last_on_hand == null ? undefined : Number(row.last_on_hand),
    lastMadeToday: row.last_made_today == null ? undefined : Number(row.last_made_today),
    lastOrderQty: row.last_order_qty == null ? undefined : Number(row.last_order_qty),
    lastSavedAt: row.last_saved_at ? String(row.last_saved_at) : undefined,
  };
}

function asRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    yield: String(row.yield_text),
    prepTime: String(row.prep_time),
    description: String(row.description),
    ingredients: parseJson(row.ingredients) || [],
    instructions: parseJson(row.instructions) || [],
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function asReport(row: Record<string, unknown>): Report {
  return {
    id: String(row.id),
    type: row.type as ItemType,
    date: String(row.date),
    submittedAt: String(row.submitted_at),
    submittedBy: String(row.submitted_by),
    emailed: Boolean(row.emailed),
    emailError: row.email_error ? String(row.email_error) : undefined,
    status: "sent",
    lines: parseJson(row.lines) || [],
  };
}

function asDraft(row: Record<string, unknown>): DraftSheet {
  return {
    id: String(row.id),
    type: row.type as ItemType,
    date: String(row.date),
    updatedAt: String(row.updated_at),
    submittedBy: String(row.submitted_by),
    status: "draft",
    lines: parseJson(row.lines) || [],
  };
}

function parseJson(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

let readyPromise: Promise<void> | null = null;

async function migrate() {
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    par DOUBLE PRECISION NOT NULL,
    created_at TEXT NOT NULL,
    last_on_hand DOUBLE PRECISION,
    last_made_today DOUBLE PRECISION,
    last_order_qty DOUBLE PRECISION,
    last_saved_at TEXT
  )`;
  await db`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    emailed BOOLEAN NOT NULL DEFAULT FALSE,
    email_error TEXT,
    lines JSONB NOT NULL
  )`;
  await db`CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    lines JSONB NOT NULL
  )`;
  await db`CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    yield_text TEXT NOT NULL,
    prep_time TEXT NOT NULL,
    description TEXT NOT NULL,
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;

  const itemCount = await db`SELECT COUNT(*)::int AS count FROM items`;
  if (Number(itemCount[0]?.count) === 0) {
    for (const item of seedItems()) {
      await db`INSERT INTO items (id, type, name, category, unit, par, created_at)
        VALUES (${item.id}, ${item.type}, ${item.name}, ${item.category}, ${item.unit}, ${item.par}, ${item.createdAt})
        ON CONFLICT (id) DO NOTHING`;
    }
  }
  const recipeCount = await db`SELECT COUNT(*)::int AS count FROM recipes`;
  if (Number(recipeCount[0]?.count) === 0) {
    for (const recipe of seedRecipes()) {
      await db`INSERT INTO recipes (id, name, category, yield_text, prep_time, description, ingredients, instructions, notes, created_at, updated_at)
        VALUES (
          ${recipe.id}, ${recipe.name}, ${recipe.category}, ${recipe.yield}, ${recipe.prepTime}, ${recipe.description},
          ${JSON.stringify(recipe.ingredients)}, ${JSON.stringify(recipe.instructions)}, ${recipe.notes || null},
          ${recipe.createdAt}, ${recipe.updatedAt}
        )
        ON CONFLICT (id) DO NOTHING`;
    }
  }
}

export async function pgReady() {
  if (!readyPromise) readyPromise = migrate();
  await readyPromise;
}

export async function pgListItems(type?: ItemType | null) {
  await pgReady();
  const db = sql();
  const rows = type
    ? await db`SELECT * FROM items WHERE type = ${type} ORDER BY category, name`
    : await db`SELECT * FROM items ORDER BY type, category, name`;
  return rows.map((row) => asItem(row as Record<string, unknown>));
}

export async function pgGetItem(id: string) {
  await pgReady();
  const rows = await sql()`SELECT * FROM items WHERE id = ${id} LIMIT 1`;
  return rows[0] ? asItem(rows[0] as Record<string, unknown>) : null;
}

export async function pgCreateItem(item: InventoryItem) {
  await pgReady();
  await sql()`INSERT INTO items (id, type, name, category, unit, par, created_at)
    VALUES (${item.id}, ${item.type}, ${item.name}, ${item.category}, ${item.unit}, ${item.par}, ${item.createdAt})`;
  return item;
}

export async function pgUpdateItem(id: string, patch: Partial<InventoryItem>) {
  const current = await pgGetItem(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await sql()`UPDATE items SET
    name = ${next.name},
    category = ${next.category},
    unit = ${next.unit},
    par = ${next.par},
    last_on_hand = ${next.lastOnHand ?? null},
    last_made_today = ${next.lastMadeToday ?? null},
    last_order_qty = ${next.lastOrderQty ?? null},
    last_saved_at = ${next.lastSavedAt ?? null}
    WHERE id = ${id}`;
  return next;
}

export async function pgDeleteItem(id: string) {
  await pgReady();
  await sql()`DELETE FROM items WHERE id = ${id}`;
}

export async function pgListRecipes() {
  await pgReady();
  const rows = await sql()`SELECT * FROM recipes ORDER BY category, name`;
  return rows.map((row) => asRecipe(row as Record<string, unknown>));
}

export async function pgGetRecipe(id: string) {
  await pgReady();
  const rows = await sql()`SELECT * FROM recipes WHERE id = ${id} LIMIT 1`;
  return rows[0] ? asRecipe(rows[0] as Record<string, unknown>) : null;
}

export async function pgCreateRecipe(recipe: Recipe) {
  await pgReady();
  await sql()`INSERT INTO recipes (id, name, category, yield_text, prep_time, description, ingredients, instructions, notes, created_at, updated_at)
    VALUES (
      ${recipe.id}, ${recipe.name}, ${recipe.category}, ${recipe.yield}, ${recipe.prepTime}, ${recipe.description},
      ${JSON.stringify(recipe.ingredients)}, ${JSON.stringify(recipe.instructions)}, ${recipe.notes || null},
      ${recipe.createdAt}, ${recipe.updatedAt}
    )`;
  return recipe;
}

export async function pgUpdateRecipe(id: string, patch: Partial<Recipe>) {
  const current = await pgGetRecipe(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await sql()`UPDATE recipes SET
    name = ${next.name},
    category = ${next.category},
    yield_text = ${next.yield},
    prep_time = ${next.prepTime},
    description = ${next.description},
    ingredients = ${JSON.stringify(next.ingredients)},
    instructions = ${JSON.stringify(next.instructions)},
    notes = ${next.notes || null},
    updated_at = ${next.updatedAt}
    WHERE id = ${id}`;
  return next;
}

export async function pgDeleteRecipe(id: string) {
  await pgReady();
  await sql()`DELETE FROM recipes WHERE id = ${id}`;
}

export async function pgListReports(type?: string | null) {
  await pgReady();
  const db = sql();
  const rows = type
    ? await db`SELECT * FROM reports WHERE type = ${type} ORDER BY submitted_at DESC`
    : await db`SELECT * FROM reports ORDER BY submitted_at DESC`;
  return rows.map((row) => asReport(row as Record<string, unknown>));
}

export async function pgGetReport(id: string) {
  await pgReady();
  const rows = await sql()`SELECT * FROM reports WHERE id = ${id} LIMIT 1`;
  return rows[0] ? asReport(rows[0] as Record<string, unknown>) : null;
}

export async function pgDeleteReport(id: string) {
  await pgReady();
  await sql()`DELETE FROM reports WHERE id = ${id}`;
}

export async function pgCreateReport(report: Report) {
  await pgReady();
  await sql()`INSERT INTO reports (id, type, date, submitted_at, submitted_by, emailed, email_error, lines)
    VALUES (
      ${report.id}, ${report.type}, ${report.date}, ${report.submittedAt}, ${report.submittedBy},
      ${report.emailed}, ${report.emailError || null}, ${JSON.stringify(report.lines)}
    )`;
  return report;
}

export async function pgListDrafts(type?: ItemType | null) {
  await pgReady();
  const db = sql();
  const rows = type
    ? await db`SELECT * FROM drafts WHERE type = ${type} ORDER BY updated_at DESC`
    : await db`SELECT * FROM drafts ORDER BY updated_at DESC`;
  return rows.map((row) => asDraft(row as Record<string, unknown>));
}

export async function pgGetDraft(type: ItemType, date: string) {
  await pgReady();
  const rows = await sql()`SELECT * FROM drafts WHERE type = ${type} AND date = ${date} LIMIT 1`;
  return rows[0] ? asDraft(rows[0] as Record<string, unknown>) : null;
}

export async function pgUpsertDraft(draft: DraftSheet) {
  await pgReady();
  await sql()`INSERT INTO drafts (id, type, date, updated_at, submitted_by, lines)
    VALUES (${draft.id}, ${draft.type}, ${draft.date}, ${draft.updatedAt}, ${draft.submittedBy}, ${JSON.stringify(draft.lines)})
    ON CONFLICT (id) DO UPDATE SET
      updated_at = EXCLUDED.updated_at,
      submitted_by = EXCLUDED.submitted_by,
      lines = EXCLUDED.lines`;
  return draft;
}

export async function pgDeleteDraftById(id: string) {
  await pgReady();
  await sql()`DELETE FROM drafts WHERE id = ${id}`;
}

export async function pgClearDraft(type: ItemType, date: string) {
  await pgReady();
  await sql()`DELETE FROM drafts WHERE type = ${type} AND date = ${date}`;
}

export async function pgApplyCounts(type: ItemType, lines: ReportLine[]) {
  const savedAt = new Date().toISOString();
  for (const line of lines) {
    const item = await pgGetItem(line.itemId);
    if (!item) continue;
    if (type === "prep") {
      item.lastOnHand = (Number(line.onHand) || 0) + (Number(line.madeToday) || 0);
      item.lastMadeToday = Number(line.madeToday) || 0;
    } else {
      item.lastOnHand = Number(line.onHand) || 0;
      item.lastOrderQty = Number(line.orderQty) || 0;
    }
    item.lastSavedAt = savedAt;
    await pgUpdateItem(item.id, item);
  }
}

export async function pgListSheets() {
  const [drafts, reports] = await Promise.all([pgListDrafts(), pgListReports()]);
  const sent = reports.map((report) => ({ ...report, status: "sent" as const }));
  return [...drafts, ...sent].sort((a, b) => {
    const aTime = "submittedAt" in a ? a.submittedAt : a.updatedAt;
    const bTime = "submittedAt" in b ? b.submittedAt : b.updatedAt;
    return bTime.localeCompare(aTime);
  });
}
