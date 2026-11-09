import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import type {
  Database,
  DraftSheet,
  InventoryItem,
  ItemType,
  PriceRecord,
  PriceSignal,
  Recipe,
  Report,
  ReportLine,
  Shift,
  VendorPriceLine,
  VendorPriceList,
  VendorSetting,
} from "./types";
import { compareOrderingItems, prepCategoryForRecipe, VENDORS } from "./catalog";
import { comparePriceLists, matchPriceLines, normalizePriceName } from "./prices";
import { qtyAmount } from "./qty";
import { draftId } from "./shift";
import { seedItems, seedRecipes, syncCatalog, syncRecipes } from "./seed";
import {
  databaseUrl,
  pgApplyCounts,
  pgClearDraft,
  pgCreateItem,
  pgCreateRecipe,
  pgCreateReport,
  pgDeleteDraftById,
  pgDeleteItem,
  pgDeleteReport,
  pgDeleteRecipe,
  pgGetDraft,
  pgGetItem,
  pgGetRecipe,
  pgFindLatestSent,
  pgGetReport,
  pgListDrafts,
  pgListItems,
  pgListRecipes,
  pgListReports,
  pgListSheets,
  pgReopenReport,
  pgUpdateItem,
  pgUpdateRecipe,
  pgUpsertDraft,
  pgCreatePriceRecord,
  pgDeletePriceList,
  pgDeletePriceRecord,
  pgListPriceLists,
  pgListPriceRecords,
  pgDeleteVendorSetting,
  pgListVendorSettings,
  pgUpdateVendorSetting,
  pgUpsertPriceList,
} from "./store-pg";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

export function usingPostgres() {
  return Boolean(databaseUrl());
}

function emptyDb(): Database {
  return { items: [], reports: [], drafts: [], recipes: [], vendorSettings: [], priceLists: [], priceRecords: [] };
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
      vendorSettings: [],
      priceLists: [],
      priceRecords: [],
    };
    ensureVendorSettings(seeded.vendorSettings || []);
    persist(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(readFileSync(dbPath, "utf8")) as Database;
    parsed.items ||= [];
    parsed.reports ||= [];
    parsed.drafts ||= [];
    parsed.recipes ||= [];
    parsed.vendorSettings ||= [];
    parsed.priceLists ||= [];
    parsed.priceRecords ||= [];
    let changed = false;
    if (parsed.items.length === 0) {
      parsed.items = seedItems();
      changed = true;
    }
    if (parsed.recipes.length === 0) {
      parsed.recipes = seedRecipes();
      changed = true;
    }
    if (syncCatalog(parsed.items).changed) changed = true;
    if (syncRecipes(parsed.recipes).changed) changed = true;
    if (ensureVendorSettings(parsed.vendorSettings).changed) changed = true;
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
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.type === "ordering") return compareOrderingItems(a, b);
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });
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

export async function ensurePrepForRecipe(name: string, category: string) {
  const items = await listItems("prep");
  const match = items.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (match) return { item: match, created: false };
  const created = {
    id: crypto.randomUUID(),
    type: "prep" as const,
    name: name.trim(),
    category: prepCategoryForRecipe(category),
    unit: "each",
    par: 0,
    createdAt: new Date().toISOString(),
  };
  await createItem(created);
  return { item: created, created: true };
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

export async function deleteReport(id: string) {
  if (usingPostgres()) return pgDeleteReport(id);
  writeFileDb((db) => {
    db.reports = db.reports.filter((report) => report.id !== id);
  });
}

export async function deleteDraftById(id: string) {
  if (usingPostgres()) return pgDeleteDraftById(id);
  writeFileDb((db) => {
    db.drafts = db.drafts.filter((draft) => draft.id !== id);
  });
}

export async function deleteSheet(id: string) {
  await deleteReport(id);
  await deleteDraftById(id);
}

export function isTestSheet(sheet: { submittedBy?: string; lines?: { name?: string }[] }) {
  const by = (sheet.submittedBy || "").toLowerCase();
  if (by.includes("test")) return true;
  return (sheet.lines || []).some((line) => /^test[\s-]/i.test(line.name || ""));
}

export async function deleteTestRecords() {
  const sheets = await listSheets();
  let removed = 0;
  for (const sheet of sheets) {
    if (!isTestSheet(sheet)) continue;
    await deleteSheet(sheet.id);
    removed += 1;
  }
  const items = await listItems();
  let itemsRemoved = 0;
  for (const item of items) {
    if (!/^test[\s-]/i.test(item.name)) continue;
    await deleteItem(item.id);
    itemsRemoved += 1;
  }
  return { removed, itemsRemoved };
}

function sameSheet(report: Report, type: ItemType, date: string, shift?: Shift | null) {
  if (report.type !== type || report.date !== date) return false;
  if (type === "prep") return (report.shift || "day") === (shift || "day");
  return !report.shift;
}

export async function findLatestSent(type: ItemType, date: string, shift?: Shift | null) {
  if (usingPostgres()) return pgFindLatestSent(type, date, shift);
  return (
    readFileDb()
      .reports.filter((report) => sameSheet(report, type, date, shift))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] || null
  );
}

export async function reopenReport(id: string) {
  if (usingPostgres()) return pgReopenReport(id);
  let updated: Report | null = null;
  writeFileDb((db) => {
    const report = db.reports.find((entry) => entry.id === id);
    if (!report) return;
    report.reopened = true;
    updated = report;
  });
  return updated;
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

export async function getDraft(type: ItemType, date: string, shift?: Shift | null) {
  if (usingPostgres()) return pgGetDraft(type, date, shift);
  const drafts = readFileDb().drafts;
  if (type === "prep" && shift) {
    return (
      drafts.find((draft) => draft.type === type && draft.date === date && draft.shift === shift) ||
      (shift === "day" ? drafts.find((draft) => draft.type === type && draft.date === date && !draft.shift) : null) ||
      null
    );
  }
  return drafts.find((draft) => draft.type === type && draft.date === date && !draft.shift) || null;
}

export async function upsertDraft(input: {
  type: ItemType;
  date: string;
  submittedBy: string;
  lines: ReportLine[];
  shift?: Shift | null;
}): Promise<DraftSheet> {
  const draft: DraftSheet = {
    id: draftId(input.type, input.date, input.shift),
    type: input.type,
    date: input.date,
    updatedAt: new Date().toISOString(),
    submittedBy: input.submittedBy,
    status: "draft",
    shift: input.type === "prep" ? input.shift || "day" : undefined,
    lines: input.lines,
  };
  if (usingPostgres()) {
    await pgUpsertDraft(draft);
  } else {
    writeFileDb((db) => {
      db.drafts = db.drafts.filter((entry) => entry.id !== draft.id);
      if (draft.type === "prep" && draft.shift) {
        db.drafts = db.drafts.filter(
          (entry) => !(entry.type === draft.type && entry.date === draft.date && (entry.shift || "day") === draft.shift)
        );
      } else {
        db.drafts = db.drafts.filter((entry) => !(entry.type === draft.type && entry.date === draft.date && !entry.shift));
      }
      db.drafts.unshift(draft);
    });
  }
  await applyCountsToItems(input.type, input.lines);
  return draft;
}

export async function clearDraft(type: ItemType, date: string, shift?: Shift | null) {
  if (usingPostgres()) return pgClearDraft(type, date, shift);
  writeFileDb((db) => {
    db.drafts = db.drafts.filter((draft) => {
      if (draft.type !== type || draft.date !== date) return true;
      if (type === "prep" && shift) return (draft.shift || "day") !== shift;
      return false;
    });
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
        item.lastOnHand = qtyAmount(line.onHand) + qtyAmount(line.madeToday);
        item.lastMadeToday = qtyAmount(line.madeToday);
      } else {
        item.lastOnHand = qtyAmount(line.onHand);
        item.lastOrderQty = qtyAmount(line.orderQty);
      }
      item.lastSavedAt = savedAt;
    }
  });
}

function ensureVendorSettings(settings: VendorSetting[]) {
  let changed = false;
  const byName = new Map(settings.map((entry) => [entry.name, entry]));
  for (const name of VENDORS) {
    const existing = byName.get(name);
    if (!existing) {
      settings.push({ name, email: "", contactName: "", phone: "", uploadToken: crypto.randomUUID() });
      changed = true;
    } else if (!existing.uploadToken) {
      existing.uploadToken = crypto.randomUUID();
      changed = true;
    }
  }
  return { changed };
}

export async function listVendorSettings() {
  if (usingPostgres()) return pgListVendorSettings();
  const db = readFileDb();
  ensureVendorSettings(db.vendorSettings || []);
  return [...(db.vendorSettings || [])];
}

export async function updateVendorSetting(name: string, patch: Partial<VendorSetting>) {
  if (usingPostgres()) return pgUpdateVendorSetting(name, patch);
  let updated: VendorSetting | null = null;
  writeFileDb((db) => {
    db.vendorSettings ||= [];
    ensureVendorSettings(db.vendorSettings);
    const target = db.vendorSettings.find((entry) => entry.name === name);
    if (!target) {
      const created: VendorSetting = {
        contactName: "",
        phone: "",
        email: "",
        uploadToken: crypto.randomUUID(),
        ...patch,
        name,
      };
      db.vendorSettings.push(created);
      updated = created;
      return;
    }
    Object.assign(target, patch);
    updated = target;
  });
  return updated;
}

export async function deleteVendorSetting(name: string) {
  if ((VENDORS as readonly string[]).includes(name)) return false;
  if (usingPostgres()) return pgDeleteVendorSetting(name);
  writeFileDb((db) => {
    db.vendorSettings = (db.vendorSettings || []).filter((entry) => entry.name !== name);
  });
  return true;
}

export async function getVendorByToken(token: string) {
  const settings = await listVendorSettings();
  return settings.find((entry) => entry.uploadToken === token) || null;
}

export async function listPriceLists(vendor?: string | null) {
  if (usingPostgres()) return pgListPriceLists(vendor);
  return (readFileDb().priceLists || [])
    .filter((list) => (vendor ? list.vendor === vendor : true))
    .sort((a, b) => b.month.localeCompare(a.month) || b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function listPriceRecords(vendor?: string | null) {
  if (usingPostgres()) return pgListPriceRecords(vendor);
  return (readFileDb().priceRecords || [])
    .filter((record) => (vendor ? record.vendor === vendor : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deletePriceList(id: string) {
  if (usingPostgres()) return pgDeletePriceList(id);
  writeFileDb((db) => {
    db.priceLists = (db.priceLists || []).filter((list) => list.id !== id);
  });
}

export async function deletePriceRecord(id: string) {
  if (usingPostgres()) return pgDeletePriceRecord(id);
  writeFileDb((db) => {
    db.priceRecords = (db.priceRecords || []).filter((record) => record.id !== id);
  });
}

function previousListFor(lists: VendorPriceList[], vendor: string, month: string) {
  return lists
    .filter((list) => list.vendor === vendor && list.month < month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];
}

export async function importVendorPrices(input: {
  vendor: string;
  month: string;
  uploadedBy: string;
  fileName: string;
  lines: VendorPriceLine[];
}) {
  const items = await listItems("ordering");
  const matched = matchPriceLines(input.lines, items, input.vendor);
  const lists = await listPriceLists(input.vendor);
  const previous = previousListFor(lists, input.vendor, input.month);
  const changes = previous ? comparePriceLists(input.vendor, previous.lines, matched) : [];
  const list: VendorPriceList = {
    id: `${input.vendor}-${input.month}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    vendor: input.vendor,
    month: input.month,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
    fileName: input.fileName,
    lines: matched,
  };
  let record: PriceRecord | null = null;
  if (changes.length) {
    record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      month: input.month,
      vendor: input.vendor,
      uploadedBy: input.uploadedBy,
      fileName: input.fileName,
      changes,
      snapshot: matched,
    };
  }
  if (usingPostgres()) {
    await pgUpsertPriceList(list);
    if (record) await pgCreatePriceRecord(record);
  } else {
    writeFileDb((db) => {
      db.priceLists = (db.priceLists || []).filter((entry) => !(entry.vendor === list.vendor && entry.month === list.month));
      db.priceLists.unshift(list);
      if (record) {
        db.priceRecords ||= [];
        db.priceRecords.unshift(record);
      }
    });
  }
  return { list, record, changes, previousMonth: previous?.month || null };
}

export async function priceSignals() {
  const lists = await listPriceLists();
  const latestByVendor = new Map<string, VendorPriceList>();
  for (const list of lists) {
    const current = latestByVendor.get(list.vendor);
    if (!current || list.month > current.month) latestByVendor.set(list.vendor, list);
  }
  const signals: Record<string, PriceSignal> = {};
  for (const [vendor, latest] of latestByVendor) {
    const previous = previousListFor(lists, vendor, latest.month);
    const prevMap = new Map((previous?.lines || []).map((line) => [normalizePriceName(line.name), line]));
    for (const line of latest.lines) {
      if (!line.itemId) continue;
      const before = prevMap.get(normalizePriceName(line.name));
      let direction: PriceSignal["direction"] = previous ? "same" : null;
      if (before && before.price !== line.price) direction = line.price > before.price ? "up" : "down";
      signals[line.itemId] = {
        current: line.price,
        previous: before?.price ?? null,
        direction,
      };
    }
  }
  return signals;
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
