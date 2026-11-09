import { neon } from "@neondatabase/serverless";
import { seedItems, seedRecipes, syncCatalog, syncRecipes } from "./seed";
import type {
  DraftSheet,
  InventoryItem,
  ItemType,
  PriceRecord,
  Recipe,
  Report,
  ReportLine,
  Shift,
  VendorPriceList,
  VendorSetting,
} from "./types";
import { compareOrderingItems, VENDORS } from "./catalog";
import { qtyAmount } from "./qty";

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
    vendor: row.vendor ? String(row.vendor) : undefined,
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
    shift: row.shift === "night" || row.shift === "day" ? (row.shift as Shift) : undefined,
    reopened: Boolean(row.reopened),
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
    shift: row.shift === "night" || row.shift === "day" ? (row.shift as Shift) : undefined,
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
    last_saved_at TEXT,
    vendor TEXT
  )`;
  await db`ALTER TABLE items ADD COLUMN IF NOT EXISTS vendor TEXT`;
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
  await db`ALTER TABLE reports ADD COLUMN IF NOT EXISTS shift TEXT`;
  await db`ALTER TABLE reports ADD COLUMN IF NOT EXISTS reopened BOOLEAN DEFAULT FALSE`;
  await db`CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    lines JSONB NOT NULL
  )`;
  await db`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS shift TEXT`;
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
  await db`CREATE TABLE IF NOT EXISTS vendor_settings (
    name TEXT PRIMARY KEY,
    email TEXT,
    upload_token TEXT NOT NULL
  )`;
  await db`ALTER TABLE vendor_settings ADD COLUMN IF NOT EXISTS contact_name TEXT`;
  await db`ALTER TABLE vendor_settings ADD COLUMN IF NOT EXISTS phone TEXT`;
  await db`CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY,
    vendor TEXT NOT NULL,
    month TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    file_name TEXT NOT NULL,
    lines JSONB NOT NULL
  )`;
  await db`CREATE TABLE IF NOT EXISTS price_records (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    month TEXT NOT NULL,
    vendor TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    file_name TEXT NOT NULL,
    changes JSONB NOT NULL,
    snapshot JSONB NOT NULL
  )`;
  for (const name of VENDORS) {
    await db`INSERT INTO vendor_settings (name, email, upload_token)
      VALUES (${name}, ${""}, ${crypto.randomUUID()})
      ON CONFLICT (name) DO NOTHING`;
  }

  const itemCount = await db`SELECT COUNT(*)::int AS count FROM items`;
  if (Number(itemCount[0]?.count) === 0) {
    for (const item of seedItems()) {
      await db`INSERT INTO items (id, type, name, category, unit, par, created_at, vendor)
        VALUES (${item.id}, ${item.type}, ${item.name}, ${item.category}, ${item.unit}, ${item.par}, ${item.createdAt}, ${item.vendor || null})
        ON CONFLICT (id) DO NOTHING`;
    }
  } else {
    const existing = (await db`SELECT * FROM items`).map((row) => asItem(row as Record<string, unknown>));
    const { changed, removed } = syncCatalog(existing);
    if (changed) {
      for (const item of existing) {
        await db`INSERT INTO items (id, type, name, category, unit, par, created_at, vendor)
          VALUES (${item.id}, ${item.type}, ${item.name}, ${item.category}, ${item.unit}, ${item.par}, ${item.createdAt}, ${item.vendor || null})
          ON CONFLICT (id) DO UPDATE SET
            vendor = COALESCE(NULLIF(items.vendor, ''), EXCLUDED.vendor),
            category = EXCLUDED.category,
            name = EXCLUDED.name`;
      }
      for (const id of removed) {
        await db`DELETE FROM items WHERE id = ${id}`;
      }
    }
  }
  const existingRecipes = (await db`SELECT * FROM recipes`).map((row) => asRecipe(row as Record<string, unknown>));
  if (existingRecipes.length === 0) {
    for (const recipe of seedRecipes()) {
      await db`INSERT INTO recipes (id, name, category, yield_text, prep_time, description, ingredients, instructions, notes, created_at, updated_at)
        VALUES (
          ${recipe.id}, ${recipe.name}, ${recipe.category}, ${recipe.yield}, ${recipe.prepTime}, ${recipe.description},
          ${JSON.stringify(recipe.ingredients)}, ${JSON.stringify(recipe.instructions)}, ${recipe.notes || null},
          ${recipe.createdAt}, ${recipe.updatedAt}
        )
        ON CONFLICT (id) DO NOTHING`;
    }
  } else {
    const { changed, removed } = syncRecipes(existingRecipes);
    if (changed) {
      for (const recipe of existingRecipes) {
        await db`INSERT INTO recipes (id, name, category, yield_text, prep_time, description, ingredients, instructions, notes, created_at, updated_at)
          VALUES (
            ${recipe.id}, ${recipe.name}, ${recipe.category}, ${recipe.yield}, ${recipe.prepTime}, ${recipe.description},
            ${JSON.stringify(recipe.ingredients)}, ${JSON.stringify(recipe.instructions)}, ${recipe.notes || null},
            ${recipe.createdAt}, ${recipe.updatedAt}
          )
          ON CONFLICT (id) DO NOTHING`;
      }
      for (const id of removed) {
        await db`DELETE FROM recipes WHERE id = ${id}`;
      }
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
    ? await db`SELECT * FROM items WHERE type = ${type} ORDER BY vendor NULLS LAST, category, name`
    : await db`SELECT * FROM items ORDER BY type, vendor NULLS LAST, category, name`;
  return rows
    .map((row) => asItem(row as Record<string, unknown>))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.type === "ordering") return compareOrderingItems(a, b);
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    });
}

export async function pgGetItem(id: string) {
  await pgReady();
  const rows = await sql()`SELECT * FROM items WHERE id = ${id} LIMIT 1`;
  return rows[0] ? asItem(rows[0] as Record<string, unknown>) : null;
}

export async function pgCreateItem(item: InventoryItem) {
  await pgReady();
  await sql()`INSERT INTO items (id, type, name, category, unit, par, created_at, vendor)
    VALUES (${item.id}, ${item.type}, ${item.name}, ${item.category}, ${item.unit}, ${item.par}, ${item.createdAt}, ${item.vendor || null})`;
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
    vendor = ${next.vendor || null},
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
  await sql()`INSERT INTO reports (id, type, date, submitted_at, submitted_by, emailed, email_error, lines, shift, reopened)
    VALUES (
      ${report.id}, ${report.type}, ${report.date}, ${report.submittedAt}, ${report.submittedBy},
      ${report.emailed}, ${report.emailError || null}, ${JSON.stringify(report.lines)}, ${report.shift || null},
      ${report.reopened || false}
    )`;
  return report;
}

export async function pgFindLatestSent(type: ItemType, date: string, shift?: Shift | null) {
  await pgReady();
  const db = sql();
  const rows =
    type === "prep" && shift
      ? await db`SELECT * FROM reports WHERE type = ${type} AND date = ${date} AND (shift = ${shift} OR ((shift IS NULL OR shift = '') AND ${shift} = 'day')) ORDER BY submitted_at DESC LIMIT 1`
      : await db`SELECT * FROM reports WHERE type = ${type} AND date = ${date} AND (shift IS NULL OR shift = '') ORDER BY submitted_at DESC LIMIT 1`;
  return rows[0] ? asReport(rows[0] as Record<string, unknown>) : null;
}

export async function pgReopenReport(id: string) {
  await pgReady();
  await sql()`UPDATE reports SET reopened = TRUE WHERE id = ${id}`;
  return pgGetReport(id);
}

export async function pgListDrafts(type?: ItemType | null) {
  await pgReady();
  const db = sql();
  const rows = type
    ? await db`SELECT * FROM drafts WHERE type = ${type} ORDER BY updated_at DESC`
    : await db`SELECT * FROM drafts ORDER BY updated_at DESC`;
  return rows.map((row) => asDraft(row as Record<string, unknown>));
}

export async function pgGetDraft(type: ItemType, date: string, shift?: Shift | null) {
  await pgReady();
  if (type === "prep" && shift) {
    const rows = await sql()`SELECT * FROM drafts WHERE type = ${type} AND date = ${date} AND shift = ${shift} LIMIT 1`;
    if (rows[0]) return asDraft(rows[0] as Record<string, unknown>);
    if (shift === "day") {
      const legacy = await sql()`SELECT * FROM drafts WHERE type = ${type} AND date = ${date} AND (shift IS NULL OR shift = '') LIMIT 1`;
      return legacy[0] ? asDraft(legacy[0] as Record<string, unknown>) : null;
    }
    return null;
  }
  const rows = await sql()`SELECT * FROM drafts WHERE type = ${type} AND date = ${date} AND (shift IS NULL OR shift = '') LIMIT 1`;
  return rows[0] ? asDraft(rows[0] as Record<string, unknown>) : null;
}

export async function pgUpsertDraft(draft: DraftSheet) {
  await pgReady();
  await sql()`INSERT INTO drafts (id, type, date, updated_at, submitted_by, lines, shift)
    VALUES (${draft.id}, ${draft.type}, ${draft.date}, ${draft.updatedAt}, ${draft.submittedBy}, ${JSON.stringify(draft.lines)}, ${draft.shift || null})
    ON CONFLICT (id) DO UPDATE SET
      updated_at = EXCLUDED.updated_at,
      submitted_by = EXCLUDED.submitted_by,
      lines = EXCLUDED.lines,
      shift = EXCLUDED.shift`;
  return draft;
}

export async function pgDeleteDraftById(id: string) {
  await pgReady();
  await sql()`DELETE FROM drafts WHERE id = ${id}`;
}

export async function pgClearDraft(type: ItemType, date: string, shift?: Shift | null) {
  await pgReady();
  if (type === "prep" && shift) {
    if (shift === "day") {
      await sql()`DELETE FROM drafts WHERE type = ${type} AND date = ${date} AND (shift = 'day' OR shift IS NULL OR shift = '')`;
    } else {
      await sql()`DELETE FROM drafts WHERE type = ${type} AND date = ${date} AND shift = ${shift}`;
    }
    return;
  }
  await sql()`DELETE FROM drafts WHERE type = ${type} AND date = ${date} AND (shift IS NULL OR shift = '')`;
}

export async function pgApplyCounts(type: ItemType, lines: ReportLine[]) {
  const savedAt = new Date().toISOString();
  for (const line of lines) {
    const item = await pgGetItem(line.itemId);
    if (!item) continue;
    if (type === "prep") {
      item.lastOnHand = qtyAmount(line.onHand) + qtyAmount(line.madeToday);
      item.lastMadeToday = qtyAmount(line.madeToday);
    } else {
      item.lastOnHand = qtyAmount(line.onHand);
      item.lastOrderQty = qtyAmount(line.orderQty);
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

function asVendorSetting(row: Record<string, unknown>): VendorSetting {
  return {
    name: String(row.name),
    contactName: row.contact_name ? String(row.contact_name) : "",
    phone: row.phone ? String(row.phone) : "",
    email: row.email ? String(row.email) : "",
    uploadToken: String(row.upload_token),
  };
}

function asPriceList(row: Record<string, unknown>): VendorPriceList {
  return {
    id: String(row.id),
    vendor: String(row.vendor),
    month: String(row.month),
    uploadedAt: String(row.uploaded_at),
    uploadedBy: String(row.uploaded_by),
    fileName: String(row.file_name),
    lines: parseJson(row.lines) || [],
  };
}

function asPriceRecord(row: Record<string, unknown>): PriceRecord {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    month: String(row.month),
    vendor: String(row.vendor),
    uploadedBy: String(row.uploaded_by),
    fileName: String(row.file_name),
    changes: parseJson(row.changes) || [],
    snapshot: parseJson(row.snapshot) || [],
  };
}

export async function pgListVendorSettings() {
  await pgReady();
  const rows = await sql()`SELECT * FROM vendor_settings ORDER BY name`;
  return rows.map((row) => asVendorSetting(row as Record<string, unknown>));
}

export async function pgUpdateVendorSetting(name: string, patch: Partial<VendorSetting>) {
  const settings = await pgListVendorSettings();
  const current = settings.find((entry) => entry.name === name) || {
    name,
    contactName: "",
    phone: "",
    email: "",
    uploadToken: crypto.randomUUID(),
  };
  const next = { ...current, ...patch, name };
  await sql()`INSERT INTO vendor_settings (name, email, contact_name, phone, upload_token)
    VALUES (${next.name}, ${next.email || ""}, ${next.contactName || ""}, ${next.phone || ""}, ${next.uploadToken})
    ON CONFLICT (name) DO UPDATE SET
      email = EXCLUDED.email,
      contact_name = EXCLUDED.contact_name,
      phone = EXCLUDED.phone`;
  return next;
}

export async function pgDeleteVendorSetting(name: string) {
  await pgReady();
  if ((VENDORS as readonly string[]).includes(name)) return false;
  await sql()`DELETE FROM vendor_settings WHERE name = ${name}`;
  return true;
}

export async function pgListPriceLists(vendor?: string | null) {
  await pgReady();
  const db = sql();
  const rows = vendor
    ? await db`SELECT * FROM price_lists WHERE vendor = ${vendor} ORDER BY month DESC, uploaded_at DESC`
    : await db`SELECT * FROM price_lists ORDER BY month DESC, uploaded_at DESC`;
  return rows.map((row) => asPriceList(row as Record<string, unknown>));
}

export async function pgUpsertPriceList(list: VendorPriceList) {
  await pgReady();
  await sql()`INSERT INTO price_lists (id, vendor, month, uploaded_at, uploaded_by, file_name, lines)
    VALUES (${list.id}, ${list.vendor}, ${list.month}, ${list.uploadedAt}, ${list.uploadedBy}, ${list.fileName}, ${JSON.stringify(list.lines)})
    ON CONFLICT (id) DO UPDATE SET
      uploaded_at = EXCLUDED.uploaded_at,
      uploaded_by = EXCLUDED.uploaded_by,
      file_name = EXCLUDED.file_name,
      lines = EXCLUDED.lines`;
  return list;
}

export async function pgDeletePriceList(id: string) {
  await pgReady();
  await sql()`DELETE FROM price_lists WHERE id = ${id}`;
}

export async function pgListPriceRecords(vendor?: string | null) {
  await pgReady();
  const db = sql();
  const rows = vendor
    ? await db`SELECT * FROM price_records WHERE vendor = ${vendor} ORDER BY created_at DESC`
    : await db`SELECT * FROM price_records ORDER BY created_at DESC`;
  return rows.map((row) => asPriceRecord(row as Record<string, unknown>));
}

export async function pgCreatePriceRecord(record: PriceRecord) {
  await pgReady();
  await sql()`INSERT INTO price_records (id, created_at, month, vendor, uploaded_by, file_name, changes, snapshot)
    VALUES (
      ${record.id}, ${record.createdAt}, ${record.month}, ${record.vendor}, ${record.uploadedBy},
      ${record.fileName}, ${JSON.stringify(record.changes)}, ${JSON.stringify(record.snapshot)}
    )`;
  return record;
}

export async function pgDeletePriceRecord(id: string) {
  await pgReady();
  await sql()`DELETE FROM price_records WHERE id = ${id}`;
}
