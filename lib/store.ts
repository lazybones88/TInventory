import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import type { Database, DraftSheet, InventoryItem, ItemType, Recipe, Report, ReportLine } from "./types";
import { seedItems, seedRecipes } from "./seed";
import {
  databaseUrl,
  pgApplyCounts,
  pgClearDraft,
  pgCreateItem,
  pgCreateRecipe,
  pgCreateReport,
  pgDeleteItem,
  pgDeleteRecipe,
  pgGetDraft,
  pgGetItem,
  pgGetRecipe,
  pgGetReport,
  pgListDrafts,
  pgListItems,
  pgListRecipes,
  pgListReports,
  pgListSheets,
  pgUpdateItem,
  pgUpdateRecipe,
  pgUpsertDraft,
} from "./store-pg";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

export function usingPostgres() {
  return Boolean(databaseUrl());
}

function emptyDb(): Database {
  return { items: [], reports: [], drafts: [], recipes: [] };
}

function persist(db: Database) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const tmp = `${dbPath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  renameSync(tmp, dbPath);
}

function readFileDb(): Database {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    const seeded: Database = {
      items: seedItems(),
      reports: [],
      drafts: [],
      recipes: seedRecipes(),
    };
    persist(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(readFileSync(dbPath, "utf8")) as Database;
    parsed.items ||= [];
    parsed.reports ||= [];
    parsed.drafts ||= [];
    parsed.recipes ||= [];
    let changed = false;
    if (parsed.items.length === 0) {
      parsed.items = seedItems();
      changed = true;
    }
    if (parsed.recipes.length === 0) {
      parsed.recipes = seedRecipes();
      changed = true;
    }
    if (changed) persist(parsed);
    return parsed;
  } catch {
    const fallback = emptyDb();
    fallback.items = seedItems();
    fallback.recipes = seedRecipes();
    persist(fallback);
    return fallback;
  }
}

function writeFileDb(mutator: (db: Database) => void) {
  const db = readFileDb();
  mutator(db);
  persist(db);
  return db;
}

export async function listItems(type?: ItemType | null) {
  if (usingPostgres()) return pgListItems(type);
  const items = readFileDb().items.filter((item) => (type ? item.type === type : true));
  return items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function getItem(id: string) {
  if (usingPostgres()) return pgGetItem(id);
  return readFileDb().items.find((item) => item.id === id) || null;
}

export async function createItem(item: InventoryItem) {
  if (usingPostgres()) return pgCreateItem(item);
  writeFileDb((db) => {
    db.items.push(item);
  });
  return item;
}

export async function updateItem(id: string, patch: Partial<InventoryItem>) {
  if (usingPostgres()) return pgUpdateItem(id, patch);
  let updated: InventoryItem | null = null;
  writeFileDb((db) => {
    const target = db.items.find((item) => item.id === id);
    if (!target) return;
    Object.assign(target, patch);
    updated = target;
  });
  return updated;
}

export async function deleteItem(id: string) {
  if (usingPostgres()) return pgDeleteItem(id);
  writeFileDb((db) => {
    db.items = db.items.filter((item) => item.id !== id);
  });
}

export async function listRecipes() {
  if (usingPostgres()) return pgListRecipes();
  return [...readFileDb().recipes].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function getRecipe(id: string) {
  if (usingPostgres()) return pgGetRecipe(id);
  return readFileDb().recipes.find((recipe) => recipe.id === id) || seedRecipes().find((recipe) => recipe.id === id) || null;
}

export async function createRecipe(recipe: Recipe) {
  if (usingPostgres()) return pgCreateRecipe(recipe);
  writeFileDb((db) => {
    db.recipes.push(recipe);
  });
  return recipe;
}

export async function updateRecipe(id: string, patch: Partial<Recipe>) {
  if (usingPostgres()) return pgUpdateRecipe(id, patch);
  let updated: Recipe | null = null;
  writeFileDb((db) => {
    const recipe = db.recipes.find((entry) => entry.id === id);
    if (!recipe) return;
    Object.assign(recipe, patch, { updatedAt: new Date().toISOString() });
    updated = recipe;
  });
  return updated;
}

export async function deleteRecipe(id: string) {
  if (usingPostgres()) return pgDeleteRecipe(id);
  writeFileDb((db) => {
    db.recipes = db.recipes.filter((recipe) => recipe.id !== id);
  });
}

export async function listReports(type?: string | null) {
  if (usingPostgres()) return pgListReports(type);
  return readFileDb()
    .reports.filter((report) => (type ? report.type === type : true))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getReport(id: string) {
  if (usingPostgres()) return pgGetReport(id);
  return readFileDb().reports.find((report) => report.id === id) || null;
}

export async function createReport(report: Report) {
  if (usingPostgres()) return pgCreateReport(report);
  writeFileDb((db) => {
    db.reports.unshift(report);
  });
  return report;
}

export async function listDrafts(type?: ItemType | null) {
  if (usingPostgres()) return pgListDrafts(type);
  return readFileDb()
    .drafts.filter((draft) => (type ? draft.type === type : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDraft(type: ItemType, date: string) {
  if (usingPostgres()) return pgGetDraft(type, date);
  return readFileDb().drafts.find((draft) => draft.type === type && draft.date === date) || null;
}

export async function upsertDraft(input: {
  type: ItemType;
  date: string;
  submittedBy: string;
  lines: ReportLine[];
}): Promise<DraftSheet> {
  const draft: DraftSheet = {
    id: `${input.type}-${input.date}`,
    type: input.type,
    date: input.date,
    updatedAt: new Date().toISOString(),
    submittedBy: input.submittedBy,
    status: "draft",
    lines: input.lines,
  };
  if (usingPostgres()) {
    await pgUpsertDraft(draft);
  } else {
    writeFileDb((db) => {
      db.drafts = db.drafts.filter((entry) => !(entry.type === input.type && entry.date === input.date));
      db.drafts.unshift(draft);
    });
  }
  await applyCountsToItems(input.type, input.lines);
  return draft;
}

export async function clearDraft(type: ItemType, date: string) {
  if (usingPostgres()) return pgClearDraft(type, date);
  writeFileDb((db) => {
    db.drafts = db.drafts.filter((draft) => !(draft.type === type && draft.date === date));
  });
}

export async function applyCountsToItems(type: ItemType, lines: ReportLine[]) {
  if (usingPostgres()) return pgApplyCounts(type, lines);
  const savedAt = new Date().toISOString();
  writeFileDb((db) => {
    for (const line of lines) {
      const item = db.items.find((entry) => entry.id === line.itemId);
      if (!item) continue;
      if (type === "prep") {
        item.lastOnHand = (Number(line.onHand) || 0) + (Number(line.madeToday) || 0);
        item.lastMadeToday = Number(line.madeToday) || 0;
      } else {
        item.lastOnHand = Number(line.onHand) || 0;
        item.lastOrderQty = Number(line.orderQty) || 0;
      }
      item.lastSavedAt = savedAt;
    }
  });
}

export async function listSheets() {
  if (usingPostgres()) return pgListSheets();
  const db = readFileDb();
  const sent = db.reports.map((report) => ({ ...report, status: "sent" as const }));
  return [...db.drafts, ...sent].sort((a, b) => {
    const aTime = "submittedAt" in a ? a.submittedAt : a.updatedAt;
    const bTime = "submittedAt" in b ? b.submittedAt : b.updatedAt;
    return bTime.localeCompare(aTime);
  });
}
