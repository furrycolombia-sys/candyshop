#!/usr/bin/env node
/**
 * Production full backup (database + storage) via Supabase APIs.
 *
 * Exports:
 *   - All public-schema table data  → {outDir}/{table}.json
 *   - All storage objects (receipts bucket) → {outDir}/storage/{path}
 *   - Manifest with row/file counts → {outDir}/manifest.json
 *
 * Output: .ai-context/backups/prod_YYYYMMDD_HHMMSS/
 *
 * Usage:
 *   node scripts/backup-prod.mjs
 *
 * Restore (database only — re-uploads storage files too):
 *   node scripts/backup-prod.mjs --restore .ai-context/backups/prod_YYYYMMDD_HHMMSS
 */

import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const PROJECT_ID = "olafyajipvsltohagiah";
const SUPABASE_URL = "https://olafyajipvsltohagiah.supabase.co";
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;
const STORAGE_BUCKET = "receipts";
const PAGE_SIZE = 1000;
const STORAGE_LIST_LIMIT = 100;

// ─── Parse .secrets ───────────────────────────────────────────────────────────

function parseSecrets() {
  const path = resolve(rootDir, ".secrets");
  if (!existsSync(path)) throw new Error(".secrets file not found");
  const vars = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

// ─── Management API query ─────────────────────────────────────────────────────

async function query(pat, sql) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Query failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function storageRequest(serviceKey, method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res;
}

/** Recursively list all objects under a prefix in the bucket. */
async function listAllObjects(serviceKey, prefix = "") {
  const objects = [];
  let offset = 0;
  while (true) {
    const res = await storageRequest(
      serviceKey,
      "POST",
      `/object/list/${STORAGE_BUCKET}`,
      { prefix, limit: STORAGE_LIST_LIMIT, offset, sortBy: { column: "name", order: "asc" } },
    );
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // It's a "folder" — recurse
        const children = await listAllObjects(serviceKey, fullPath);
        objects.push(...children);
      } else {
        objects.push({ path: fullPath, metadata: item.metadata, id: item.id });
      }
    }

    if (items.length < STORAGE_LIST_LIMIT) break;
    offset += STORAGE_LIST_LIMIT;
  }
  return objects;
}

/** Download a storage object and save to disk. */
async function downloadObject(serviceKey, storagePath, destPath) {
  const res = await storageRequest(
    serviceKey,
    "GET",
    `/object/${STORAGE_BUCKET}/${storagePath}`,
  );
  mkdirSync(dirname(destPath), { recursive: true });
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
}

/** Upload a file back to storage. */
async function uploadObject(serviceKey, storagePath, filePath) {
  const data = readFileSync(filePath);
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/octet-stream",
      },
      body: data,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    // If already exists, try upsert (PUT)
    if (res.status === 409) {
      const res2 = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/octet-stream",
          },
          body: data,
        },
      );
      if (!res2.ok) {
        throw new Error(`Upload failed (${res2.status}): ${await res2.text()}`);
      }
      return;
    }
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
}

// ─── Database export ──────────────────────────────────────────────────────────

async function exportTable(pat, table) {
  const rows = [];
  let offset = 0;
  while (true) {
    const page = await query(
      pat,
      `SELECT * FROM "${table}" ORDER BY (SELECT NULL) LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    process.stdout.write(`\r  ${table}: ${rows.length} rows...`);
  }
  return rows;
}

// ─── Database restore ─────────────────────────────────────────────────────────

function formatValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function restoreTable(pat, table, rows) {
  if (rows.length === 0) {
    console.log(`  ${table}: empty, skipping`);
    return;
  }
  await query(pat, `TRUNCATE "${table}" RESTART IDENTITY CASCADE`);
  const cols = Object.keys(rows[0]);
  const quoted = cols.map((c) => `"${c}"`).join(", ");
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const values = batch
      .map((row) => `(${cols.map((c) => formatValue(row[c])).join(", ")})`)
      .join(",\n");
    await query(pat, `INSERT INTO "${table}" (${quoted}) VALUES ${values}`);
    process.stdout.write(
      `\r  ${table}: ${Math.min(i + 200, rows.length)}/${rows.length} rows restored...`,
    );
  }
  console.log(`\r  ✅ ${table}: ${rows.length} rows restored          `);
}

// ─── Backup ───────────────────────────────────────────────────────────────────

async function backup(pat, serviceKey) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const outDir = resolve(rootDir, `.ai-context/backups/prod_${timestamp}`);
  const storageDir = join(outDir, "storage");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(storageDir, { recursive: true });

  console.log(`\n🗄️  Production full backup → ${outDir}\n`);

  // ── Database ──
  console.log("── Database ──────────────────────────────────");
  const tableRows = await query(
    pat,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  const tables = tableRows.map((r) => r.table_name);
  console.log(`Found ${tables.length} tables: ${tables.join(", ")}\n`);

  const manifest = {
    timestamp,
    project: PROJECT_ID,
    tables: {},
    storage: { bucket: STORAGE_BUCKET, files: [] },
  };

  for (const table of tables) {
    process.stdout.write(`  ${table}: exporting...`);
    try {
      const rows = await exportTable(pat, table);
      writeFileSync(
        resolve(outDir, `${table}.json`),
        JSON.stringify({ table, rows }, null, 2),
      );
      manifest.tables[table] = rows.length;
      console.log(`\r  ✅ ${table}: ${rows.length} rows            `);
    } catch (err) {
      console.error(`\r  ❌ ${table}: ${err.message}`);
      manifest.tables[table] = { error: err.message };
    }
  }

  // ── Storage ──
  console.log("\n── Storage ───────────────────────────────────");
  console.log(`  Listing objects in bucket "${STORAGE_BUCKET}"...`);
  const objects = await listAllObjects(serviceKey);
  console.log(`  Found ${objects.length} files\n`);

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const destPath = join(storageDir, obj.path);
    process.stdout.write(
      `\r  [${i + 1}/${objects.length}] ${obj.path.slice(0, 60)}...`,
    );
    try {
      await downloadObject(serviceKey, obj.path, destPath);
      manifest.storage.files.push({ path: obj.path, size: obj.metadata?.size ?? null });
    } catch (err) {
      console.error(`\n  ❌ ${obj.path}: ${err.message}`);
      manifest.storage.files.push({ path: obj.path, error: err.message });
    }
  }
  if (objects.length > 0) console.log(`\r  ✅ ${objects.length} files downloaded            `);

  // ── Manifest ──
  writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const totalRows = Object.values(manifest.tables)
    .filter((v) => typeof v === "number")
    .reduce((a, b) => a + b, 0);

  // ── Zip and clean up ──
  const zipName = `prod_${timestamp}.zip`;
  const zipPath = resolve(rootDir, `.ai-context/backups/${zipName}`);

  console.log(`\n── Compressing ───────────────────────────────`);
  process.stdout.write(`  Creating ${zipName}...`);
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force"`,
  );
  rmSync(outDir, { recursive: true, force: true });
  console.log(` done`);

  // ── Move to archive drive if available ──
  const archiveDir = "P:\\FurryColombia\\CandyShop";
  let finalPath = zipPath;
  if (existsSync(archiveDir)) {
    const dest = join(archiveDir, zipName);
    copyFileSync(zipPath, dest);
    rmSync(zipPath);
    finalPath = dest;
    console.log(`  Moved to ${dest}`);
  } else {
    console.log(`  P:\\FurryColombia\\CandyShop not found — zip kept locally`);
  }

  console.log(`\n✅ Backup complete: ${finalPath}`);
  console.log(`   DB tables: ${tables.length}, rows: ${totalRows}`);
  console.log(`   Storage files: ${objects.length}`);
  console.log(`\nTo restore: node scripts/backup-prod.mjs --restore ${finalPath}\n`);
}

// ─── Restore ──────────────────────────────────────────────────────────────────

async function restore(pat, serviceKey, backupPath) {
  // If given a zip, extract it first
  let backupDir = backupPath;
  if (backupPath.endsWith(".zip")) {
    backupDir = backupPath.replace(/\.zip$/, "");
    console.log(`\n  Extracting ${backupPath}...`);
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${backupPath}' -DestinationPath '${backupDir}' -Force"`,
    );
    console.log(`  Extracted to ${backupDir}\n`);
  }

  const manifestPath = resolve(backupDir, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`No manifest.json in ${backupDir}`);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  console.log(`\n⚠️  Restoring production from backup: ${manifest.timestamp}`);
  console.log(`   Project: ${manifest.project}`);
  console.log(`   DB tables: ${Object.keys(manifest.tables).length}`);
  console.log(`   Storage files: ${manifest.storage.files.length}`);
  console.log("\n   This will TRUNCATE all tables and re-upload all storage files.");
  console.log("   Press Ctrl+C within 10 seconds to abort...\n");
  await new Promise((r) => setTimeout(r, 10_000));

  // Restore DB
  console.log("── Restoring database ────────────────────────");
  for (const table of Object.keys(manifest.tables)) {
    const file = resolve(backupDir, `${table}.json`);
    if (!existsSync(file)) { console.log(`  ⚠️  ${table}: missing, skipping`); continue; }
    const { rows } = JSON.parse(readFileSync(file, "utf-8"));
    await restoreTable(pat, table, rows);
  }

  // Restore storage
  console.log("\n── Restoring storage ─────────────────────────");
  const files = manifest.storage.files.filter((f) => !f.error);
  for (let i = 0; i < files.length; i++) {
    const { path: storagePath } = files[i];
    const localPath = join(backupDir, "storage", storagePath);
    process.stdout.write(`\r  [${i + 1}/${files.length}] ${storagePath.slice(0, 60)}...`);
    if (!existsSync(localPath)) {
      console.log(`\n  ⚠️  ${storagePath}: local file missing, skipping`);
      continue;
    }
    try {
      await uploadObject(serviceKey, storagePath, localPath);
    } catch (err) {
      console.error(`\n  ❌ ${storagePath}: ${err.message}`);
    }
  }
  if (files.length > 0) console.log(`\r  ✅ ${files.length} files uploaded            `);

  console.log("\n✅ Restore complete\n");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const secrets = parseSecrets();
const pat = secrets.PROD_SUPABASE_ACCESS_TOKEN;
const serviceKey = secrets.PROD_SUPABASE_SERVICE_ROLE_KEY;
if (!pat) throw new Error("PROD_SUPABASE_ACCESS_TOKEN not found in .secrets");
if (!serviceKey) throw new Error("PROD_SUPABASE_SERVICE_ROLE_KEY not found in .secrets");

const restoreIdx = process.argv.indexOf("--restore");
if (restoreIdx !== -1) {
  const backupDir = process.argv[restoreIdx + 1];
  if (!backupDir) throw new Error("--restore requires a path argument");
  await restore(pat, serviceKey, resolve(process.cwd(), backupDir));
} else {
  await backup(pat, serviceKey);
}
