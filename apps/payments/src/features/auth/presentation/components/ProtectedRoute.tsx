import { createProtectedRoute } from "auth/client";

import { appUrls } from "@/shared/infrastructure/config";

export const ProtectedRoute = createProtectedRoute(appUrls.auth);
