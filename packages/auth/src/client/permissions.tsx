"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  clearPermCache,
  readPermCache,
  writePermCache,
} from "./permCachePersistence";
import { useInitialGrantedKeys } from "./PermissionsContext";
import { useSupabaseAuth } from "./useSupabaseAuth";

export type PermissionRequirementMode = "all" | "any";

function normalizeRequired(
  required: string | readonly string[],
): readonly string[] {
  if (typeof required === "string") {
    return [required];
  }

  return required;
}

export function matchesPermissions(
  grantedKeys: string[],
  required: string | readonly string[],
  mode: PermissionRequirementMode = "all",
): boolean {
  const requiredKeys = normalizeRequired(required);

  if (requiredKeys.length === 0) return true;
  if (mode === "any") {
    return requiredKeys.some((key) => grantedKeys.includes(key));
  }

  return requiredKeys.every((key) => grantedKeys.includes(key));
}

export function useCurrentUserPermissions() {
  const { user, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  // Server layouts pass the cookie value via PermissionsProvider so SSR
  // and client hydration both start with the same granted keys — no flicker.
  const initialGrantedKeys = useInitialGrantedKeys();
  const [grantedKeys, setGrantedKeys] = useState<string[]>(
    () => readPermCache() ?? initialGrantedKeys,
  );
  const userId = user?.id ?? null;
  // Track whether we have ever confirmed a live user session. Without this
  // guard, a transient userId=null during component mount (e.g. getUser()
  // network call still in-flight) would call clearPermCache() and wipe the
  // cookie that SSR just seeded, causing a flicker on the next navigation.
  const hadUserIdRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    let isActive = true;

    async function loadPermissions() {
      if (!userId) {
        // Only clear the cookie if we previously had a confirmed user session.
        // This prevents wiping the SSR-seeded cookie on a transient null that
        // occurs at mount before the auth state has fully resolved.
        if (hadUserIdRef.current) {
          clearPermCache();
        }
        return;
      }
      hadUserIdRef.current = true;

      const [{ data, error }, { data: delegateData }] = await Promise.all([
        supabase
          .from("user_permissions")
          .select(
            "expires_at,resource_permissions!inner(permissions!inner(key))",
          )
          .eq("user_id", userId)
          .eq("mode", "grant"),
        supabase
          .from("seller_admins")
          .select("permissions")
          .eq("admin_user_id", userId),
      ]);

      if (!isActive) return;

      // If user_permissions fails we have no safe baseline — abort without caching.
      if (error) return;
      // seller_admins is best-effort; a failure leaves delegateData null and
      // the loop below falls back to [] so user_permissions still takes effect.

      const now = Date.now();
      const uniqueKeys = new Set(
        (data ?? [])
          .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
          .map((row) => row.resource_permissions.permissions.key),
      );

      for (const row of delegateData ?? []) {
        for (const key of row.permissions ?? []) {
          uniqueKeys.add(key);
        }
      }

      const keys = [...uniqueKeys].sort();
      writePermCache(keys);
      // Bail out when nothing changed so the nav doesn't re-render unnecessarily.
      setGrantedKeys((prev) => {
        const prevSorted = [...prev].sort();
        if (prevSorted.length !== keys.length) return keys;
        for (let i = 0; i < keys.length; i++) {
          if (prevSorted[i] !== keys[i]) return keys;
        }
        return prev;
      });
    }

    void loadPermissions();

    return () => {
      isActive = false;
    };
  }, [authLoading, supabase, userId]);

  return {
    grantedKeys,
    isAuthenticated,
    hasPermission: (
      required: string | readonly string[],
      mode: PermissionRequirementMode = "all",
    ) => matchesPermissions(grantedKeys, required, mode),
  };
}
