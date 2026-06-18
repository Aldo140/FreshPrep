/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DiscountCodeData {
  discount_code: string;
  channel: string;
  Province?: string; // added to support regional operations
  Signups: number;
  "Paying cx": number;
  Conversion?: number; // optional, can be computed as (Paying cx / Signups)
  total_discount_used: number;
  "Sum LTV 3": number;
  "Sum LTV 6": number;
  "Sum LTV 12": number;
  "Avg LTV 3": number;
  "Avg LTV 6": number;
  "Avg LTV 12": number;
  // Cost columns — present in province wrap-up sheets, absent in Looker export
  "Total Spend"?: number;
  "CPA"?: number;
  "Staff Spend"?: number;
  "Event Spend"?: number;
}

export type PerformanceRating = "Strong" | "Good" | "Average" | "Weak" | "Poor";

export interface AnalyzedCodeReport extends DiscountCodeData {
  calculatedConversion: number; // 0 to 100 percentage
  performanceRating: PerformanceRating;
  efficiencyRatio: number;      // Sum LTV 12 / ABS(total_discount_used)
  overallScore: number;        // formula-calculated out of 100
  performanceGrade: string;    // A+, A, B, C, D, F based on Conversion
  overallScoreBadge: string;   // Elite, Strong, Good, Average, Weak based on overallScore
}

export interface KPIReportSummary {
  totalSignups: number;
  totalPayingCustomers: number;
  blendedConversionRate: number; // overall paying cx / overall signups as percentage
  totalLTV3: number;
  totalLTV6: number;
  totalLTV12: number;
  averageLTV12: number;          // average LTV12 across found codes
  averageConversionRate: number; // average of individual conversion rates
  numCodesFound: number;
  numCodesMissing: number;
  topPerformingCodeCode: string; // code with top conversion
  topPerformingCodeVal: number;  // top conversion rate
  bestOverallScoreCode: string;  // code with best overall score
  bestOverallScoreVal: number;   // best overall score rate
}

export interface ChannelSummary {
  channel: string;
  codeCount: number;
  totalSignups: number;
  totalPayingCustomers: number;
  averageConversion: number;
  totalDiscount: number;
  totalLTV12: number;
}

export type SortField = 
  | "discount_code"
  | "channel"
  | "Province"
  | "Signups"
  | "Paying cx"
  | "Conversion"
  | "total_discount_used"
  | "Avg LTV 3"
  | "Avg LTV 6"
  | "Avg LTV 12"
  | "efficiencyRatio"
  | "overallScore"
  | "performanceGrade";

export type SortOrder = "asc" | "desc";

/**
 * Represents a discount code that maps to multiple rows in the dataset
 * (typically one row per province). The user must choose which to use.
 */
export interface DuplicateCodeInfo {
  code: string;
  rows: DiscountCodeData[];
}

/**
 * Resolution decision for a duplicate code:
 * - number (0, 1, ...): use only the row at that index
 * - 'combine': merge all rows into one aggregated result
 */
export type DuplicateResolution = number | 'combine';

export type ReportPage = "overview" | "performance" | "revenue" | "regional" | "data" | "issues" | "comparison" | "calendar";

export type AnalysisFlow = "paste" | "all" | "compare";

export type UserPersona = "bd-rep" | "bd-lead" | "neutral" | "analyst";

export interface CustomerRecord {
  signup_date: string;
  client_id: string;
  current_status: string;
  discount_code: string | null;
  channel: string;
  province: string;
  first_paying_date?: string;
  days_till_paying?: number;
}

export type ActiveTab = "report" | "explorer";
