import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require("./load-root-env.js");
loadRootEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ROLE_TEMPLATES = {
  buyer: [
    "products.read",
    "product_images.read",
    "product_reviews.create",
    "product_reviews.read",
    "product_reviews.update",
    "product_reviews.delete",
    "orders.create",
    "orders.read",
    "receipts.create",
    "receipts.delete",
  ],
  seller: [
    "products.read",
    "product_images.read",
    "product_reviews.read",
    "orders.read",
    "receipts.read",
    "products.create",
    "products.update",
    "products.delete",
    "product_images.create",
    "product_images.delete",
    "orders.update",
    "seller_payment_methods.create",
    "seller_payment_methods.read",
    "seller_payment_methods.update",
    "seller_payment_methods.delete",
  ],
  events: [
    "events.read",
    "events.create",
    "events.update",
    "events.delete",
    "check_ins.create",
    "check_ins.read",
    "check_ins.update",
  ],
};

ROLE_TEMPLATES.admin = [
  ...new Set([
    ...ROLE_TEMPLATES.buyer,
    ...ROLE_TEMPLATES.seller,
    ...ROLE_TEMPLATES.events,
    "payment_method_types.create",
    "payment_method_types.read",
    "payment_method_types.update",
    "payment_method_types.delete",
    "payment_settings.read",
    "payment_settings.update",
    "templates.create",
    "templates.read",
    "templates.update",
    "templates.delete",
    "audit.read",
    "user_permissions.create",
    "user_permissions.read",
    "user_permissions.update",
    "user_permissions.delete",
  ]),
];

function parseArgs(argv) {
  const parsed = {
    role: "admin",
    reason: "Script role grant",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--email") {
      parsed.email = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--role") {
      parsed.role = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--reason") {
      parsed.reason = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
  }

  return parsed;
}

function printUsage() {
  console.log(
    [
      'Usage: node scripts/grant-user-role.mjs --email user@example.com [--role admin|buyer|seller|events] [--reason "..."] [--dry-run]',
      "",
      "Examples:",
      "  node scripts/grant-user-role.mjs --email heinerangarita@gmail.com --role admin",
      "  node scripts/grant-user-role.mjs --email buyer@example.com --role buyer --dry-run",
    ].join("\n"),
  );
}

function assertEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured",
    );
  }
}

function adminHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function queryJson(pathname) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    headers: adminHeaders(),
  });
  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(payload.message || `Query failed: ${response.status}`);
  }
  return response.json();
}

async function insertJson(pathname, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    method: "POST",
    headers: adminHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates",
    }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(payload.message || `Insert failed: ${response.status}`);
  }
  return response.json();
}

async function findUserByEmail(email) {
  const normalizedEmail = encodeURIComponent(`eq.${email.toLowerCase()}`);
  const rows = await queryJson(
    `user_profiles?select=id,email&email=${normalizedEmail}&limit=1`,
  );
  return rows[0] ?? null;
}

async function getGlobalResourcePermissions() {
  const rows = await queryJson(
    "resource_permissions?resource_type=eq.global&select=id,permissions!inner(key)",
  );
  return rows.map((row) => ({
    id: row.id,
    key: row.permissions.key,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  assertEnv();

  if (!args.email) {
    printUsage();
    throw new Error("--email is required");
  }

  if (!(args.role in ROLE_TEMPLATES)) {
    throw new Error(
      `Unknown role "${args.role}". Expected one of: ${Object.keys(ROLE_TEMPLATES).join(", ")}`,
    );
  }

  const user = await findUserByEmail(args.email);
  if (!user) {
    throw new Error(`No user_profile found for ${args.email}`);
  }

  const templateKeys = ROLE_TEMPLATES[args.role];
  const globalPermissions = await getGlobalResourcePermissions();
  const resourcePermissionIds = globalPermissions
    .filter((row) => templateKeys.includes(row.key))
    .map((row) => row.id);

  if (resourcePermissionIds.length !== templateKeys.length) {
    const foundKeys = new Set(
      globalPermissions
        .filter((row) => resourcePermissionIds.includes(row.id))
        .map((row) => row.key),
    );
    const missing = templateKeys.filter((key) => !foundKeys.has(key));
    throw new Error(
      `Missing global resource permissions for: ${missing.join(", ")}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        email: args.email,
        userId: user.id,
        role: args.role,
        permissionCount: templateKeys.length,
        dryRun: args.dryRun,
      },
      null,
      2,
    ),
  );

  if (args.dryRun) return;

  const rows = resourcePermissionIds.map((resourcePermissionId) => ({
    user_id: user.id,
    resource_permission_id: resourcePermissionId,
    mode: "grant",
    granted_by: user.id,
    reason: args.reason,
  }));

  await insertJson(
    "user_permissions?on_conflict=user_id,resource_permission_id",
    rows,
  );
  console.log(
    `Granted ${templateKeys.length} ${args.role} permissions to ${args.email}`,
  );
}

main().catch((error) => {
  console.error(`[grant-user-role] ${error.message}`);
  process.exit(1);
});
