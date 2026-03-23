import { TIME_CONSTANTS } from "@shared/constants/time";

const INVALID_DATE_KEY = "common.invalidDate";

export type DateFormatStyle = "short" | "medium" | "long" | "full";
type DateInput = string | Date | null | undefined;

export function formatDate(
  dateString: DateInput,
  locale: string = "en-US",
  style: DateFormatStyle = "medium",
): string {
  if (!dateString) return INVALID_DATE_KEY;
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return INVALID_DATE_KEY;

  return date.toLocaleDateString(locale, getDateFormatOptions(style));
}

export function formatDateTime(
  dateString: DateInput,
  locale: string = "en-US",
): string {
  if (!dateString) return INVALID_DATE_KEY;
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return INVALID_DATE_KEY;

  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(
  dateString: DateInput,
  locale: string = "en-US",
): string {
  if (!dateString) return INVALID_DATE_KEY;
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return INVALID_DATE_KEY;

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(
    diffMs / TIME_CONSTANTS.MILLISECONDS.ONE_SECOND,
  );
  const diffMinutes = Math.round(
    diffSeconds / TIME_CONSTANTS.CONVERSION.SECONDS_IN_MINUTE,
  );
  const diffHours = Math.round(
    diffMinutes / TIME_CONSTANTS.CONVERSION.MINUTES_IN_HOUR,
  );
  const diffDays = Math.round(
    diffHours / TIME_CONSTANTS.CONVERSION.HOURS_IN_DAY,
  );

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffSeconds) < TIME_CONSTANTS.CONVERSION.SECONDS_IN_MINUTE) {
    return rtf.format(diffSeconds, "second");
  } else if (
    Math.abs(diffMinutes) < TIME_CONSTANTS.CONVERSION.MINUTES_IN_HOUR
  ) {
    return rtf.format(diffMinutes, "minute");
  } else if (Math.abs(diffHours) < TIME_CONSTANTS.CONVERSION.HOURS_IN_DAY) {
    return rtf.format(diffHours, "hour");
  } else {
    return rtf.format(diffDays, "day");
  }
}

function getDateFormatOptions(
  style: DateFormatStyle,
): Intl.DateTimeFormatOptions {
  switch (style) {
    case "short": {
      return { month: "numeric", day: "numeric", year: "2-digit" };
    }
    case "medium": {
      return { month: "short", day: "numeric", year: "numeric" };
    }
    case "long": {
      return { month: "long", day: "numeric", year: "numeric" };
    }
    case "full": {
      return {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      };
    }
    default: {
      return { month: "short", day: "numeric", year: "numeric" };
    }
  }
}
