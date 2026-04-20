const DEFAULT_LOCALE = "en-US";

type FormatNumberOptions = {
  /** Locale for digit grouping conventions. Defaults to "en-US". */
  locale?: string | string[];
  /** Minimum fraction digits to display. */
  minimumFractionDigits?: number;
  /** Maximum fraction digits to display. */
  maximumFractionDigits?: number;
};

/**
 * Format a number using the given locale's digit grouping conventions.
 *
 * Prefer this over `.toLocaleString("en-US")` or `.toFixed()` for any
 * user-facing number display so that future locale additions (e.g., Arabic,
 * Hindi) are handled correctly without per-component updates.
 *
 * @example
 * formatNumber(1234.5, { locale: "ko-KR" })        // "1,234.5"
 * formatNumber(85.567, { maximumFractionDigits: 1 }) // "85.6"
 * formatNumber(3.4, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) // "3.4"
 */
export function formatNumber(
  value: number,
  optionsOrLocale?: string | string[] | FormatNumberOptions
): string {
  if (typeof optionsOrLocale === "string" || Array.isArray(optionsOrLocale)) {
    // Legacy positional API: formatNumber(value, locale)
    return value.toLocaleString(optionsOrLocale);
  }
  const { locale = DEFAULT_LOCALE, minimumFractionDigits, maximumFractionDigits } = optionsOrLocale ?? {};
  return value.toLocaleString(locale, {
    ...(minimumFractionDigits != null ? { minimumFractionDigits } : {}),
    ...(maximumFractionDigits != null ? { maximumFractionDigits } : {}),
  });
}

/**
 * Format a byte count as a human-readable string with locale-aware digit grouping.
 *
 * Uses `formatNumber` internally so digit separators respect the user's locale.
 */
export function formatBytes(
  bytes: number,
  locale: string | string[] = DEFAULT_LOCALE
): string {
  if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(+(bytes / 1024).toFixed(1), locale)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${formatNumber(+(bytes / (1024 * 1024)).toFixed(1), locale)} MB`;
  return `${formatNumber(+(bytes / (1024 * 1024 * 1024)).toFixed(2), locale)} GB`;
}

/**
 * Round a score value to two decimal places for display.
 * Returns "-" for null/undefined values.
 */
export function formatScore(score: number | null | undefined): string {
  if (score == null) return "-";
  return String(Math.round(score * 100) / 100);
}
