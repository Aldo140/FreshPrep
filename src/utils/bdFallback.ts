import { CustomerRecord, DiscountCodeData } from "../types";
import { toCanonicalCode } from "./fileParser";

function isBusinessDevelopmentChannel(channel: string): boolean {
  return channel.replace(/[\s_-]/g, "").toLowerCase() === "businessdevelopment";
}

function isPayingCustomer(row: CustomerRecord): boolean {
  const hasPayingDate = Boolean(
    row.first_paying_date &&
    row.first_paying_date.trim().length > 0 &&
    row.first_paying_date.trim().toLowerCase() !== "null"
  );
  return hasPayingDate || row.last_step?.trim().toLowerCase() === "paying customer";
}

function displayChannel(channel: string | undefined): string {
  const trimmed = channel?.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return "Unspecified";
  return trimmed;
}

function dominantChannel(channelCounts: Map<string, number>): string {
  let bestChannel = "Unspecified";
  let bestCount = -1;
  for (const [channel, count] of channelCounts.entries()) {
    if (count > bestCount) {
      bestChannel = channel;
      bestCount = count;
    }
  }
  return bestChannel;
}

/**
 * Builds code + province fallback performance rows from the built-in signup database.
 * Includes EV-prefixed codes and non-EV codes explicitly attributed to BusinessDevelopment.
 * Province rows stay separate so Regional can display the real province distribution.
 */
export function aggregateBusinessDevelopmentRows(
  customerRows: CustomerRecord[],
): DiscountCodeData[] {
  const channelProfile = new Map<string, { total: number; bd: number }>();
  for (const row of customerRows) {
    const code = row.discount_code?.trim().toUpperCase();
    if (!code) continue;
    const canonicalCode = toCanonicalCode(code);
    if (!canonicalCode) continue;
    const profile = channelProfile.get(canonicalCode) ?? { total: 0, bd: 0 };
    profile.total += 1;
    if (isBusinessDevelopmentChannel(row.channel ?? "")) profile.bd += 1;
    channelProfile.set(canonicalCode, profile);
  }

  // A non-EV code is a verified BD partnership code only when BD accounts for
  // at least 80% of all uses in the preload. This excludes generic acquisition
  // codes that happened to be used once at an event.
  const verifiedNonEvCodes = new Set(
    Array.from(channelProfile.entries())
      .filter(([, profile]) => profile.bd > 0 && profile.bd / profile.total >= 0.8)
      .map(([code]) => code),
  );

  const grouped = new Map<string, {
    code: string;
    province: string;
    signups: number;
    paying: number;
    channelCounts: Map<string, number>;
  }>();

  for (const row of customerRows) {
    const code = row.discount_code?.trim().toUpperCase();
    if (!code) continue;
    const canonicalCode = toCanonicalCode(code);
    if (!canonicalCode) continue;
    if (!code.startsWith("EV") && !verifiedNonEvCodes.has(canonicalCode)) continue;
    if (!code.startsWith("EV") && !isBusinessDevelopmentChannel(row.channel ?? "")) continue;
    const province = row.province?.trim().toUpperCase() || "??";
    const key = `${canonicalCode}::${province}`;

    const current = grouped.get(key) ?? {
      code,
      province,
      signups: 0,
      paying: 0,
      channelCounts: new Map<string, number>(),
    };

    current.signups += 1;
    if (isPayingCustomer(row)) current.paying += 1;
    const channel = displayChannel(row.channel);
    current.channelCounts.set(channel, (current.channelCounts.get(channel) ?? 0) + 1);
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map(({ code, province, signups, paying, channelCounts }): DiscountCodeData => ({
        discount_code: code,
        channel: dominantChannel(channelCounts),
        isStaticOnly: true,
        Province: province === "??" ? "ON" : province,
        Signups: signups,
        "Paying cx": paying,
        Conversion: signups > 0 ? (paying / signups) * 100 : 0,
        total_discount_used: 0,
        "Sum LTV 3": 0,
        "Sum LTV 6": 0,
        "Sum LTV 12": 0,
        "Avg LTV 3": 0,
        "Avg LTV 6": 0,
        "Avg LTV 12": 0,
      }))
    .sort((a, b) =>
      a.discount_code.localeCompare(b.discount_code)
      || (a.Province ?? "").localeCompare(b.Province ?? "")
    );
}

/**
 * Merges uploaded Looker rows with static BD fallbacks. The uploaded row
 * keeps its performance metrics, while missing/unknown channels are enriched
 * from the verified BD registry. Static rows are appended only for codes
 * absent from the upload.
 */
export function mergeBusinessDevelopmentFallbacks(
  uploadedRows: DiscountCodeData[],
  fallbackRows: DiscountCodeData[],
): DiscountCodeData[] {
  if (uploadedRows.length === 0) return uploadedRows;
  if (fallbackRows.length === 0) return uploadedRows;

  const uploadedCodes = new Set(uploadedRows.map(row => toCanonicalCode(row.discount_code)));

  const missingFallbacks = fallbackRows.filter(
    row => !uploadedCodes.has(toCanonicalCode(row.discount_code)),
  );

  return [...uploadedRows, ...missingFallbacks];
}
