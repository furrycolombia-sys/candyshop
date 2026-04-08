/* eslint-disable i18next/no-literal-string, unicorn/prefer-ternary */
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORBIDDEN_ERROR = "Forbidden";
const INVALID_PAYLOAD_ERROR = "Invalid payload";
const USER_PERMISSIONS_READ = "user_permissions.read";
const USER_PERMISSIONS_CREATE = "user_permissions.create";
const USER_PERMISSIONS_DELETE = "user_permissions.delete";
const RETURN_MINIMAL = "return=minimal";
const MERGE_DUPLICATES_RETURN_MINIMAL =
  "resolution=merge-duplicates,return=minimal";
const BAD_REQUEST_STATUS = 400;
const INTERNAL_SERVER_ERROR_STATUS = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GrantedPermissionRow = {
  expires_at: string | null;
  resource_permission_id: string;
  resource_permissions: { permissions: { key: string } };
};

function getRestHeaders() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin REST client is not configured");
  }

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function getRestUrl(path: string) {
  if (!supabaseUrl) {
    throw new Error("Supabase URL is not configured");
  }

  return `${supabaseUrl}/rest/v1/${path}`;
}

function createRestPath(
  table: string,
  query: Record<string, string | readonly string[]> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
      continue;
    }

    for (const item of value) {
      searchParams.append(key, item);
    }
  }

  const serialized = searchParams.toString();
  return serialized ? `${table}?${serialized}` : table;
}

function validateUserId(userId: string) {
  if (!UUID_PATTERN.test(userId)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return userId;
}

async function adminFetch(path: string, init?: RequestInit) {
  const response = await fetch(getRestUrl(path), {
    ...init,
    headers: {
      ...getRestHeaders(),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Admin API failed for ${path}`);
  }

  return response;
}

function getActiveGrantedPermissions(rows: GrantedPermissionRow[]) {
  const now = Date.now();

  return rows
    .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
    .map((row) => ({
      key: row.resource_permissions.permissions.key,
      resourcePermissionId: row.resource_permission_id,
    }));
}

async function fetchGrantedPermissions(
  userId: string,
): Promise<Array<{ key: string; resourcePermissionId: string }>> {
  const response = await adminFetch(
    createRestPath("user_permissions", {
      user_id: `eq.${validateUserId(userId)}`,
      mode: "eq.grant",
      select:
        "expires_at,resource_permission_id,resource_permissions!inner(permissions!inner(key))",
    }),
  );

  return getActiveGrantedPermissions(
    (await response.json()) as GrantedPermissionRow[],
  );
}

async function fetchGrantedPermissionKeys(userId: string): Promise<string[]> {
  return (await fetchGrantedPermissions(userId)).map((row) => row.key);
}

async function findResourcePermissionId(
  permissionKey: string,
): Promise<string> {
  const permissionResponse = await adminFetch(
    createRestPath("permissions", {
      key: `eq.${permissionKey}`,
      select: "id",
    }),
  );
  const permissions = (await permissionResponse.json()) as Array<{
    id: string;
  }>;
  const permissionId = permissions[0]?.id;

  if (!permissionId) {
    throw new Error(`Unknown permission key: ${permissionKey}`);
  }

  const resourceResponse = await adminFetch(
    createRestPath("resource_permissions", {
      permission_id: `eq.${permissionId}`,
      select: "id,resource_id",
    }),
  );
  const rows = (await resourceResponse.json()) as Array<{
    id: string;
    resource_id: string | null;
  }>;

  const preferred = rows.find((row) => row.resource_id === null) ?? rows[0];
  if (!preferred) {
    throw new Error(`No resource permission found for key: ${permissionKey}`);
  }

  return preferred.id;
}

async function grantPermissions(
  userId: string,
  resourcePermissionIds: readonly string[],
  grantedBy: string,
) {
  if (resourcePermissionIds.length === 0) {
    return;
  }

  await adminFetch(
    "user_permissions?on_conflict=user_id,resource_permission_id",
    {
      method: "POST",
      headers: {
        Prefer: MERGE_DUPLICATES_RETURN_MINIMAL,
      },
      body: JSON.stringify(
        resourcePermissionIds.map((resourcePermissionId) => ({
          user_id: validateUserId(userId),
          resource_permission_id: resourcePermissionId,
          mode: "grant",
          granted_by: grantedBy,
          reason: "Admin UI",
        })),
      ),
    },
  );
}

async function grantPermission(
  userId: string,
  permissionKey: string,
  grantedBy: string,
) {
  const resourcePermissionId = await findResourcePermissionId(permissionKey);
  await grantPermissions(userId, [resourcePermissionId], grantedBy);
}

async function revokePermissions(
  userId: string,
  resourcePermissionIds: readonly string[],
) {
  if (resourcePermissionIds.length === 0) {
    return;
  }

  await adminFetch(
    createRestPath("user_permissions", {
      user_id: `eq.${validateUserId(userId)}`,
      resource_permission_id: `in.(${resourcePermissionIds.join(",")})`,
    }),
    {
      method: "DELETE",
      headers: {
        Prefer: RETURN_MINIMAL,
      },
    },
  );
}

async function revokePermission(userId: string, permissionKey: string) {
  const resourcePermissionId = await findResourcePermissionId(permissionKey);
  await revokePermissions(userId, [resourcePermissionId]);
}

async function replacePermissions(
  userId: string,
  permissionKeys: string[],
  grantedBy: string,
) {
  const validatedUserId = validateUserId(userId);
  const desiredKeys = [...new Set(permissionKeys)];
  const [currentPermissions, desiredResourcePermissionIds] = await Promise.all([
    fetchGrantedPermissions(validatedUserId),
    Promise.all(desiredKeys.map((key) => findResourcePermissionId(key))),
  ]);

  const currentByKey = new Map(
    currentPermissions.map((permission) => [
      permission.key,
      permission.resourcePermissionId,
    ]),
  );
  const desiredByKey = new Map(
    desiredKeys.map((key, index) => [key, desiredResourcePermissionIds[index]]),
  );

  const resourcePermissionIdsToGrant = desiredKeys
    .filter((key) => !currentByKey.has(key))
    .map((key) => desiredByKey.get(key))
    .filter(Boolean) as string[];
  const resourcePermissionIdsToRevoke = currentPermissions
    .filter((permission) => !desiredByKey.has(permission.key))
    .map((permission) => permission.resourcePermissionId);

  await revokePermissions(validatedUserId, resourcePermissionIdsToRevoke);
  await grantPermissions(
    validatedUserId,
    resourcePermissionIdsToGrant,
    grantedBy,
  );
}

async function getAuthorizedAdmin(requiredKeys: string[]) {
  const sessionSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!user) return null;

  const grantedKeys = await fetchGrantedPermissionKeys(user.id);
  const authorized = requiredKeys.every((key) => grantedKeys.includes(key));

  return authorized ? user.id : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUserId = await getAuthorizedAdmin([USER_PERMISSIONS_READ]);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  try {
    const { userId } = await context.params;
    const grantedKeys = await fetchGrantedPermissionKeys(
      validateUserId(userId),
    );

    return NextResponse.json({ grantedKeys });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === INVALID_PAYLOAD_ERROR
            ? INVALID_PAYLOAD_ERROR
            : "Failed to load user permissions",
      },
      {
        status:
          error instanceof Error && error.message === INVALID_PAYLOAD_ERROR
            ? BAD_REQUEST_STATUS
            : INTERNAL_SERVER_ERROR_STATUS,
      },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { permissionKey, grant } = (await request.json()) as {
    permissionKey?: string;
    grant?: boolean;
  };

  if (!permissionKey || typeof grant !== "boolean") {
    return NextResponse.json({ error: INVALID_PAYLOAD_ERROR }, { status: 400 });
  }

  const requiredKeys = grant
    ? [USER_PERMISSIONS_CREATE]
    : [USER_PERMISSIONS_DELETE];
  const adminUserId = await getAuthorizedAdmin(requiredKeys);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  try {
    const { userId } = await context.params;
    const validatedUserId = validateUserId(userId);

    if (grant) {
      await grantPermission(validatedUserId, permissionKey, adminUserId);
    } else {
      await revokePermission(validatedUserId, permissionKey);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === INVALID_PAYLOAD_ERROR
            ? INVALID_PAYLOAD_ERROR
            : "Failed to update permission",
      },
      {
        status:
          error instanceof Error && error.message === INVALID_PAYLOAD_ERROR
            ? BAD_REQUEST_STATUS
            : INTERNAL_SERVER_ERROR_STATUS,
      },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUserId = await getAuthorizedAdmin([
    USER_PERMISSIONS_CREATE,
    USER_PERMISSIONS_DELETE,
  ]);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  const { permissionKeys } = (await request.json()) as {
    permissionKeys?: string[];
  };

  if (!Array.isArray(permissionKeys)) {
    return NextResponse.json({ error: INVALID_PAYLOAD_ERROR }, { status: 400 });
  }

  try {
    const { userId } = await context.params;
    await replacePermissions(
      validateUserId(userId),
      permissionKeys,
      adminUserId,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === INVALID_PAYLOAD_ERROR
            ? INVALID_PAYLOAD_ERROR
            : "Failed to apply permission template",
      },
      {
        status:
          error instanceof Error && error.message === INVALID_PAYLOAD_ERROR
            ? BAD_REQUEST_STATUS
            : INTERNAL_SERVER_ERROR_STATUS,
      },
    );
  }
}
