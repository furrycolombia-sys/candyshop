import { clerkMiddleware } from "@clerk/nextjs/server";
import { createIntlProxy } from "shared/i18n/createIntlProxy";

import { routing } from "@/shared/infrastructure/i18n";

/**
 * This app's root layout renders `PermissionsProvider` (via
 * `shared/infrastructure/providers` / the shared layout template), which
 * now resolves the caller's identity through Clerk — see
 * `packages/auth/src/client/useCurrentUser.ts`. Without `clerkMiddleware()`
 * here, `auth()`/`currentUser()` throw for this app's server-rendered
 * layout (`getServerUserEmail`), and the client bundle never gets a
 * `<ClerkProvider>` counterpart's session to read either. See
 * apps/auth/src/proxy.ts for the app this pattern was first applied to, and
 * task-11-report.md for why this app needed it too.
 */
const intlProxy = createIntlProxy(routing);

export default clerkMiddleware((_auth, request) => intlProxy(request));
