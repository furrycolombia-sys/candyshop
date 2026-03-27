"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/** Re-compute interval (every minute) */
const TICK_INTERVAL_MS = MS_PER_MINUTE;

function computeTimeRemaining(expiresAt: string): string | null {
  const diffMs = new Date(expiresAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return null;
  }

  const hours = Math.floor(diffMs / MS_PER_HOUR);
  const minutes = Math.floor((diffMs % MS_PER_HOUR) / MS_PER_MINUTE);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function ExpirationLabel({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations("orders");
  const [timeStr, setTimeStr] = useState(() => computeTimeRemaining(expiresAt));

  useEffect(() => {
    const tick = () => setTimeStr(computeTimeRemaining(expiresAt));
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (timeStr === null) {
    return <span>{t("expired")}</span>;
  }

  return <span>{t("expiresIn", { time: timeStr })}</span>;
}
