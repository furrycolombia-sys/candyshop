"use client";

// `@clerk/nextjs`'s *default* `useSignIn()` (re-exported straight from
// `@clerk/react`) now returns the new "signals" API — `{ errors, fetchStatus,
// signIn }` where `signIn` is a `SignInFutureResource` with no
// `authenticateWithRedirect` method at all (only `.sso()`, a different shape).
// `@clerk/nextjs/legacy` re-exports the classic hook instead — `{ isLoaded,
// signIn, setActive }` where `signIn: SignInResource` still has
// `authenticateWithRedirect()` — which is what this redirect-based custom
// OAuth flow needs. Verified by reading
// node_modules/@clerk/react/dist/{index,legacy}.d.mts.
import { useSignIn } from "@clerk/nextjs/legacy";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { cn } from "ui";

import { DiscordIcon } from "./DiscordIcon";
import { GoogleIcon } from "./GoogleIcon";

type Provider = "google" | "discord";

interface ProviderConfig {
  id: Provider;
  labelKey: string;
  strategy: `oauth_${Provider}`;
  icon: React.ReactNode;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "google",
    labelKey: "google",
    strategy: "oauth_google",
    icon: <GoogleIcon />,
  },
  {
    id: "discord",
    labelKey: "discord",
    strategy: "oauth_discord",
    icon: <DiscordIcon />,
  },
];

export function SocialLoginButtons() {
  const t = useTranslations("auth.login");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { isLoaded, signIn } = useSignIn();

  const returnTo = searchParams.get("returnTo") ?? `/${locale}/profile`;

  const handleSignIn = async (strategy: `oauth_${Provider}`) => {
    if (!isLoaded || !signIn) return;

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: `/${locale}/sso-callback`,
        redirectUrlComplete: `/${locale}/callback?next=${encodeURIComponent(returnTo)}`,
      });
    } catch {
      // Network error or popup blocked — silently ignore, provider redirects on success
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {PROVIDERS.map(({ id, labelKey, strategy, icon }) => (
        <button
          key={id}
          type="button"
          className={cn(
            "button-brutal button-press-sm shadow-brutal-sm w-full justify-center gap-3 px-6 py-4 text-sm",
            id === "google" &&
              "border-strong border-border bg-background text-foreground hover:bg-muted",
            id === "discord" && "bg-info text-info-foreground hover:bg-info/90",
          )}
          onClick={() => handleSignIn(strategy)}
          {...tid(`login-${id}`)}
        >
          {icon}
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
