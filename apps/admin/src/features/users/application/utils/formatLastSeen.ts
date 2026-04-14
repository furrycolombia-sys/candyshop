import {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MONTHS_PER_YEAR,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
} from "@/features/users/domain/constants";

/** Result of computing a relative time label: an i18n key + optional params */
export interface LastSeenResult {
  key: string;
  params?: Record<string, number>;
}

/**
 * Compute an i18n key + params for a last_seen_at timestamp.
 *
 * Returns `null` when the timestamp is missing (callers should render an em-dash).
 * Otherwise returns `{ key, params }` to be passed to `t(key, params)` using
 * the `users.lastSeen` namespace.
 */
export function formatLastSeen(
  lastSeenAt: string | null,
): LastSeenResult | null {
  if (!lastSeenAt) return null;

  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const seconds = Math.floor(diff / MS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const days = Math.floor(hours / HOURS_PER_DAY);
  const months = Math.floor(days / DAYS_PER_MONTH);
  const years = Math.floor(days / DAYS_PER_YEAR);

  if (seconds < SECONDS_PER_MINUTE) return { key: "justNow" };
  if (minutes < MINUTES_PER_HOUR)
    return { key: "minutesAgo", params: { count: minutes } };
  if (hours < HOURS_PER_DAY)
    return { key: "hoursAgo", params: { count: hours } };
  if (days < DAYS_PER_MONTH) return { key: "daysAgo", params: { count: days } };
  if (months < MONTHS_PER_YEAR)
    return { key: "monthsAgo", params: { count: months } };
  return { key: "yearsAgo", params: { count: years } };
}
