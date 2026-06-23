import { CustomerRecord, DiscountCodeData } from "../types";
import { toCanonicalCode } from "./fileParser";

function isBusinessDevelopmentChannel(channel: string): boolean {
  return channel.trim().toLowerCase() === "businessdevelopment";
}

function isPayingCustomer(row: CustomerRecord): boolean {
  const hasPayingDate = Boolean(
    row.first_paying_date &&
    row.first_paying_date.trim().length > 0 &&
    row.first_paying_date.trim().toLowerCase() !== "null"
  );
  return hasPayingDate || row.last_step?.trim().toLowerCase() === "paying customer";
}

/**
 * Builds code + province fallback performance rows from the built-in signup database.
 * Includes EV-prefixed codes and non-EV codes explicitly attributed to BusinessDevelopment.
 * Province rows stay separate so Regional can display the real province distribution.
 */
export function aggregateBusinessDevelopmentRows(
  customerRows: CustomerRecord[],
): DiscountCodeData[] {
  const grouped = new Map<string, {
    code: string;
    province: string;
    signups: number;
    paying: number;
  }>();

  for (const row of customerRows) {
    const code = row.discount_code?.trim().toUpperCase();
    if (!code || (!code.startsWith("EV") && !isBusinessDevelopmentChannel(row.channel ?? ""))) {
      continue;
    }

    const canonicalCode = toCanonicalCode(code);
    if (!canonicalCode) continue;
    const province = row.province?.trim().toUpperCase() || "??";
    const key = `${canonicalCode}::${province}`;

    const current = grouped.get(key) ?? {
      code,
      province,
      signups: 0,
      paying: 0,
    };

    current.signups += 1;
    if (isPayingCustomer(row)) current.paying += 1;
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map(({ code, province, signups, paying }): DiscountCodeData => ({
        discount_code: code,
        channel: "BusinessDevelopment",
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

  const fallbackCodes = new Set(
    fallbackRows.map(row => toCanonicalCode(row.discount_code)),
  );
  const uploadedCodes = new Set<string>();

  // Looker LTV exports often omit channel, which the parser represents as
  // "Direct / Unknown". Enrich those rows when the preloaded signup DB
  // explicitly verifies the code as a BusinessDevelopment event code.
  const enrichedUploaded = uploadedRows.map(row => {
    const canonicalCode = toCanonicalCode(row.discount_code);
    uploadedCodes.add(canonicalCode);
    const normalizedChannel = row.channel.trim().toLowerCase();
    const channelIsUnknown =
      normalizedChannel === ""
      || normalizedChannel === "direct / unknown"
      || normalizedChannel === "unknown";

    if (channelIsUnknown && fallbackCodes.has(canonicalCode)) {
      return { ...row, channel: "BusinessDevelopment" };
    }
    return row;
  });

  const missingFallbacks = fallbackRows.filter(
    row => !uploadedCodes.has(toCanonicalCode(row.discount_code)),
  );

  return [...enrichedUploaded, ...missingFallbacks];
}
