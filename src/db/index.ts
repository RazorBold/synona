import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/synona.db";

function createConnection() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);

  // PRAGMA wajib — lihat PRD-TEKNIS.md §4.2
  sqlite.pragma("journal_mode = WAL"); // pembaca tidak memblokir penulis
  sqlite.pragma("foreign_keys = ON"); // SQLite mematikannya secara default
  sqlite.pragma("busy_timeout = 5000"); // antre, jangan langsung SQLITE_BUSY
  sqlite.pragma("synchronous = NORMAL"); // aman + cepat saat WAL
  sqlite.pragma("cache_size = -64000"); // 64 MB page cache

  return drizzle(sqlite, { schema });
}

/**
 * Singleton: hot reload Next.js membuat modul dievaluasi ulang, dan tiap
 * evaluasi akan membuka file handle baru ke DB kalau tidak di-cache.
 */
const globalForDb = globalThis as unknown as {
  __synonaDb?: ReturnType<typeof createConnection>;
};

export const db = globalForDb.__synonaDb ?? createConnection();

if (process.env.NODE_ENV !== "production") globalForDb.__synonaDb = db;

export { schema };
