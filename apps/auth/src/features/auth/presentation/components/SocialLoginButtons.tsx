"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { DiscordIcon } from "./DiscordIcon";
import { GoogleIcon } from "./GoogleIcon";
import { XIcon } from "./XIcon";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";

type Provider = "google" | "discord" | "twitter";

interface ProviderConfig {
  id: Provider;
  labelKey: string;
  icon: React.ReactNode;
  fill: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "google",
    labelKey: "google",
    icon: <GoogleIcon />,
    fill: "bg-white text-black",
  },
  {
    id: "discord",
    labelKey: "discord",
    icon: <DiscordIcon />,
    fill: "bg-[#5865F2] text-white",
  },
  {
    id: "twitter",
    labelKey: "twitter",
    icon: <XIcon />,
    fill: "bg-black text-white",
  },
];

export function SocialLoginButtons() {
  const t = useTranslations("auth.login");
  const searchParams = useSearchParams();
  const { signInWithProvider } = useSupabaseAuth();

  const returnTo = searchParams.get("returnTo") ?? "/";

  const handleSignIn = async (provider: Provider) => {
    await signInWithProvider(
      provider,
      `${globalThis.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {PROVIDERS.map(({ id, labelKey, icon, fill }) => (
        <button
          key={id}
          type="button"
          className={`nb-btn nb-btn-press-sm nb-shadow-sm w-full justify-center gap-3 px-6 py-4 text-sm ${fill}`}
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
