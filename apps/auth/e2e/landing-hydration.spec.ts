import { expect, test } from "@playwright/test";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const { landing: LANDING_URL } = resolveE2EAppUrls();

/**
 * Landing throws React #418 on load -- a hydration mismatch -- but only in CI,
 * with an authenticated user. It does not reproduce locally in dev, in a
 * production build, with a permissions cookie set, or with a real Clerk
 * session, so the minified error number is all the evidence there has been.
 *
 * #418 is a *text* mismatch, and the navigation is the only place on this page
 * whose text depends on request state: `AppNavigation` filters the app links by
 * the caller's granted permissions. This compares the server's rendering of it
 * against the browser's, using the same cookies, so a failure names the actual
 * difference instead of an error code.
 */
test("landing's server-rendered nav matches the hydrated nav", async ({
  page,
  context,
}) => {
  await page.goto(`${LANDING_URL}/en`);
  await expect(page.getByTestId("app-navigation")).toBeVisible();

  // The same URL, fetched with the browser's cookies, is what the server sent.
  const cookieHeader = (await context.cookies())
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const ssr = await page.request.get(`${LANDING_URL}/en`, {
    headers: { cookie: cookieHeader },
  });
  const html = await ssr.text();

  const linkIds = (source: string) =>
    [...source.matchAll(/data-testid="nav-link-([a-z]+)"/g)]
      .map((m) => m[1])
      .sort();

  const serverLinks = linkIds(html);
  const clientLinks = linkIds(await page.content());

  expect(
    clientLinks,
    `nav links differ between server and client -- server: [${serverLinks.join(", ")}] client: [${clientLinks.join(", ")}]`,
  ).toEqual(serverLinks);

  // Whatever text the server sent for the nav must survive hydration.
  const serverNavText = /<nav[^>]*>([\s\S]*?)<\/nav>/
    .exec(html)?.[1]
    ?.replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  const clientNavText = (await page.getByTestId("app-navigation").innerText())
    .replaceAll(/\s+/g, " ")
    .trim();

  expect(
    clientNavText,
    `nav text differs -- server: "${serverNavText}" client: "${clientNavText}"`,
  ).toBe(serverNavText);
});
