"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button } from "ui";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";

const PROVIDERS = [
  { id: "google" as const, labelKey: "google" },
  { id: "facebook" as const, labelKey: "facebook" },
] as const;

export function SocialLoginButtons() {
  const t = useTranslations("auth.login");
  const searchParams = useSearchParams();
  const { signInWithProvider } = useSupabaseAuth();

  const returnTo = searchParams.get("returnTo") ?? "/";

  const handleSignIn = async (provider: "google" | "facebook") => {
    await signInWithProvider(
      provider,
      `${globalThis.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {PROVIDERS.map(({ id, labelKey }) => (
        <Button
          key={id}
          variant="outline"
          size="lg"
          className="w-full h-12 text-base"
          onClick={() => handleSignIn(id)}
          {...tid(`login-${id}`)}
        >
          {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
