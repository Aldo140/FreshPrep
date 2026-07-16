// Single source of truth for the built-in BD Events DB version.
// Values are rewritten by `node scripts/update-builtin-db.mjs <export.csv>`
// whenever public/data/signups.csv is refreshed — don't edit them by hand.
export const BUILTIN_DB = {
  codeCount: 688,
  startLabel: "Jul 1, 2024",
  endLabel: "Jul 15, 2026",
  startMonthLabel: "Jul 2024",
  endMonthLabel: "Jul 2026",
  endShortLabel: "Jul 15",
  fiscalYears: "FY25–FY26",
  fiscalYearCount: 2,
} as const;

export const BUILTIN_DB_RANGE_LABEL = `${BUILTIN_DB.startLabel} – ${BUILTIN_DB.endLabel}`;
