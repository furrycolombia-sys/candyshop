import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

// Load root .env.example (defaults) and .env (overrides)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require("./load-root-env.js");
loadRootEnv();

const SPEC_PATH = resolve("specs", "openapi.yaml");
const EXAMPLES_ROOT = resolve("specs", "examples");
const OPENAPI_URL = process.env.ORVAL_OPENAPI_URL || "";
const API_BASE_URL = buildApiBaseUrl();
const GLOBAL_PATH_PARAMS = {
  tenant: process.env.SYNC_OPENAPI_TENANT ||
    process.env.NEXT_PUBLIC_TENANT ||
    "default",
};

const PATH_PARAM_OVERRIDES = parseJsonEnv("OPENAPI_PATH_PARAM_OVERRIDES");
const QUERY_PARAM_OVERRIDES = parseJsonEnv("OPENAPI_QUERY_PARAM_OVERRIDES");
const USER_PARAMS_PATH = resolve("specs", "openai-params.json");
const USER_PARAMS_DEFAULT = {
  OPENAPI_PATH_PARAM_OVERRIDES: {},
  missingParams: {},
};

const args = new Set(process.argv.slice(2));
const onlyFetch = args.has("--fetch-only");
const onlyProcess = args.has("--process-only");

function buildApiBaseUrl() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const prefix = process.env.NEXT_PUBLIC_API_PREFIX || "";
  if (!prefix) {
    return apiUrl;
  }

  const normalizedPrefix = prefix.startsWith("/")
    ? prefix
    : `/${prefix}`;
  return `${apiUrl}${normalizedPrefix}`.replace(/\/+$/, "");
}

function parseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(
      `[refresh-openapi-mocks] Ignoring invalid JSON in ${name}: ${error}`,
    );
    return {};
  }
}

async function loadUserParams() {
  try {
    const raw = await readFile(USER_PARAMS_PATH, "utf8");
    const parsed = JSON.parse(raw) ?? {};
    return {
      OPENAPI_PATH_PARAM_OVERRIDES:
        parsed.OPENAPI_PATH_PARAM_OVERRIDES ?? {},
      missingParams: parsed.missingParams ?? {},
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      await mkdir(dirname(USER_PARAMS_PATH), { recursive: true });
      await writeFile(
        USER_PARAMS_PATH,
        JSON.stringify(USER_PARAMS_DEFAULT, null, 2) + "\n",
        "utf8",
      );
      return { ...USER_PARAMS_DEFAULT };
    }
    throw error;
  }
}

async function saveUserParams(params) {
  const output = {
    ...USER_PARAMS_DEFAULT,
    ...params,
    OPENAPI_PATH_PARAM_OVERRIDES: {
      ...USER_PARAMS_DEFAULT.OPENAPI_PATH_PARAM_OVERRIDES,
      ...params.OPENAPI_PATH_PARAM_OVERRIDES,
    },
    missingParams: {
      ...USER_PARAMS_DEFAULT.missingParams,
      ...params.missingParams,
    },
  };
  await mkdir(dirname(USER_PARAMS_PATH), { recursive: true });
  await writeFile(USER_PARAMS_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
}

async function runGit(args) {
  return new Promise((resolveCommand, reject) => {
    const child = spawn("git", args ?? [], { stdio: "inherit" });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`git ${(args ?? []).join(" ")} exited with ${code}`));
        return;
      }
      resolveCommand();
    });
  });
}

async function runGitOutput(args) {
  return new Promise((resolveCommand, reject) => {
    const child = spawn("git", args ?? []);
    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`git ${(args ?? []).join(" ")} exited with ${code}: ${stderr}`));
        return;
      }
      resolveCommand(stdout);
    });
  });
}

async function runPnpm(args) {
  return new Promise((resolveCommand, reject) => {
    const child = spawn("pnpm", args ?? [], { stdio: "inherit", shell: true });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pnpm ${(args ?? []).join(" ")} exited with ${code}`));
        return;
      }
      resolveCommand();
    });
  });
}

async function discardGeneratedTimestampOnlyChanges() {
  const generatedRoots = [
    "packages/api/src/rest/generated",
    "packages/api/src/rest/types/generated",
    "packages/api/src/graphql/generated",
  ];

  let changedFiles;
  try {
    const output = await runGitOutput([
      "diff",
      "--name-only",
      "--",
      ...generatedRoots,
    ]);
    changedFiles = output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn(
      `[refresh-openapi-mocks] Unable to inspect git diff for generated files: ${error}`,
    );
    return;
  }

  const timestampPattern = /Generated at:/;
  const allowedPrefixes = ["+++", "---", "@@ "];

  for (const file of changedFiles) {
    let diff;
    try {
      diff = await runGitOutput(["diff", "--unified=0", "--", file]);
    } catch (error) {
      console.warn(
        `[refresh-openapi-mocks] Unable to read diff for ${file}: ${error}`,
      );
      continue;
    }

    const changedLines = diff
      .split("\n")
      .filter((line) => line.startsWith("+") || line.startsWith("-"))
      .filter(
        (line) =>
          !allowedPrefixes.some((prefix) => line.startsWith(prefix)),
      );

    if (
      changedLines.length > 0 &&
      changedLines.every((line) => timestampPattern.test(line))
    ) {
      try {
        await runGit(["restore", "--", file]);
        console.log(
          `[refresh-openapi-mocks] Reverted timestamp-only change in ${file}`,
        );
      } catch (error) {
        console.warn(
          `[refresh-openapi-mocks] Unable to revert ${file}: ${error}`,
        );
      }
    }
  }
}

async function downloadSpecIfNeeded() {
  if (OPENAPI_URL && /^https?:\/\//i.test(OPENAPI_URL)) {
    console.log(`[refresh-openapi-mocks] Downloading spec from ${OPENAPI_URL}`);
    const response = await fetch(OPENAPI_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to download OpenAPI spec (${response.status} ${response.statusText})`,
      );
    }
    const data = await response.text();
    await mkdir(dirname(SPEC_PATH), { recursive: true });
    await writeFile(SPEC_PATH, data, "utf8");
  }
}

const FETCH_TIMEOUT_MS = Number(process.env.REFRESH_OPENAPI_TIMEOUT_MS || 10_000);

function sanitizePath(pathKey) {
  return pathKey
    .replaceAll('/', "_")
    .replaceAll(/[{}]/g, "")
    .replaceAll(/[^a-zA-Z0-9_-]/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "") || "root";
}

function combineOverrides(pathKey, ...sources) {
  const combined = {};
  for (const source of sources) {
    if (!source) {
      continue;
    }
    const scoped = source[pathKey];
    if (scoped && typeof scoped === "object") {
      Object.assign(combined, scoped);
    }
  }
  return combined;
}

function hasSchema(schema) {
  if (!schema) {
    return false;
  }
  if (typeof schema !== "object") {
    return true;
  }
  return Object.keys(schema).length > 0;
}

async function main() {
  const shouldFetch = !onlyProcess;
  const shouldProcess = !onlyFetch;

  if (shouldFetch) {
    await downloadSpecIfNeeded();
  }

  const userParams = await loadUserParams();

  let spec;
  let paths = {};
  if (shouldFetch) {
    const rawSpec = await readFile(SPEC_PATH, "utf8");
    spec = JSON.parse(rawSpec.replace(/^\uFEFF/, ""));
    paths = spec.paths ?? {};
  }

  const operationsToUpdate = [];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const pathParameters = pathItem.parameters ?? [];

    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === "parameters") {
        continue;
      }

      if (typeof operation !== "object" || operation === null) {
        continue;
      }

      if (method !== "get" && method !== "post") {
        continue;
      }

      if (operation.requestBody) {
        continue;
      }

      const responses = operation.responses ?? {};
      const successResponse = responses["200"];
      if (!successResponse) {
        continue;
      }

      const content = successResponse.content ?? {};
      const mediaType = content["application/json"] ?? {};
      const needsExample = !("example" in mediaType) || !hasSchema(mediaType.schema);

      if (!needsExample) {
        continue;
      }

      operationsToUpdate.push({
        pathKey,
        pathParameters,
        method,
        operation,
        successResponse,
      });
    }
  }

  if (operationsToUpdate.length === 0) {
    console.log("[refresh-openapi-mocks] No operations require example generation");
    if (shouldProcess) {
      await runPnpm(["exec", "orval"]);
      await discardGeneratedTimestampOnlyChanges();
    }
    return;
  }

  for (const candidate of operationsToUpdate) {
    const { pathKey, method, operation, successResponse } = candidate;

    const pathParams = collectParameters(
      [...candidate.pathParameters, ...(operation.parameters ?? [])],
      "path",
    );
    const queryParams = collectParameters(operation.parameters ?? [], "query");

    const pathOverrides = combineOverrides(
      pathKey,
      PATH_PARAM_OVERRIDES,
      userParams.OPENAPI_PATH_PARAM_OVERRIDES,
    );
    const pathResolution = buildParameterValues(
      pathParams,
      pathOverrides,
      GLOBAL_PATH_PARAMS,
    );

    if (!pathResolution.values) {
      const added = markMissingUserParams(
        userParams,
        pathKey,
        pathResolution.missing,
      );
      if (added) {
        await saveUserParams(userParams);
      }
      console.log(
        `[refresh-openapi-mocks] Skipping ${method.toUpperCase()} ${pathKey} because required path params missing: ${pathResolution.missing.join(
          ", ",
        )}`,
      );
      continue;
    }

    const queryOverrides = combineOverrides(
      pathKey,
      QUERY_PARAM_OVERRIDES,
      userParams.OPENAPI_PATH_PARAM_OVERRIDES,
    );
    const queryResolution = buildParameterValues(queryParams, queryOverrides, {});

    if (!queryResolution.values) {
      const added = markMissingUserParams(
        userParams,
        pathKey,
        queryResolution.missing,
      );
      if (added) {
        await saveUserParams(userParams);
      }
      console.log(
        `[refresh-openapi-mocks] Skipping ${method.toUpperCase()} ${pathKey} because required query params missing: ${queryResolution.missing.join(
          ", ",
        )}`,
      );
      continue;
    }

    const url = buildRequestUrl(
      pathKey,
      pathResolution.values,
      queryResolution.values ?? {},
    );

    const sanitizedPath = sanitizePath(pathKey);
    const exampleDir = resolve(EXAMPLES_ROOT, sanitizedPath);
    await mkdir(exampleDir, { recursive: true });

    const fileName = `${method.toLowerCase()}.json`;
    const filePath = resolve(exampleDir, fileName);
    const metaPath = `${filePath}.meta.json`;

    const overrideSnapshot = {
      path: cleanOverrides(pathOverrides),
      query: cleanOverrides(queryOverrides),
    };

    const cachedPayloadExists = await pathExists(filePath);
    const cachedMetaExists = await pathExists(metaPath);

    let metaMatch = false;
    if (cachedPayloadExists && cachedMetaExists) {
      const meta = await readJson(metaPath);
      metaMatch = overridesEqual(meta?.overrides, overrideSnapshot);
    }

    let shouldFetch = !metaMatch;
    if (!shouldFetch) {
      console.log(
        `[refresh-openapi-mocks] Cached example matches overrides for ${method.toUpperCase()} ${pathKey}, skipping fetch`,
      );
    }

    if (shouldFetch) {
      console.log(`[refresh-openapi-mocks] Fetching ${method.toUpperCase()} ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, FETCH_TIMEOUT_MS);

      let payload;
      try {
        const response = await fetch(url, {
          method: method.toUpperCase(),
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          console.log(
            `[refresh-openapi-mocks] Received ${response.status} from ${url}, skipping`,
          );
          continue;
        }
        payload = await response.json();
      } catch (error) {
        if (error.name === "AbortError") {
          console.log(
            `[refresh-openapi-mocks] Request to ${url} aborted after ${FETCH_TIMEOUT_MS}ms`,
          );
        } else {
          console.log(
            `[refresh-openapi-mocks] Error fetching ${url}: ${error}`,
          );
        }
        continue;
      } finally {
        clearTimeout(timeoutId);
      }

      await writeFile(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
      await writeFile(
        metaPath,
        JSON.stringify({ overrides: overrideSnapshot }, null, 2) + "\n",
        "utf8",
      );
    }

    const exampleRef = `./examples/${sanitizedPath}/${fileName}`;
    successResponse.content = {
      ...successResponse.content,
      "application/json": {
        ...successResponse.content?.["application/json"],
        example: { $ref: exampleRef },
      },
    };

    await persistSpec(spec);
  }

  if (shouldProcess) {
    await runPnpm(["exec", "orval"]);
    await discardGeneratedTimestampOnlyChanges();
  }
}

function collectParameters(parameters, location) {
  const seen = new Map();
  for (const parameter of parameters) {
    if (parameter.in !== location) {
      continue;
    }
    if (!seen.has(parameter.name)) {
      seen.set(parameter.name, parameter);
    }
  }
  return [...seen.values()];
}

function buildParameterValues(parameters, overrides, globals) {
  const values = {};
  const missing = [];

  for (const parameter of parameters) {
    const override = overrides?.[parameter.name];
    if (override !== undefined && override !== null) {
      values[parameter.name] = override;
      continue;
    }

    const globalOverride = globals?.[parameter.name];
    if (globalOverride !== undefined) {
      values[parameter.name] = globalOverride;
      continue;
    }

    if (parameter.required) {
      missing.push(parameter.name);
    }
  }

  return {
    values: missing.length > 0 ? null : values,
    missing,
  };
}

function markMissingUserParams(storage, pathKey, names) {
  if (names.length === 0) {
    return false;
  }

  const missingSection = storage.missingParams ?? {};
  const overridesSection = storage.OPENAPI_PATH_PARAM_OVERRIDES ?? {};
  const missingEntry = { ...missingSection[pathKey] };
  const overrideEntry = { ...overridesSection[pathKey] };

  let updated = false;

  for (const name of names) {
    if (!Object.prototype.hasOwnProperty.call(missingEntry, name)) {
      missingEntry[name] = null;
      updated = true;
    }
    if (!Object.prototype.hasOwnProperty.call(overrideEntry, name)) {
      overrideEntry[name] = null;
      updated = true;
    }
  }

  if (updated) {
    missingSection[pathKey] = missingEntry;
    overridesSection[pathKey] = overrideEntry;
    storage.missingParams = missingSection;
    storage.OPENAPI_PATH_PARAM_OVERRIDES = overridesSection;
  }

  return updated;
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function cleanOverrides(overrides) {
  if (!overrides) {
    return {};
  }
  const entries = Object.entries(overrides)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

function overridesEqual(a, b) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

async function readJson(target) {
  try {
    const raw = await readFile(target, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function persistSpec(spec) {
  await mkdir(dirname(SPEC_PATH), { recursive: true });
  await writeFile(SPEC_PATH, JSON.stringify(spec, null, 2) + "\n", "utf8");
  console.log("[refresh-openapi-mocks] Spec file updated with new examples");
}

function buildRequestUrl(pathKey, pathValues, queryValues) {
  const filledPath = pathKey.replaceAll(/\{([^}]+)\}/g, (_, name) => {
    const value = pathValues[name];
    return encodeURIComponent(String(value));
  });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(queryValues || {})) {
    if (value !== undefined) {
      query.append(key, String(value));
    }
  }

  const base = API_BASE_URL;
  const finalPath = `${filledPath.startsWith("/") ? "" : "/"}${filledPath}`;
  const url = `${base}${finalPath}`;
  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
}

main().catch((error) => {
  console.error("[refresh-openapi-mocks] Failed", error);
  process.exit(1);
});
