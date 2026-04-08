"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useEffect, useMemo, useState } from "react";

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
  const [grantedKeys, setGrantedKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadPermissions() {
      if (authLoading) return;

      if (!user) {
        if (isActive) {
          setGrantedKeys([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase
        .from("user_permissions")
        .select("expires_at,resource_permissions!inner(permissions!inner(key))")
        .eq("user_id", user.id)
        .eq("mode", "grant");

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

      setGrantedKeys([...uniqueKeys]);
      setIsLoading(false);
    }

    loadPermissions();

    return () => {
      isActive = false;
    };
  }, [authLoading, supabase, user]);

  return {
    grantedKeys,
    isLoading: authLoading || isLoading,
    isAuthenticated,
    hasPermission: (
      required: string | readonly string[],
      mode: PermissionRequirementMode = "all",
    ) => matchesPermissions(grantedKeys, required, mode),
  };
}
