"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { cn } from "ui";

import { DiscordIcon } from "./DiscordIcon";
import { GoogleIcon } from "./GoogleIcon";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";

type Provider = "google" | "discord";

interface ProviderConfig {
  id: Provider;
  labelKey: string;
  icon: React.ReactNode;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "google",
    labelKey: "google",
    icon: <GoogleIcon />,
  },
  {
    id: "discord",
    labelKey: "discord",
    icon: <DiscordIcon />,
  },
];

export function SocialLoginButtons() {
  const t = useTranslations("auth.login");
  const searchParams = useSearchParams();
  const { signInWithProvider } = useSupabaseAuth();

  const returnTo = searchParams.get("returnTo") ?? "/";

  const handleSignIn = async (provider: Provider) => {
    try {
      await signInWithProvider(
        provider,
        `${globalThis.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
      );
    } catch {
      // Network error or popup blocked — silently ignore, provider redirects on success
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {PROVIDERS.map(({ id, labelKey, icon }) => (
        <button
          key={id}
          type="button"
          className={cn(
            "button-brutal button-press-sm shadow-brutal-sm w-full justify-center gap-3 px-6 py-4 text-sm",
            id === "google" &&
              "border-strong border-border bg-background text-foreground hover:bg-muted",
            id === "discord" && "bg-info text-info-foreground hover:bg-info/90",
          )}
          onClick={() => handleSignIn(id)}
          {...tid(`login-${id}`)}
        >
          {icon}
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
