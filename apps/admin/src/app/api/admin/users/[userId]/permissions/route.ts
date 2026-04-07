import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function adminFetch(path: string, init?: RequestInit) {
  const response = await fetch(getRestUrl(path), {
    ...init,
    headers: {
      ...getRestHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Admin API failed for ${path}`);
  }

  return response;
}

async function fetchGrantedPermissionKeys(userId: string): Promise<string[]> {
  const response = await adminFetch(
    `user_permissions?user_id=eq.${userId}&mode=eq.grant&select=expires_at,resource_permissions!inner(permissions!inner(key))`,
  );

  const rows = (await response.json()) as Array<{
    expires_at: string | null;
    resource_permissions: { permissions: { key: string } };
  }>;

  const now = Date.now();

  return rows
    .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
    .map((row) => row.resource_permissions.permissions.key);
}

async function findResourcePermissionId(
  permissionKey: string,
): Promise<string> {
  const permissionResponse = await adminFetch(
    `permissions?key=eq.${encodeURIComponent(permissionKey)}&select=id`,
  );
  const permissions = (await permissionResponse.json()) as Array<{
    id: string;
  }>;
  const permissionId = permissions[0]?.id;

  if (!permissionId) {
    throw new Error(`Unknown permission key: ${permissionKey}`);
  }

  const resourceResponse = await adminFetch(
    `resource_permissions?permission_id=eq.${permissionId}&select=id,resource_id`,
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

async function grantPermission(
  userId: string,
  permissionKey: string,
  grantedBy: string,
) {
  const resourcePermissionId = await findResourcePermissionId(permissionKey);

  await adminFetch(
    "user_permissions?on_conflict=user_id,resource_permission_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          resource_permission_id: resourcePermissionId,
          mode: "grant",
          granted_by: grantedBy,
          reason: "Admin UI",
        },
      ]),
    },
  );
}

async function revokePermission(userId: string, permissionKey: string) {
  const resourcePermissionId = await findResourcePermissionId(permissionKey);

  await adminFetch(
    `user_permissions?user_id=eq.${userId}&resource_permission_id=eq.${resourcePermissionId}`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    },
  );
}

async function replacePermissions(
  userId: string,
  permissionKeys: string[],
  grantedBy: string,
) {
  await adminFetch(`user_permissions?user_id=eq.${userId}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  });

  for (const key of permissionKeys) {
    await grantPermission(userId, key, grantedBy);
  }
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
  const adminUserId = await getAuthorizedAdmin(["user_permissions.read"]);
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  const grantedKeys = await fetchGrantedPermissionKeys(userId);

  return NextResponse.json({ grantedKeys });
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
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const requiredKeys = grant
    ? ["user_permissions.create"]
    : ["user_permissions.delete"];
  const adminUserId = await getAuthorizedAdmin(requiredKeys);
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;

  if (grant) {
    await grantPermission(userId, permissionKey, adminUserId);
  } else {
    await revokePermission(userId, permissionKey);
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUserId = await getAuthorizedAdmin([
    "user_permissions.create",
    "user_permissions.delete",
  ]);
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  const { permissionKeys } = (await request.json()) as {
    permissionKeys?: string[];
  };

  if (!Array.isArray(permissionKeys)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await replacePermissions(userId, permissionKeys, adminUserId);

  return NextResponse.json({ ok: true });
}
