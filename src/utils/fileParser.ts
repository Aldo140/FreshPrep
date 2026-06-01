/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import { 
  DiscountCodeData, 
  AnalyzedCodeReport, 
  KPIReportSummary, 
  ChannelSummary, 
  PerformanceRating 
} from "../types";

// Helper to normalize the column headings to identify key fields
const headerMappings: Record<string, string[]> = {
  discount_code: ["discount_code", "discount code", "code", "coupon", "promo code", "promocode", "promo_code", "discount_codes", "discountcodes"],
  channel: ["channel", "source", "marketing channel", "medium", "mkt_channel", "marketing_channel", "traffic source", "trafficsource"],
  Province: ["province", "prov", "state", "region", "territory", "loc", "location"],
  Signups: ["signups", "signup", "registrations", "leads", "signup count", "total signups", "signup_count", "total_signups"],
  "Paying cx": ["paying cx", "paying customer", "paying cx count", "paying_cx", "paying_customers", "paying customers", "sales", "purchases", "paying_customer_count", "paying_cx_count"],
  Conversion: ["conversion", "conversion_rate", "conversion rate", "conversion %", "conv_rate", "conv %", "conversion_percent", "conversion percentage"],
  total_discount_used: ["total_discount_used", "total discount used", "total discount", "discount used", "total_discount", "discount_used", "discountused"],
  "Sum LTV 3": ["sum ltv 3", "sum_ltv_3", "ltv 3 sum", "total ltv 3", "sum ltv3", "sumltv3", "ltv3_sum"],
  "Sum LTV 6": ["sum ltv 6", "sum_ltv_6", "ltv 6 sum", "total ltv 6", "sum ltv6", "sumltv6", "ltv6_sum"],
  "Sum LTV 12": ["sum ltv 12", "sum_ltv_12", "ltv 12 sum", "total ltv 12", "sum ltv12", "sumltv12", "ltv12_sum"],
  "Avg LTV 3": ["avg ltv 3", "avg_ltv_3", "ltv 3 avg", "average ltv 3", "avg ltv3", "avgltv3", "ltv3_avg", "average_ltv_3"],
  "Avg LTV 6": ["avg ltv 6", "avg_ltv_6", "ltv 6 avg", "average ltv 6", "avg ltv6", "avgltv6", "ltv6_avg", "average_ltv_6"],
  "Avg LTV 12": ["avg ltv 12", "avg_ltv_12", "ltv 12 avg", "average ltv 12", "avg ltv12", "avgltv12", "ltv12_avg", "average_ltv_12"],
};

function normalizeHeader(rawHeader: string): string | null {
  const clean = rawHeader.trim().toLowerCase().replace(/[\s\-_]+/g, " ");
  for (const [standardKey, aliases] of Object.entries(headerMappings)) {
    if (standardKey.toLowerCase() === clean) return standardKey;
    if (aliases.some(alias => alias.toLowerCase() === clean)) {
      return standardKey;
    }
  }
  return null;
}

// Cleans numbers from spreadsheet (handling strings with '$', '%', commas)
function parseNumericValue(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleanedStr = String(value)
    .replace(/[$,%\s]/g, "") // remove currency signs, percentages, spaces
    .replace(/,/g, ""); // remove potential thousands separators
  const parsed = parseFloat(cleanedStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses raw objects from sheets and normalizes them to DiscountCodeData
 */
export function normalizeSheetRawData(rows: any[]): DiscountCodeData[] {
  if (!rows || rows.length === 0) return [];

  return rows.map((row) => {
    const normalizedRow: Partial<DiscountCodeData> = {};

    // For each key in the row, try to match it with standard headers
    Object.keys(row).forEach((colName) => {
      const standardKey = normalizeHeader(colName);
      if (standardKey) {
        if (standardKey === "discount_code") {
          normalizedRow.discount_code = String(row[colName]).trim();
        } else if (standardKey === "channel") {
          normalizedRow.channel = String(row[colName]).trim();
        } else if (standardKey === "Province") {
          normalizedRow.Province = String(row[colName]).trim();
        } else {
          // It's a numeric field
          (normalizedRow as any)[standardKey] = parseNumericValue(row[colName]);
        }
      }
    });

    // If certain fields remain undefined, fill defaults
    const discountCode = normalizedRow.discount_code || "";
    const channel = normalizedRow.channel || "Direct / Unknown";
    const province = normalizedRow.Province || "ON"; // Default province to ON if empty
    const signups = parseNumericValue(normalizedRow.Signups);
    const payingCx = parseNumericValue(normalizedRow["Paying cx"]);
    const totalDiscountUsed = parseNumericValue(normalizedRow.total_discount_used);
    const sumLtv3 = parseNumericValue(normalizedRow["Sum LTV 3"]);
    const sumLtv6 = parseNumericValue(normalizedRow["Sum LTV 6"]);
    const sumLtv12 = parseNumericValue(normalizedRow["Sum LTV 12"]);
    const avgLtv3 = parseNumericValue(normalizedRow["Avg LTV 3"]);
    const avgLtv6 = parseNumericValue(normalizedRow["Avg LTV 6"]);
    const avgLtv12 = parseNumericValue(normalizedRow["Avg LTV 12"]);

    // Calculate conversion rate as fraction if not provided
    let conversion = normalizedRow.Conversion;
    if (conversion === undefined || conversion === 0) {
      conversion = signups > 0 ? (payingCx / signups) * 100 : 0;
    } else {
      // If conversion raw rate is provided as fraction like 0.45, convert it to 45
      if (conversion <= 1.0 && conversion > 0 && payingCx > 0) {
        conversion = conversion * 100;
      }
    }

    return {
      discount_code: discountCode,
      channel: channel,
      Province: province,
      Signups: signups,
      "Paying cx": payingCx,
      Conversion: conversion,
      total_discount_used: totalDiscountUsed,
      "Sum LTV 3": sumLtv3,
      "Sum LTV 6": sumLtv6,
      "Sum LTV 12": sumLtv12,
      "Avg LTV 3": avgLtv3,
      "Avg LTV 6": avgLtv6,
      "Avg LTV 12": avgLtv12,
    };
  }).filter(item => item.discount_code.length > 0);
}

export interface FileValidationResult {
  isValid: boolean;
  rowsLoaded: number;
  columnsDetected: string[];
  requiredFound: string[];
  requiredMissing: string[];
  optionalFound: string[];
  optionalMissing: string[];
}

export interface ParsedSpreadsheetResult {
  dbRows: DiscountCodeData[];
  validation: FileValidationResult;
}

/**
 * Parses XLSX, XLS, or CSV files in the browser and returns DiscountCodeData[] with full validation metrics
 */
export function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Empty file data loaded"));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of objects raw
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        const normalizedData = normalizeSheetRawData(rawJsonData);

        // Get headers list from excel sheet
        const sheetsRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const rawHeaders = sheetsRows.length > 0 ? sheetsRows[0].map(h => String(h).trim()).filter(h => h.length > 0) : [];

        // Validate headers mapping keys
        const requiredFields = ["discount_code", "Signups", "Paying cx", "Conversion"];
        const optionalFields = [
          "channel", "Province", "total_discount_used", 
          "Sum LTV 3", "Sum LTV 6", "Sum LTV 12", 
          "Avg LTV 3", "Avg LTV 6", "Avg LTV 12"
        ];

        const requiredFound: string[] = [];
        const requiredMissing: string[] = [];
        const optionalFound: string[] = [];
        const optionalMissing: string[] = [];

        // Track what standard key we matched from detected raw headers
        const mappedStandardKeys = new Set<string>();
        rawHeaders.forEach(header => {
          const stdKey = normalizeHeader(header);
          if (stdKey) {
            mappedStandardKeys.add(stdKey);
          }
        });

        // If we didn't map standard keys because layout is unstructured, check values of first row
        if (mappedStandardKeys.size === 0 && rawJsonData.length > 0) {
          Object.keys(rawJsonData[0]).forEach(key => {
            const stdKey = normalizeHeader(key);
            if (stdKey) mappedStandardKeys.add(stdKey);
          });
        }

        requiredFields.forEach(field => {
          if (mappedStandardKeys.has(field)) {
            requiredFound.push(field);
          } else {
            requiredMissing.push(field);
          }
        });

        optionalFields.forEach(field => {
          if (mappedStandardKeys.has(field)) {
            optionalFound.push(field);
          } else {
            optionalMissing.push(field);
          }
        });

        const validation: FileValidationResult = {
          isValid: requiredMissing.length === 0,
          rowsLoaded: normalizedData.length,
          columnsDetected: rawHeaders.length > 0 ? rawHeaders : (rawJsonData.length > 0 ? Object.keys(rawJsonData[0]) : []),
          requiredFound,
          requiredMissing,
          optionalFound,
          optionalMissing
        };

        resolve({
          dbRows: normalizedData,
          validation
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Clears and normalizes list of target codes entered by user
 * removes duplicates, trims spaces, ignores case, commas, tabs, spreadsheet pastes, uppercase
 */
export function parsePastedCodes(text: string): string[] {
  if (!text) return [];

  // Split by line breaks, carriage returns, commas, tabs, semicolons
  const delimiters = /[\n\r\t,;]+/;
  const rawParts = text.split(delimiters);

  const cleanParts = rawParts
    .map(p => p.trim().toUpperCase()) // normalize all codes to uppercase and trim spaces
    .filter(p => p.length > 0);       // remove empty entries

  // Deduplicate preserving order
  const uniqueParts: string[] = [];
  const seen = new Set<string>();
  
  for (const part of cleanParts) {
    if (!seen.has(part)) {
      seen.add(part);
      uniqueParts.push(part);
    }
  }

  return uniqueParts;
}

/**
 * Assign performance ratings based on signups and conversion
 */
export function calculatePerformanceRating(signups: number, conversionRate: number): PerformanceRating {
  if (signups < 5) {
    return "Too Early";
  }
  if (conversionRate >= 40) return "Strong";
  if (conversionRate >= 30) return "Good";
  if (conversionRate >= 20) return "Average";
  if (conversionRate >= 10) return "Weak";
  return "Poor";
}

/**
 * PERFORMANCE GRADING
 * Grade based on Conversion:
 * A+: 50%+
 * A: 40-49%
 * B: 30-39%
 * C: 20-29%
 * D: 10-19%
 * F: 0-9%
 */
export function calculatePerformanceGrade(conversionPercent: number): string {
  if (conversionPercent >= 50) return "A+";
  if (conversionPercent >= 40) return "A";
  if (conversionPercent >= 30) return "B";
  if (conversionPercent >= 20) return "C";
  if (conversionPercent >= 10) return "D";
  return "F";
}

/**
 * OVERALL SCORE DEFINITION
 * 40% Conversion (capped scale)
 * 30% Avg LTV 12 (capped scale, e.g. Max LTV of $200 gets full credit)
 * 20% Signups (capped scale, e.g. Max signups of 250 gets full credit)
 * 10% Efficiency Ratio (capped scale, e.g. Max efficiency of 8.0x gets full credit)
 */
export function calculateOverallScore(
  conversionRate: number,
  avgLtv12: number,
  signups: number,
  efficiencyRatio: number
): { score: number; badge: string } {
  const sConv = Math.min(100, conversionRate * 2.0); // 50% = 100pts
  const sLtv = Math.min(100, (avgLtv12 / 200) * 100);  // $200 = 100pts
  const sSign = Math.min(100, (signups / 250) * 100);  // 250 = 100pts
  const sEff = Math.min(100, (efficiencyRatio / 8.0) * 100); // 8x = 100pts

  const score = Math.round((0.4 * sConv) + (0.3 * sLtv) + (0.2 * sSign) + (0.1 * sEff));

  let badge = "Weak";
  if (score >= 95) badge = "Elite";
  else if (score >= 85) badge = "Strong";
  else if (score >= 70) badge = "Good";
  else if (score >= 55) badge = "Average";

  return { score, badge };
}

/**
 * Normalizes code by stripping punctuation and spacing to automatically correct formatting differences
 */
export function toCanonicalCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s\-_./\\#@!*()\[\]{}|?~`':;,^$+%=]/g, "");
}

/**
 * Core engine. Searches uploaded data for matching discount codes and returns analysis reports.
 */
export function generateAnalysisReport(
  uploadedData: DiscountCodeData[],
  targetCodes: string[]
): {
  foundReports: AnalyzedCodeReport[];
  missingCodes: string[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
} {
  const foundReports: AnalyzedCodeReport[] = [];
  const missingCodes: string[] = [];

  // Index uploaded records by discount code for speedy O(1) matching (case-insensitive)
  const index = new Map<string, DiscountCodeData>();
  const canonicalIndex = new Map<string, DiscountCodeData>();

  uploadedData.forEach((row) => {
    const mainKey = row.discount_code.trim().toUpperCase();
    index.set(mainKey, row);
    
    const canKey = toCanonicalCode(row.discount_code);
    if (canKey && !canonicalIndex.has(canKey)) {
      canonicalIndex.set(canKey, row);
    }
  });

  // Perform search matching
  targetCodes.forEach((code) => {
    let matched = index.get(code);
    
    if (!matched) {
      // Try to fall back to formatting-only matching canonicalized key
      const canCode = toCanonicalCode(code);
      matched = canonicalIndex.get(canCode);
    }

    if (matched) {
      const signups = matched.Signups;
      const payingCx = matched["Paying cx"];
      const calculatedConversion = signups > 0 ? (payingCx / signups) * 100 : 0;
      
      // Calculate Efficiency Ratio: Sum LTV 12 ÷ ABS(total_discount_used)
      const absDiscount = Math.abs(matched.total_discount_used);
      const efficiencyRatio = absDiscount > 0 ? (matched["Sum LTV 12"] / absDiscount) : 0;

      // Calculate performance grading
      const performanceGrade = calculatePerformanceGrade(calculatedConversion);

      // Calculcate Overall Score out of 100
      const { score: overallScore, badge: overallScoreBadge } = calculateOverallScore(
        calculatedConversion,
        matched["Avg LTV 12"],
        signups,
        efficiencyRatio
      );

      foundReports.push({
        ...matched,
        Province: matched.Province || "ON",
        calculatedConversion,
        performanceRating: calculatePerformanceRating(signups, calculatedConversion),
        efficiencyRatio,
        overallScore,
        performanceGrade,
        overallScoreBadge
      });
    } else {
      missingCodes.push(code);
    }
  });

  // KPI calculations
  let totalSignups = 0;
  let totalPayingCustomers = 0;
  let totalLTV3 = 0;
  let totalLTV6 = 0;
  let totalLTV12 = 0;
  let sumLTV12Values = 0;
  let sumIndividualConversion = 0;

  foundReports.forEach((rep) => {
    totalSignups += rep.Signups;
    totalPayingCustomers += rep["Paying cx"];
    totalLTV3 += rep["Sum LTV 3"];
    totalLTV6 += rep["Sum LTV 6"];
    totalLTV12 += rep["Sum LTV 12"];
    sumLTV12Values += rep["Avg LTV 12"];
    sumIndividualConversion += rep.calculatedConversion;
  });

  const blendedConversionRate = totalSignups > 0 ? (totalPayingCustomers / totalSignups) * 100 : 0;
  const averageConversionRate = foundReports.length > 0 ? sumIndividualConversion / foundReports.length : 0;
  const averageLTV12 = foundReports.length > 0 ? sumLTV12Values / foundReports.length : 0;

  // Track Top Conversion performer and Best Overall score
  let topPerformingCodeCode = "N/A";
  let topPerformingCodeVal = 0;
  let bestOverallScoreCode = "N/A";
  let bestOverallScoreVal = 0;

  foundReports.forEach(rep => {
    if (rep.calculatedConversion > topPerformingCodeVal) {
      topPerformingCodeVal = rep.calculatedConversion;
      topPerformingCodeCode = rep.discount_code;
    }
    if (rep.overallScore > bestOverallScoreVal) {
      bestOverallScoreVal = rep.overallScore;
      bestOverallScoreCode = rep.discount_code;
    }
  });

  const summary: KPIReportSummary = {
    totalSignups,
    totalPayingCustomers,
    blendedConversionRate,
    totalLTV3,
    totalLTV6,
    totalLTV12,
    averageLTV12,
    averageConversionRate,
    numCodesFound: foundReports.length,
    numCodesMissing: missingCodes.length,
    topPerformingCodeCode,
    topPerformingCodeVal,
    bestOverallScoreCode,
    bestOverallScoreVal
  };

  // Group found codes by channel for leaderboard and breakdown
  const channelMap = new Map<string, {
    channel: string;
    codeCount: number;
    totalSignups: number;
    totalPayingCustomers: number;
    conversionSum: number;
    totalDiscount: number;
    totalLTV12: number;
  }>();

  foundReports.forEach((rep) => {
    const chan = rep.channel || "Direct / Unknown";
    const existing = channelMap.get(chan) || {
      channel: chan,
      codeCount: 0,
      totalSignups: 0,
      totalPayingCustomers: 0,
      conversionSum: 0,
      totalDiscount: 0,
      totalLTV12: 0
    };

    existing.codeCount += 1;
    existing.totalSignups += rep.Signups;
    existing.totalPayingCustomers += rep["Paying cx"];
    existing.conversionSum += rep.calculatedConversion;
    existing.totalDiscount += rep.total_discount_used;
    existing.totalLTV12 += rep["Sum LTV 12"];

    channelMap.set(chan, existing);
  });

  const channelSummary: ChannelSummary[] = Array.from(channelMap.values()).map(c => ({
    channel: c.channel,
    codeCount: c.codeCount,
    totalSignups: c.totalSignups,
    totalPayingCustomers: c.totalPayingCustomers,
    averageConversion: c.codeCount > 0 ? c.conversionSum / c.codeCount : 0,
    totalDiscount: c.totalDiscount,
    totalLTV12: c.totalLTV12
  })).sort((a, b) => b.totalSignups - a.totalSignups); // sort channels descending by active signups

  return {
    foundReports,
    missingCodes,
    summary,
    channelSummary
  };
}

/**
 * Handles exporting output data to sheets (multi-sheet workbook)
 * Sheet 1: Executive Summary
 * Sheet 2: Detailed Report
 * Sheet 3: Missing Codes
 * Sheet 4: Top Performers
 */
export function exportToExcelFile(
  summary: KPIReportSummary,
  reports: AnalyzedCodeReport[],
  missing: string[]
) {
  // Sheet 1: Executive Summary 
  const summaryRows = [
    ["EXECUTIVE INTEL REPORT - CAMPAIGN METRICS AUDIT"],
    ["Generated on:", new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()],
    [],
    ["Metric", "Value", "Notes"],
    ["Total Codes Submitted", reports.length + missing.length, "User query pool"],
    ["Total Codes Located", summary.numCodesFound, "Matched records across source file"],
    ["Total Codes Missing", summary.numCodesMissing, "Unregistered / untracked discount codes"],
    [],
    ["Key Operational KPI Metrics"],
    ["Total Signup Registrations", summary.totalSignups, "Top-of-funnel leads generated"],
    ["Total Paying Customers", summary.totalPayingCustomers, "Successfully acquired active buyers"],
    ["Blended Conversion Rate", (summary.blendedConversionRate / 100), "Overall conversion profile (Paying Customers / Signups)"],
    ["Average Individual Code Conversion Rate", (summary.averageConversionRate / 100), "Mean average of located codes"],
    ["Average LTV 12 Month Profile", summary.averageLTV12, "Customer lifetime valuation mean average value"],
    [],
    ["Financial Lifetime Values (Combined)"],
    ["Combined LTV (3 Months)", summary.totalLTV3, "Recognized customer cohorts value (3M)"],
    ["Combined LTV (6 Months)", summary.totalLTV6, "Recognized customer cohorts value (6M)"],
    ["Combined LTV (12 Months)", summary.totalLTV12, "Recognized customer cohorts value (12M)"],
    [],
    ["Champion Performer Assets"],
    ["Top Conversion Rate Code", `${summary.topPerformingCodeCode} (${summary.topPerformingCodeVal.toFixed(1)}%)`, "Best event audience response"],
    ["Best High-Overall Score Code", `${summary.bestOverallScoreCode} (${summary.bestOverallScoreVal}/100)`, "Best combined volume, LTV, conversion, and return coefficient"]
  ];

  // Sheet 2: Detailed Report Row formatting
  const reportHeader = [
    "Rank",
    "Discount Code",
    "Province",
    "Channel",
    "Signups",
    "Paying Customers",
    "Conversion %",
    "Avg LTV 3",
    "Avg LTV 6",
    "Avg LTV 12",
    "Total Discount Used ($)",
    "Efficiency Ratio",
    "Performance Grade",
    "Overall Score",
    "Overall Grade Tag"
  ];

  // Sort reports by overall score descending to display as ranked
  const rankedReports = [...reports].sort((a,b) => b.overallScore - a.overallScore);

  const reportRows = rankedReports.map((r, index) => [
    index + 1, // Rank
    r.discount_code,
    r.Province || "ON",
    r.channel,
    r.Signups,
    r["Paying cx"],
    r.calculatedConversion / 100, // percentage fraction
    r["Avg LTV 3"],
    r["Avg LTV 6"],
    r["Avg LTV 12"],
    r.total_discount_used,
    `${r.efficiencyRatio.toFixed(1)}x`,
    r.performanceGrade,
    r.overallScore,
    r.overallScoreBadge
  ]);

  // Sheet 3: Missing Codes list
  const missingRows = [
    ["CODES NOT FOUND IN SOURCE TRACKING SHEET"],
    ["Missing count:", missing.length],
    [],
    ["Discount Code Key"]
  ].concat(missing.map(m => [m]));

  // Sheet 4: Top Performers (Best Conversion, Highest LTV, Most Signups, Best Overall Score)
  const topConversion = [...reports].sort((a,b) => b.calculatedConversion - a.calculatedConversion)[0];
  const topLTV = [...reports].sort((a,b) => b["Sum LTV 12"] - a["Sum LTV 12"])[0];
  const topSignups = [...reports].sort((a,b) => b.Signups - a.Signups)[0];
  const topOverall = rankedReports[0];

  const topPerformersRows = [
    ["CHAMPION PERFORMERS LEADERBOARD"],
    [],
    ["Category", "Discount Code Name", "Metric Value", "Performance Grade", "Channel Source"],
    ["🏆 Best Conversion Rate", topConversion?.discount_code || "N/A", topConversion ? `${topConversion.calculatedConversion.toFixed(1)}%` : "N/A", topConversion?.performanceGrade || "N/A", topConversion?.channel || "N/A"],
    ["💰 Highest LTV (12M Combined)", topLTV?.discount_code || "N/A", topLTV ? `$${topLTV["Sum LTV 12"].toLocaleString()}` : "N/A", topLTV?.performanceGrade || "N/A", topLTV?.channel || "N/A"],
    ["📈 Most Signup Volume", topSignups?.discount_code || "N/A", topSignups ? `${topSignups.Signups.toLocaleString()} signups` : "N/A", topSignups?.performanceGrade || "N/A", topSignups?.channel || "N/A"],
    ["⭐ Best Overall Score", topOverall?.discount_code || "N/A", topOverall ? `${topOverall.overallScore}/100 (${topOverall.overallScoreBadge})` : "N/A", topOverall?.performanceGrade || "N/A", topOverall?.channel || "N/A"]
  ];

  // Build sheets
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  const wsReports = XLSX.utils.aoa_to_sheet([reportHeader, ...reportRows]);
  const wsMissing = XLSX.utils.aoa_to_sheet(missingRows);
  const wsTopRecs = XLSX.utils.aoa_to_sheet(topPerformersRows);
  
  // Format percentage column (column index 6 conversion is fraction, G column is index 6)
  const rngReports = XLSX.utils.decode_range(wsReports['!ref'] || 'A1');
  for (let r = 1; r <= rngReports.e.r; ++r) {
    const cellG = wsReports[XLSX.utils.encode_cell({ r: r, c: 6 })];
    if (cellG) cellG.z = "0.0%";
    const cellE = wsReports[XLSX.utils.encode_cell({ r: r, c: 4 })];
    if (cellE) cellE.z = "#,##0";
    const cellF = wsReports[XLSX.utils.encode_cell({ r: r, c: 5 })];
    if (cellF) cellF.z = "#,##0";
    const cellK = wsReports[XLSX.utils.encode_cell({ r: r, c: 10 })];
    if (cellK) cellK.z = "$#,##0";
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");
  XLSX.utils.book_append_sheet(wb, wsReports, "Detailed Report");
  XLSX.utils.book_append_sheet(wb, wsMissing, "Missing Codes");
  XLSX.utils.book_append_sheet(wb, wsTopRecs, "Top Performers");

  XLSX.writeFile(wb, "Event_Intelligence_Performance_Report.xlsx");
}

/**
 * Handles exporting output data to simple csv (Code report sheet)
 */
export function exportToCSVFile(reports: AnalyzedCodeReport[]) {
  const header = [
    "Rank",
    "Discount Code",
    "Province",
    "Channel",
    "Signups",
    "Paying Customers",
    "Conversion Rate %",
    "Avg LTV 3",
    "Avg LTV 6",
    "Avg LTV 12",
    "Total Discount Used",
    "Efficiency Ratio",
    "Performance Grade",
    "Overall Score",
    "Rating Tier"
  ];
  
  const ranked = [...reports].sort((a,b) => b.overallScore - a.overallScore);

  const rows = ranked.map((r, ix) => [
    ix + 1,
    r.discount_code,
    r.Province || "ON",
    r.channel,
    r.Signups,
    r["Paying cx"],
    r.calculatedConversion.toFixed(1),
    r["Avg LTV 3"],
    r["Avg LTV 6"],
    r["Avg LTV 12"],
    r.total_discount_used,
    `${r.efficiencyRatio.toFixed(1)}x`,
    r.performanceGrade,
    r.overallScore,
    r.overallScoreBadge
  ]);

  const csvContent = [header, ...rows].map(e => e.map(val => {
    const stringVal = String(val);
    if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  }).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "Event_Intelligence_Detailed_Report.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
