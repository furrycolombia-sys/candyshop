import { tid } from "shared";

export interface AppFooterProps {
  /** Translated copyright line WITHOUT the year. Year is auto-prepended. */
  copyrightSuffix: string;
  /** Translated label for the Terms link. */
  termsLabel: string;
  /** Translated label for the Privacy link. */
  privacyLabel: string;
  /** Absolute URL to the Terms page on the landing app. */
  termsHref: string;
  /** Absolute URL to the Privacy page on the landing app. */
  privacyHref: string;
}

/**
 * Cross-app footer. Pure presentational — no i18n calls inside.
 * The owning app passes already-translated strings and the URLs to
 * the legal pages on the landing app.
 *
 * Legal links open in a new tab so a user mid-checkout or mid-signup
 * doesn't lose their session/cart context while reading the policies.
 */
export function AppFooter({
  copyrightSuffix,
  termsLabel,
  privacyLabel,
  termsHref,
  privacyHref,
}: AppFooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer
      className="mt-auto border-t border-foreground/10 bg-background px-4 py-6 text-xs text-muted-foreground"
      {...tid("app-footer")}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 md:flex-row md:justify-between">
        <span>
          © {year} {copyrightSuffix}
        </span>
        <span className="flex items-center gap-2">
          <a
            href={termsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {termsLabel}
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={privacyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {privacyLabel}
          </a>
        </span>
      </div>
    </footer>
  );
}
