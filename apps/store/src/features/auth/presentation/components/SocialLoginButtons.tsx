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
  className: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "google",
    labelKey: "google",
    icon: <GoogleIcon />,
    className: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
  },
  {
    id: "discord",
    labelKey: "discord",
    icon: <DiscordIcon />,
    className: "bg-[#5865F2] text-white hover:bg-[#4752C4] border-transparent",
  },
  {
    id: "twitter",
    labelKey: "twitter",
    icon: <XIcon />,
    className: "bg-black text-white hover:bg-gray-900 border-transparent",
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
    <div className="flex flex-col gap-3 w-full">
      {PROVIDERS.map(({ id, labelKey, icon, className }) => (
        <button
          key={id}
          type="button"
          className={`flex items-center justify-center gap-3 w-full h-12 rounded-md text-sm font-medium transition-colors cursor-pointer ${className}`}
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
