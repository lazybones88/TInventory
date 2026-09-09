import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import type { Database } from "./types";
import { seedItems, seedRecipes } from "./seed";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

function emptyDb(): Database {
  return { items: [], reports: [], recipes: [] };
}

function ensureSeeded(db: Database): Database {
  let changed = false;
  if (db.items.length === 0) {
    db.items = seedItems();
    changed = true;
  }
  if (db.recipes.length === 0) {
    db.recipes = seedRecipes();
    changed = true;
  }
  if (changed) persist(db);
  return db;
}

export function readDb(): Database {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    const seeded: Database = {
      items: seedItems(),
      reports: [],
      recipes: seedRecipes(),
    };
    persist(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(readFileSync(dbPath, "utf8")) as Database;
    parsed.items ||= [];
    parsed.reports ||= [];
    parsed.recipes ||= [];
    return ensureSeeded(parsed);
  } catch {
    const fallback = emptyDb();
    return ensureSeeded(fallback);
  }
}

export function persist(db: Database) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const tmp = `${dbPath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  renameSync(tmp, dbPath);
}

export function updateDb(mutator: (db: Database) => void): Database {
  const db = readDb();
  mutator(db);
  persist(db);
  return db;
}
