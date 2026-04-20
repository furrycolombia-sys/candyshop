#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import { loadEnv } from "./load-env.mjs";

function parseArgs(argv) {
  const parsed = {
    env: "prod",
    email: "furrycolombia@gmail.com",
    role: "admin",
    reason: "Provision account after reset",
    nequiPhone: "300-555-1234",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env") {
      parsed.env = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--email") {
      parsed.email = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--role") {
      parsed.role = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--reason") {
      parsed.reason = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--nequi-phone") {
      parsed.nequiPhone = argv[i + 1];
      i += 1;
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
      "Usage: node scripts/provision-account.mjs [options]",
      "",
      "Options:",
      "  --env <name>           Target env file (default: prod)",
      "  --email <email>        User email to provision (default: furrycolombia@gmail.com)",
      "  --role <role>          Role template for grant-user-role (default: admin)",
      "  --reason <text>        Reason stored in permission grants",
      "  --nequi-phone <phone>  Phone rendered in Nequi payment instructions",
      "",
      "Example:",
      "  node scripts/provision-account.mjs --env prod --email furrycolombia@gmail.com --nequi-phone 3001234567",
    ].join("\n"),
  );
}

function fail(message) {
  console.error(`[provision-account] ${message}`);
  process.exit(1);
}

function runNodeScript(scriptPath, args, env) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) {
    fail(`Script failed: ${scriptPath}`);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response
    .json()
    .catch(() => ({ message: response.statusText }));

  if (!response.ok) {
    throw new Error(
      payload?.message || `HTTP ${response.status} on ${new URL(url).pathname}`,
    );
  }

  return payload;
}

async function getSellerId({ supabaseUrl, serviceRoleKey, email }) {
  const params = new URLSearchParams({
    select: "id,email",
    email: `eq.${email.toLowerCase()}`,
    limit: "1",
  });
  const url = `${supabaseUrl}/rest/v1/user_profiles?${params.toString()}`;
  const rows = await requestJson(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!rows[0]?.id) {
    throw new Error(
      `No user_profiles row found for ${email}. The user must sign in first.`,
    );
  }
  return rows[0].id;
}

async function upsertNequiMethod({
  supabaseUrl,
  serviceRoleKey,
  sellerId,
  nequiPhone,
}) {
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  const displayBlocks = [
    {
      id: "nequi-instructions",
      type: "text",
      content_en: `Send to Nequi: ${nequiPhone} (Furry Colombia)`,
      content_es: `Enviar por Nequi: ${nequiPhone} (Furry Colombia)`,
    },
  ];

  const formFields = [
    {
      id: "nequi-transfer-reference",
      type: "text",
      label_en: "Nequi Transfer Reference",
      label_es: "Referencia de transferencia Nequi",
      placeholder_en: "Example: 1234567890",
      placeholder_es: "Ejemplo: 1234567890",
      required: true,
    },
  ];

  const findParams = new URLSearchParams({
    select: "id,name_en",
    seller_id: `eq.${sellerId}`,
    name_en: "ilike.*Nequi*",
  });

  const existing = await requestJson(
    `${supabaseUrl}/rest/v1/seller_payment_methods?${findParams.toString()}`,
    { headers },
  );

  const body = {
    seller_id: sellerId,
    name_en: "Nequi",
    name_es: "Nequi",
    display_blocks: displayBlocks,
    form_fields: formFields,
    is_active: true,
    sort_order: 0,
  };

  if (existing.length > 0) {
    const id = existing[0].id;
    const updateParams = new URLSearchParams({ id: `eq.${id}` });
    await requestJson(
      `${supabaseUrl}/rest/v1/seller_payment_methods?${updateParams.toString()}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
        body: JSON.stringify(body),
      },
    );
    return { id, action: "updated" };
  }

  const created = await requestJson(`${supabaseUrl}/rest/v1/seller_payment_methods`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  return { id: created[0]?.id, action: "created" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  loadEnv(args.env);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const childEnv = {
    ...process.env,
    TARGET_ENV: args.env,
    SELLER_EMAIL: args.email,
  };

  console.log(`[provision-account] Env: ${args.env}`);
  console.log(`[provision-account] Email: ${args.email}`);

  // 1) Grant role via existing script
  runNodeScript(
    "./scripts/grant-user-role.mjs",
    [
      "--email",
      args.email,
      "--role",
      args.role,
      "--reason",
      args.reason,
    ],
    childEnv,
  );

  // 2) Restore Moonfest content via existing script
  runNodeScript("./scripts/seed-moonfest.mjs", [], childEnv);

  // 3) Ensure Nequi payment method exists for seller
  const sellerId = await getSellerId({ supabaseUrl, serviceRoleKey, email: args.email });
  const nequiResult = await upsertNequiMethod({
    supabaseUrl,
    serviceRoleKey,
    sellerId,
    nequiPhone: args.nequiPhone,
  });

  console.log(
    `[provision-account] Nequi method ${nequiResult.action}: ${nequiResult.id}`,
  );
  console.log("[provision-account] Provisioning complete.");
}

main().catch((error) => {
  fail(error.message);
});

