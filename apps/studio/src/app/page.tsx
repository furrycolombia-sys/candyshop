import { redirect } from "next/navigation";

import { routing } from "@/shared/infrastructure/i18n";

export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
