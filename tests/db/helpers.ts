import pg from "pg";

/**
 * Database-level test helpers.
 *
 * These talk to Postgres directly rather than through PostgREST, which is a
 * deliberate choice for this project: the local stack validates tokens against
 * Clerk's JWKS, so there is no secret a test could sign an `authenticated`
 * token with. Setting `request.jwt.claims` inside a transaction reaches the
 * same policies -- Libra's RLS reads `auth.jwt() ->> 'sub'` -- without needing
 * Clerk to be reachable, or a network round trip, at all.
 *
 * Every helper runs inside a transaction that is rolled back, so the suite
 * leaves the database exactly as it found it and tests may run in any order.
 */

/**
 * Where the database is, derived the way scripts/lib/supabase-config.mjs
 * derives it: the DB port is the API port plus one. Assembling it from parts
 * rather than hardcoding a URL means this follows whichever instance the
 * project is configured for, and keeps a literal connection string -- which a
 * secret scanner is right to flag on sight -- out of the repo.
 */
function databaseConfig(): pg.PoolConfig {
  if (process.env.SUPABASE_DB_URL) {
    return { connectionString: process.env.SUPABASE_DB_URL };
  }

  const apiPort = Number.parseInt(process.env.SUPABASE_PORT ?? "54321", 10);
  return {
    host: process.env.SUPABASE_DB_HOST ?? "localhost",
    port: Number.parseInt(
      process.env.SUPABASE_DB_PORT ?? String(apiPort + 1),
      10,
    ),
    user: process.env.SUPABASE_DB_USER ?? "postgres",
    password: process.env.SUPABASE_DB_PASSWORD ?? "postgres",
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
  };
}

let poolRef: pg.Pool | undefined;

const pool = (): pg.Pool => {
  poolRef ??= new pg.Pool(databaseConfig());
  return poolRef;
};

export async function closePool(): Promise<void> {
  await poolRef?.end();
  poolRef = undefined;
}

/**
 * Runs `fn` as the role a real request would produce, then rolls back:
 * `anon` with no claims when `sub` is null, `authenticated` carrying `sub`
 * otherwise.
 *
 * Never use this for privileged reads -- that is what `withSuperuser` is for.
 * A test that reads as `postgres` and claims to have proved something about a
 * client is the most common way this kind of suite ends up asserting nothing.
 */
export async function withClaims<T>(
  sub: string | null,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      sub === null ? null : JSON.stringify({ sub, role: "authenticated" }),
    ]);
    // Role names cannot be parameterised, hence the literal branch.
    await client.query(
      sub === null ? "set local role anon" : "set local role authenticated",
    );
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

/**
 * Rolled-back transaction with no role switch and no claims, for deliberately
 * privileged inspection of catalogs and columns no client can read.
 */
export async function withSuperuser<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

/**
 * Seeds fixtures as superuser and then reads them back as `authenticated`
 * carrying `sub`, all inside one rolled-back transaction.
 *
 * Two separate transactions cannot do this: the seed would roll back before
 * the client could see it. Switching role mid-transaction is what lets a test
 * prove "the owner still sees their own row" without leaving a row behind, or
 * depending on whatever the database happens to contain.
 */
export async function withSeededClaims<T>(
  sub: string,
  seed: (client: pg.PoolClient) => Promise<void>,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await seed(client);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub, role: "authenticated" }),
    ]);
    await client.query("set local role authenticated");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}
