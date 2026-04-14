/* eslint-disable i18next/no-literal-string */
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

const supabaseUrl =
  process.env["SUPABASE_URL_INTERNAL"] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORBIDDEN_ERROR = "Forbidden";
const SELLER_ADMINS_READ = "seller_admins.read";
const SELLER_ADMINS_DELETE = "seller_admins.delete";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (!supabaseUrl) throw new Error("Supabase URL is not configured");
  return `${supabaseUrl}/rest/v1/${path}`;
}

function validateUserId(userId: string) {
  if (!UUID_PATTERN.test(userId)) throw new Error("Invalid user ID");
  return userId;
}

async function adminFetch(path: string, init?: RequestInit) {
  const response = await fetch(getRestUrl(path), {
    ...init,
    headers: { ...getRestHeaders(), ...init?.headers },
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
    `user_permissions?user_id=eq.${userId}&mode=eq.grant&select=resource_permissions!inner(permissions!inner(key))`,
  );
  const rows = (await response.json()) as Array<{
    resource_permissions: { permissions: { key: string } };
  }>;
  return rows.map((r) => r.resource_permissions.permissions.key);
}

async function getAuthorizedAdmin(requiredKeys: string[]) {
  const sessionSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
  if (!user) return null;
  const grantedKeys = await fetchGrantedPermissionKeys(user.id);
  return requiredKeys.every((k) => grantedKeys.includes(k)) ? user.id : null;
}

/** Delegate row shape returned by the API */
interface DelegateRow {
  id: string;
  seller_id: string;
  admin_user_id: string;
  product_id: string;
  permissions: string[];
  created_at: string;
}

/** Profile shape for joined user data */
interface ProfileShape {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Product shape for joined product data */
interface ProductShape {
  id: string;
  name_en: string;
  name_es: string;
}

interface RawAsSeller extends DelegateRow {
  admin_profile: ProfileShape;
  product: ProductShape;
}

interface RawAsDelegate extends DelegateRow {
  seller_profile: ProfileShape;
  product: ProductShape;
}

/**
 * GET /api/admin/users/:userId/delegates
 *
 * Returns all delegate relationships for a user:
 * - asSeller: rows where the user is the seller (they delegated to someone)
 * - asDelegate: rows where the user is the delegate (someone delegated to them)
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUserId = await getAuthorizedAdmin([SELLER_ADMINS_READ]);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  try {
    const { userId } = await context.params;
    const validId = validateUserId(userId);

    const [asSellerRes, asDelegateRes] = await Promise.all([
      adminFetch(
        `seller_admins?seller_id=eq.${validId}&select=id,seller_id,admin_user_id,product_id,permissions,created_at,admin_profile:user_profiles!admin_user_id(id,email,display_name,avatar_url),product:products!product_id(id,name_en,name_es)`,
      ),
      adminFetch(
        `seller_admins?admin_user_id=eq.${validId}&select=id,seller_id,admin_user_id,product_id,permissions,created_at,seller_profile:user_profiles!seller_id(id,email,display_name,avatar_url),product:products!product_id(id,name_en,name_es)`,
      ),
    ]);

    const asSeller = (await asSellerRes.json()) as RawAsSeller[];
    const asDelegate = (await asDelegateRes.json()) as RawAsDelegate[];

    return NextResponse.json({ asSeller, asDelegate });
  } catch {
    return NextResponse.json(
      { error: "Failed to load delegates" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/users/:userId/delegates
 * Body: { delegateRowId: string }
 *
 * Removes a specific seller_admins row by ID.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUserId = await getAuthorizedAdmin([SELLER_ADMINS_DELETE]);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  try {
    await context.params; // validate route param exists
    const { delegateRowId } = (await request.json()) as {
      delegateRowId: string;
    };

    if (!UUID_PATTERN.test(delegateRowId)) {
      return NextResponse.json(
        { error: "Invalid delegate row ID" },
        { status: 400 },
      );
    }

    await adminFetch(`seller_admins?id=eq.${delegateRowId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove delegate" },
      { status: 500 },
    );
  }
}
