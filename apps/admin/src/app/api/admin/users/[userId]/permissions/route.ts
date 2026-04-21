/* eslint-disable i18next/no-literal-string, unicorn/prefer-ternary */
import { NextResponse } from "next/server";

import {
  adminFetch,
  BAD_REQUEST_STATUS,
  createRestPath,
  fetchGrantedPermissionKeys,
  fetchGrantedPermissions,
  FORBIDDEN_ERROR,
  getAuthorizedAdmin,
  INTERNAL_SERVER_ERROR_STATUS,
  INVALID_PAYLOAD_ERROR,
  MERGE_DUPLICATES_RETURN_MINIMAL,
  RETURN_MINIMAL,
  validateUuid,
} from "@/app/api/admin/_shared/adminRest";

const USER_PERMISSIONS_READ = "user_permissions.read";
const USER_PERMISSIONS_CREATE = "user_permissions.create";
const USER_PERMISSIONS_DELETE = "user_permissions.delete";

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
          user_id: validateUuid(userId),
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
      user_id: `eq.${validateUuid(userId)}`,
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
  const validatedUserId = validateUuid(userId);
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

  await Promise.all([
    revokePermissions(validatedUserId, resourcePermissionIdsToRevoke),
    grantPermissions(validatedUserId, resourcePermissionIdsToGrant, grantedBy),
  ]);
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
    const grantedKeys = await fetchGrantedPermissionKeys(validateUuid(userId));

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
    const validatedUserId = validateUuid(userId);

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
    await replacePermissions(validateUuid(userId), permissionKeys, adminUserId);

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
