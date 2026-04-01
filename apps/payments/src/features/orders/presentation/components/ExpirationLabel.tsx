"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/** Re-compute interval (every minute) */
const TICK_INTERVAL_MS = MS_PER_MINUTE;

function computeTimeRemaining(
  expiresAt: string,
  locale: string,
): string | null {
  const diffMs = new Date(expiresAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return null;
  }

  const hours = Math.floor(diffMs / MS_PER_HOUR);
  const minutes = Math.floor((diffMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const relativeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });

  if (hours > 0) {
    return relativeFormatter.format(hours, "hour");
  }

  return relativeFormatter.format(Math.max(minutes, 1), "minute");
}

export function ExpirationLabel({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations("orders");
  const locale = useLocale();
  const [timeStr, setTimeStr] = useState(() =>
    computeTimeRemaining(expiresAt, locale),
  );

  useEffect(() => {
    const tick = () => setTimeStr(computeTimeRemaining(expiresAt, locale));
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [expiresAt, locale]);

  if (timeStr === null) {
    return <span>{t("expired")}</span>;
  }

  return <span>{t("expiresIn", { time: timeStr })}</span>;
}
