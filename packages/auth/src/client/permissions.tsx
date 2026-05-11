"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  clearNavPermCache,
  readNavPermCache,
  writeNavPermCache,
} from "./navPermCachePersistence";
import { useSupabaseAuth } from "./useSupabaseAuth";

type PermissionRow = {
  expires_at: string | null;
  resource_permissions: {
    permissions: {
      key: string;
    };
  };
};

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
  // Captured once on mount — true only when a valid cookie exists at page load.
  const cachedRef = useRef(readNavPermCache());
  const hasCachedPermissions = cachedRef.current !== null;
  const [grantedKeys, setGrantedKeys] = useState<string[]>(
    () => cachedRef.current ?? [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadPermissions() {
      if (authLoading) return;

      if (!userId) {
        if (isActive) {
          clearNavPermCache();
          setGrantedKeys([]);
          setIsLoading(false);
        }
        return;
      }

      // Always show loading state while fetching to prevent stale permissions
      // from briefly appearing after a session change or page navigation.
      setIsLoading(true);

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

      if (error) {
        setGrantedKeys([]);
        setIsLoading(false);
        return;
      }

      const now = Date.now();
      const uniqueKeys = new Set(
        ((data ?? []) as PermissionRow[])
          .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
          .map((row) => row.resource_permissions.permissions.key),
      );

      for (const row of delegateData ?? []) {
        for (const key of row.permissions ?? []) {
          uniqueKeys.add(key);
        }
      }

      const keys = [...uniqueKeys];
      writeNavPermCache(keys);
      setGrantedKeys(keys);
      setIsLoading(false);
    }

    loadPermissions();

    return () => {
      isActive = false;
    };
  }, [authLoading, supabase, userId]);

  return {
    grantedKeys,
    hasCachedPermissions,
    isLoading: authLoading || isLoading,
    isAuthenticated,
    hasPermission: (
      required: string | readonly string[],
      mode: PermissionRequirementMode = "all",
    ) => matchesPermissions(grantedKeys, required, mode),
  };
}
