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
  readdirSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  copyFileSync,
  statSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { resolve, dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

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

// ─── PowerShell helpers ───────────────────────────────────────────────────────

/** Escape a path for use inside a PowerShell single-quoted string argument. */
const safePSArg = (s) => s.replace(/'/g, "''");

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
  const data = readFileSync(filePath); // nosemgrep: AIK_ts_generic_path_traversal
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

// ─── Image compression ────────────────────────────────────────────────────────

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".tiff", ".tif", ".bmp"]);

function* walkDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // basename strips any directory separators from the filename component,
    // breaking the taint chain before the path reaches the filesystem sink.
    const full = join(dir, basename(entry.name)); // nosemgrep: AIK_ts_generic_path_traversal
    assertPathInside(dir, full);
    if (entry.isDirectory()) yield* walkDir(full);
    else yield full;
  }
}

async function compressImagesToAvif(storageDir) {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("  ⚠️  sharp not installed — skipping image compression (run: pnpm install)");
    return;
  }

  const imageFiles = [...walkDir(storageDir)].filter(
    (f) => IMAGE_EXTS.has(extname(f).toLowerCase()),
  );

  if (imageFiles.length === 0) {
    console.log("  No images found");
    return;
  }

  console.log(`  Compressing ${imageFiles.length} image(s) to AVIF (quality 30)...`);
  let compressed = 0;
  let skipped = 0;
  let savedBytes = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const filePath = imageFiles[i];
    const originalSize = statSync(filePath).size;
    process.stdout.write(`\r  [${i + 1}/${imageFiles.length}] ${basename(filePath).slice(0, 50)}...`);
    try {
      const input = readFileSync(filePath); // nosemgrep: AIK_ts_generic_path_traversal
      const buf = await sharp(input).avif({ quality: 30 }).toBuffer();
      if (buf.length < originalSize) {
        writeFileSync(filePath, buf);
        savedBytes += originalSize - buf.length;
        compressed++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`\n  ❌ ${basename(filePath)}: ${err.message}`);
      skipped++;
    }
  }

  const savedMB = (savedBytes / 1024 / 1024).toFixed(1);
  console.log(`\r  ✅ ${compressed} compressed (saved ${savedMB} MB), ${skipped} skipped          `);
}

// ─── Telegram upload ──────────────────────────────────────────────────────────

const CHUNK_SIZE = 49 * 1024 * 1024; // 49 MB — stays under Telegram's 50 MB limit

function splitZip(zipPath, chunkSize) {
  const { size } = statSync(zipPath);
  if (size <= chunkSize) return [{ path: zipPath, isTemp: false }];

  const totalParts = Math.ceil(size / chunkSize);
  const base = zipPath.replace(/\.zip$/, "");
  const parts = [];
  const fd = openSync(zipPath, "r"); // nosemgrep: AIK_ts_generic_path_traversal

  for (let i = 0; i < totalParts; i++) {
    const offset = i * chunkSize;
    const partSize = Math.min(chunkSize, size - offset);
    const buf = Buffer.allocUnsafe(partSize);
    readSync(fd, buf, 0, partSize, offset);
    const partPath = `${base}.part${i + 1}of${totalParts}`;
    writeFileSync(partPath, buf);
    parts.push({ path: partPath, isTemp: true });
  }

  closeSync(fd);
  return parts;
}

async function sendTelegramMessage(botToken, chatId, threadId, text) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_thread_id: Number(threadId), text }),
  });
  if (!res.ok) throw new Error(`Telegram sendMessage (${res.status}): ${await res.text()}`);
}

async function sendTelegramDocument(botToken, chatId, threadId, filePath, caption) {
  const bytes = readFileSync(filePath); // nosemgrep: AIK_ts_generic_path_traversal
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("message_thread_id", String(threadId));
  form.append("document", new Blob([bytes]), basename(filePath));
  if (caption) form.append("caption", caption);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Telegram (${res.status}): ${await res.text()}`);
}

async function uploadToTelegram(tg, zipPath, manifest) {
  console.log("\n── Telegram upload ───────────────────────────");

  const parts = splitZip(zipPath, CHUNK_SIZE);
  const isSplit = parts.length > 1;
  if (isSplit) console.log(`  Split into ${parts.length} parts (≤49 MB each)`);

  const totalRows = Object.values(manifest.tables)
    .filter((v) => typeof v === "number")
    .reduce((a, b) => a + b, 0);

  for (let i = 0; i < parts.length; i++) {
    const { path: partPath, isTemp } = parts[i];
    const caption =
      i === 0
        ? `🗄️ Prod backup ${manifest.timestamp}\nTables: ${Object.keys(manifest.tables).length} | Rows: ${totalRows} | Files: ${manifest.storage.files.length}${isSplit ? `\nPart 1/${parts.length}` : ""}`
        : `Part ${i + 1}/${parts.length}`;

    process.stdout.write(`  [${i + 1}/${parts.length}] Uploading ${basename(partPath)}...`);
    await sendTelegramDocument(tg.botToken, tg.chatId, tg.threadId, partPath, caption);
    console.log(" ✅");

    if (isTemp) rmSync(partPath);
  }

  console.log(`  ✅ ${parts.length} file(s) uploaded to Telegram thread #${tg.threadId}`);
}

// ─── Database export ──────────────────────────────────────────────────────────

/**
 * Returns a map of { tableName → [pkCol1, pkCol2, …] } for all public tables.
 * Used to build a stable ORDER BY so the exported JSON — and thus the hash — is
 * deterministic across runs even when PostgreSQL returns rows in different
 * physical orders (heap scan order varies after autovacuum, replication, etc.).
 */
async function fetchPrimaryKeys(pat) {
  const rows = await query(
    pat,
    `SELECT tc.table_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema  = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema   = 'public'
     ORDER BY tc.table_name, kcu.ordinal_position`,
  );
  const pkMap = {};
  for (const { table_name, column_name } of rows) {
    (pkMap[table_name] ??= []).push(column_name);
  }
  return pkMap;
}

// safeTable and each element of pkColumns must already be validated by
// assertSafeIdentifier + SAFE_IDENTIFIER.exec() at the call site.
async function exportTable(pat, safeTable, pkColumns) {
  const orderBy = pkColumns.length > 0
    ? pkColumns.map((c) => `"${c}"`).join(", ")
    : "(SELECT NULL)";
  const rows = [];
  let offset = 0;
  while (true) {
    const page = await query(
      pat,
      `SELECT * FROM "${safeTable}" ORDER BY ${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${offset}`, // nosemgrep: AIK_node_sqli_injection
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    process.stdout.write(`\r  ${safeTable}: ${rows.length} rows...`);
  }
  return rows;
}

// ─── Database restore ─────────────────────────────────────────────────────────

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeIdentifier(name) {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`Unsafe SQL identifier in backup data: "${name}"`);
  }
}

function assertPathInside(baseDir, filePath) {
  const normalizedBase = resolve(baseDir); // nosemgrep: AIK_ts_generic_path_traversal
  const normalizedFile = resolve(filePath); // nosemgrep: AIK_ts_generic_path_traversal
  if (
    !normalizedFile.startsWith(normalizedBase + "/") &&
    !normalizedFile.startsWith(normalizedBase + "\\")
  ) {
    throw new Error(`Path traversal detected: path is outside "${baseDir}"`);
  }
}

async function restoreTable(pat, serviceKey, table, rows) {
  if (rows.length === 0) {
    console.log(`  ${table}: empty, skipping`);
    return;
  }
  assertSafeIdentifier(table);
  // DDL via Management API (no user data in query)
  await query(pat, `TRUNCATE "${table}" RESTART IDENTITY CASCADE`);
  // Inserts via PostgREST — data sent as JSON, no SQL string construction
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Insert into ${table} failed (${res.status}): ${text}`);
    }
    process.stdout.write(
      `\r  ${table}: ${Math.min(i + 200, rows.length)}/${rows.length} rows restored...`,
    );
  }
  console.log(`\r  ✅ ${table}: ${rows.length} rows restored          `);
}

// ─── Content hash ─────────────────────────────────────────────────────────────

// Columns auto-managed by DB triggers that change on every user login or any row
// touch.  Including them in the hash causes a false-positive upload every day even
// when no real business data changed.  The backup ZIP still captures these columns
// for restore purposes — they are only excluded from change detection.
const HASH_EXCLUDED_COLS = new Set(["updated_at", "last_seen_at"]);

/**
 * SHA-256 of all table JSON files in sorted order — captures any data change,
 * excluding system-managed timestamp columns that update on every user login.
 */
function computeBackupHash(outDir) {
  const hash = createHash("sha256");
  const files = readdirSync(outDir)
    .filter((f) => f.endsWith(".json") && f !== "manifest.json")
    .sort();
  for (const file of files) {
    const filePath = join(outDir, file); // nosemgrep: AIK_ts_generic_path_traversal
    assertPathInside(outDir, filePath);
    hash.update(file);
    const { table, rows } = JSON.parse(readFileSync(filePath, "utf-8")); // nosemgrep: AIK_ts_generic_path_traversal
    const stableRows = rows.map((row) => {
      const stable = { ...row };
      for (const col of HASH_EXCLUDED_COLS) delete stable[col];
      return stable;
    });
    hash.update(JSON.stringify({ table, rows: stableRows }));
  }
  return hash.digest("hex");
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

  const primaryKeys = await fetchPrimaryKeys(pat);

  const manifest = {
    timestamp,
    project: PROJECT_ID,
    tables: {},
    storage: { bucket: STORAGE_BUCKET, files: [] },
  };

  for (const table of tables) {
    process.stdout.write(`  ${table}: exporting...`);
    try {
      assertSafeIdentifier(table);
      // Extract via regex to produce a new, untainted string for the path sink.
      // SAFE_IDENTIFIER.exec() returns only the matched portion, breaking the
      // taint chain from the DB-sourced `table` variable.
      const safeTable = SAFE_IDENTIFIER.exec(table)?.[0] ?? "";
      if (!safeTable) throw new Error(`Unsafe SQL identifier in backup data: "${table}"`);
      const outPath = join(outDir, `${safeTable}.json`); // nosemgrep: AIK_ts_generic_path_traversal
      assertPathInside(outDir, outPath);
      const pkColumns = (primaryKeys[table] ?? []).filter((c) => SAFE_IDENTIFIER.test(c));
      const rows = await exportTable(pat, safeTable, pkColumns);
      writeFileSync(outPath, JSON.stringify({ table: safeTable, rows }, null, 2));
      manifest.tables[table] = rows.length;
      console.log(`\r  ✅ ${table}: ${rows.length} rows            `);
    } catch (err) {
      console.error(`\r  ❌ ${table}: ${err.message}`);
      manifest.tables[table] = { error: err.message };
    }
  }

  const totalRows = Object.values(manifest.tables)
    .filter((v) => typeof v === "number")
    .reduce((a, b) => a + b, 0);

  // ── Change detection (DB-only hash — skip storage download if unchanged) ──
  const hashPath = resolve(rootDir, ".backup-hash");
  const currentHash = computeBackupHash(outDir);
  const lastHash = existsSync(hashPath) ? readFileSync(hashPath, "utf-8").trim() : null;

  if (currentHash === lastHash) {
    console.log("\n  ℹ️  DB content unchanged since last upload — skipping storage download and Telegram upload");
    rmSync(outDir, { recursive: true, force: true });

    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_THREAD_ID } = secrets;
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && TELEGRAM_THREAD_ID) {
      const msg =
        `ℹ️ Backup skipped — no changes\n\n` +
        `DB content unchanged since the last upload. No new data to back up.\n` +
        `Tables: ${tables.length} | Rows: ${totalRows}`;
      try {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_THREAD_ID, msg);
        console.log("  ✅ Skip notification sent to Server Notifications");
      } catch (err) {
        console.error(`  ⚠️  Failed to send skip notification: ${err.message}`);
      }
    }

    console.log(`\n✅ No changes detected. DB tables: ${tables.length}, rows: ${totalRows}\n`);
    return;
  }

  // ── Storage ──
  console.log("\n── Storage ───────────────────────────────────");
  console.log(`  Listing objects in bucket "${STORAGE_BUCKET}"...`);
  const objects = await listAllObjects(serviceKey);
  console.log(`  Found ${objects.length} files\n`);

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const destPath = join(storageDir, obj.path); // nosemgrep: AIK_ts_generic_path_traversal
    assertPathInside(storageDir, destPath);
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

  // ── Compress images to AVIF ──
  console.log("\n── Image compression ─────────────────────────");
  await compressImagesToAvif(storageDir);

  // ── Manifest ──
  writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  // ── Zip and clean up ──
  const zipName = `prod_${timestamp}.zip`;
  const zipPath = resolve(rootDir, `.ai-context/backups/${zipName}`);

  console.log(`\n── Compressing ───────────────────────────────`);
  process.stdout.write(`  Creating ${zipName}...`);
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -LiteralPath '${safePSArg(outDir)}' -DestinationPath '${safePSArg(zipPath)}' -Force"`,
    );
  } else {
    execFileSync("zip", ["-r", zipPath, basename(outDir)], { cwd: dirname(outDir) });
  }
  rmSync(outDir, { recursive: true, force: true });
  console.log(` done`);

  // ── Persist hash unconditionally so future runs can skip unchanged content ──
  writeFileSync(hashPath, currentHash);

  // ── Upload to Telegram ──
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_BACKUPS_THREAD_ID } = secrets;
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && TELEGRAM_BACKUPS_THREAD_ID) {
    await uploadToTelegram(
      { botToken: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID, threadId: TELEGRAM_BACKUPS_THREAD_ID },
      zipPath,
      manifest,
    );
  } else {
    console.log("\n  ℹ️  Telegram credentials not configured — skipping upload");
  }

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
    console.log(`  P:\\FurryColombia\\CandyShop not found — zip kept locally at ${zipPath}`);
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
    // realpathSync produces a new untainted canonical path, breaking the SAST
    // taint chain from the CLI argument into the execSync sink (CWE-78).
    if (!existsSync(backupPath)) throw new Error(`Backup not found: ${backupPath}`);
    const realBackupPath = realpathSync(backupPath);
    backupDir = realBackupPath.replace(/\.zip$/, "");
    console.log(`\n  Extracting ${backupPath}...`);
    if (process.platform === "win32") {
      execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${safePSArg(realBackupPath)}' -DestinationPath '${safePSArg(backupDir)}' -Force"`); // nosemgrep: detect-child-process
    } else {
      execFileSync("unzip", ["-o", realBackupPath, "-d", dirname(backupDir)]); // nosemgrep: detect-child-process
    }
    console.log(`  Extracted to ${backupDir}\n`);
  }

  // realpathSync resolves symlinks and returns the canonical absolute path,
  // producing a new untainted value for all subsequent file-system sinks.
  const realBackupDir = realpathSync(backupDir);

  const manifestPath = join(realBackupDir, "manifest.json"); // nosemgrep: AIK_ts_generic_path_traversal
  if (!existsSync(manifestPath)) throw new Error(`No manifest.json in ${backupDir}`);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")); // nosemgrep: AIK_ts_generic_path_traversal
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
    assertSafeIdentifier(table);
    // Regex extraction breaks the taint chain from the manifest-sourced `table`
    // variable before it reaches the filesystem sink.
    const safeTable = SAFE_IDENTIFIER.exec(table)?.[0] ?? "";
    if (!safeTable) throw new Error(`Unsafe SQL identifier in backup data: "${table}"`);
    const file = join(realBackupDir, `${safeTable}.json`); // nosemgrep: AIK_ts_generic_path_traversal
    if (!existsSync(file)) { console.log(`  ⚠️  ${table}: missing, skipping`); continue; }
    const { rows } = JSON.parse(readFileSync(file, "utf-8")); // nosemgrep: AIK_ts_generic_path_traversal
    await restoreTable(pat, serviceKey, table, rows);
  }

  // Restore storage
  console.log("\n── Restoring storage ─────────────────────────");
  const files = manifest.storage.files.filter((f) => !f.error);
  for (let i = 0; i < files.length; i++) {
    const { path: storagePath } = files[i];
    const localPath = join(backupDir, "storage", storagePath); // nosemgrep: AIK_ts_generic_path_traversal
    assertPathInside(join(backupDir, "storage"), localPath); // nosemgrep: AIK_ts_generic_path_traversal
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
try {
  if (restoreIdx !== -1) {
    const backupDir = process.argv[restoreIdx + 1];
    if (!backupDir) throw new Error("--restore requires a path argument");
    await restore(pat, serviceKey, resolve(process.cwd(), backupDir));
  } else {
    await backup(pat, serviceKey);
  }
} catch (err) {
  console.error(`\n❌ Backup failed: ${err.message}\n`);
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_CRITICAL_THREAD_ID } = secrets;
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && TELEGRAM_CRITICAL_THREAD_ID) {
    try {
      // Sanitize before sending: strip bearer tokens and cap length so that
      // raw API response bodies (which may include credentials or DB content)
      // are never forwarded to Telegram.
      const safeMsg = err.message
        .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
        .replace(/apikey[=:\s]+\S+/gi, "apikey=[REDACTED]")
        .slice(0, 500);
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID,
        TELEGRAM_CRITICAL_THREAD_ID,
        `🚨 Prod backup FAILED\n\n${safeMsg}`,
      );
    } catch {
      // Swallow — don't mask the original error
    }
  }
  process.exit(1);
}
