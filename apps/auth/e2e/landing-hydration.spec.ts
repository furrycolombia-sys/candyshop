import { expect, test } from "@playwright/test";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const { landing: LANDING_URL } = resolveE2EAppUrls();

/** Visible words of a page, from either raw HTML or a hydrated DOM. */
function words(source: string): string[] {
  return source
    .replaceAll(/<script[^>]*>[\s\S]*?<\/script>/g, " ")
    .replaceAll(/<style[^>]*>[\s\S]*?<\/style>/g, " ")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/&#x27;|&apos;/g, "'")
    .replaceAll(/&quot;/g, '"')
    .replaceAll(/&amp;/g, "&")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Landing throws React #418 on load -- a hydration mismatch -- but only in CI,
 * with an authenticated user. It does not reproduce locally in dev, in a
 * production build, with a permissions cookie set, or with a real Clerk
 * session, so the minified error number has been the only evidence.
 *
 * #418 is a *text* mismatch. This fetches the same URL with the browser's own
 * cookies -- which is what the server sent -- and compares it to the hydrated
 * DOM, so a failure names the differing text instead of an error code.
 */
test("landing's server-rendered page matches the hydrated page", async ({
  page,
  context,
}) => {
  await page.goto(`${LANDING_URL}/en`);
  await expect(page.getByTestId("app-navigation")).toBeVisible();

  const cookieHeader = (await context.cookies())
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const ssr = await page.request.get(`${LANDING_URL}/en`, {
    headers: { cookie: cookieHeader },
  });
  const html = await ssr.text();
  const clientHtml = await page.content();

  // The nav is the one place whose content depends on request state:
  // AppNavigation filters the app links by the caller's granted permissions.
  const linkIds = (source: string) =>
    [...source.matchAll(/data-testid="nav-link-([a-z]+)"/g)]
      .map((m) => m[1])
      .sort();

  const serverLinks = linkIds(html);
  const clientLinks = linkIds(clientHtml);

  expect(
    clientLinks,
    `nav links differ -- server: [${serverLinks.join(", ")}] client: [${clientLinks.join(", ")}]`,
  ).toEqual(serverLinks);

  // Then the whole visible page, reporting the first word that differs.
  const serverWords = words(html);
  const clientWords = words(clientHtml);
  const at = serverWords.findIndex((w, i) => clientWords[i] !== w);
  const context_ = (list: string[]) =>
    list.slice(Math.max(0, at - 8), at + 8).join(" ");

  expect(
    at,
    at === -1
      ? ""
      : `page text diverges at word ${at}\n  server: ...${context_(serverWords)}...\n  client: ...${context_(clientWords)}...`,
  ).toBe(-1);
});
