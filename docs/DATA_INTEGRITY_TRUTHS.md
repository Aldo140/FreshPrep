# FreshPrep BD Campaign Intelligence — Data Integrity Truths

> **Purpose:** These are the invariants that govern every metric in the app. Never change a calculation without first checking it against these rules. If a displayed number doesn't match these truths, the bug is in the code — not here.

---

## 1. Conversion Rate

### Blended (portfolio-level)
```
Blended Conv = total Looker paying ÷ total Looker signups
```
- Both numerator AND denominator come from the same source (Looker export).
- **Never** use DB signups as the denominator for a Looker-paying numerator.
- Displayed as a percentage: `(paying / signups) × 100`.
- Typical healthy range: 30–40%.

### Per-code (row-level)
```
Code Conv = code["Paying cx"] ÷ code.Signups
```
- `calculatedConversion` on `AnalyzedCodeReport` is already a percentage (0–100).
- Computed in `useAnalysis.ts`, never recomputed in render.

### Province-level
```
Province Conv = provMap[prov].paying ÷ provMap[prov].signups
```
- `provMap.paying` = sum of `r["Paying cx"] / n_provinces` for each multi-province code.
- `provMap.signups` = sum of `r.Signups / n_provinces` for each multi-province code.
- Same division logic for numerator AND denominator — never mix sources.

---

## 2. Fiscal Year Definition

```
FY ends the June 30 of the labeled year.
Jul 2025 – Jun 2026 = FY2026.
```

Month key format: `YYYY-MM` (e.g., `"2025-09"`).

```typescript
function fiscalYear(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `FY${m >= 7 ? y + 1 : y}`;
}
```

Do not change this function. It is the single source of truth for FY assignment.

---

## 3. Province Attribution

### From static signup DB (Calendar/Fiscal event volume)
- `e.homeProvince` = the province where the majority of signups for that event came from.
- Computed in `useCustomerData.ts`. Do not recompute in tabs.
- AB Team override: ~185 codes run by AB team in BC cities are forcibly set to `homeProvince = "AB"` in `CalendarTab.tsx` via `normalizedStats` useMemo (see `AB_TEAM_CODES` Set).

### From Looker export (financial metrics)
- `r.Province` may be `"BC"`, `"AB"`, `"BC+AB"`, etc. — compound strings joined by `+`.
- Multi-province codes are split: each province receives `1/n` of the metrics.
- Province financial totals are **approximate** — state this in the UI.

---

## 4. LTV

- `r["Sum LTV 12"]` = total 12-month LTV for all paying customers from that code.
- `r["Avg LTV 12"]` = average per paying customer for that code.
- Total portfolio LTV = `sum of r["Sum LTV 12"]` (not `sum of Avg LTV 12`).
- Average LTV across codes = `sum of r["Avg LTV 12"] / n_codes` (simple average of per-code averages, **not** weighted by paying count — this is a known approximation).

---

## 5. Channel Classification

Order of precedence:
1. `r.channel` from Looker export (if present and not "Direct / Unknown").
2. `staticCodeChannelMap` — dominant channel from the built-in signup DB.
3. EV-prefix rule: any code starting with `EV` (case-insensitive) is treated as `Events` channel.
4. BD registry: code in `verifiedStaticBdCodeSet` → `BusinessDevelopment`.

Normalization (used for comparison):
```typescript
const normalize = (ch: string) => ch.replace(/[\s_-]/g, "").toLowerCase();
// "BusinessDevelopment", "Business Development", "business_development" → "businessdevelopment"
// "Events" → "events"
```

### EV-prefix toggle
- **Calendar tab:** `calEvStrict = false` (default) → all `EV*` codes count as Events regardless of channel tag.
- **Other tabs:** `evOverride = true` (default) → same EV-prefix inclusion behavior.
- These are opt-OUT toggles — the user can turn them OFF to use strict channel tagging.

---

## 6. DB vs Looker — What Lives Where

| Field | Source | Notes |
|---|---|---|
| Event signups (raw) | Static signup DB (`staticSignups.rows`) | All BD/EV events Jul 2024 – Jun 2026 |
| eventDate, eventMonth | Static DB via `useCustomerData` | Derived from signup timestamps |
| homeProvince | Computed from static DB | Majority-province per event |
| Paying cx | Looker export | Requires user upload |
| Sum LTV 12 | Looker export | Requires user upload |
| Avg LTV 12 | Looker export | Requires user upload |
| calculatedConversion | Computed: `Paying cx / Signups` | In `useAnalysis.ts` |
| Total Spend / Event Spend | BD spreadsheet (optional) | Only if cost data uploaded |

**Mixing sources in a single metric is forbidden.** (e.g., Looker paying ÷ DB signups = wrong conversion.)

---

## 7. Fiscal Tab — Channel Filters (FY/Team)

When `selectedFY` is set in FiscalTab:
- `visibleEventStats` = eventStats filtered to only events where `fiscalYear(e.eventMonth) === selectedFY`.
- `visibleReports` = foundReports filtered to codes that appear in visibleEventStats.
- **The FY filter on reports is code-based** (does the code have events in that FY?), not a date filter on Looker data (Looker data is all-time and cannot be segmented by FY).

When `teamFilter` is set:
- `"ib"` → code starts with `EVIB`
- `"events"` → code starts with `EV` but NOT `EVIB`
- `"bd"` → code starts with `BD`
- `"all"` → no filter

---

## 8. Static DB — Built-in Codes

- The built-in DB covers codes from **Jul 1, 2024 – Jul 6, 2026** (2 fiscal years).
- There are approximately **681 unique BD/EV codes** in the built-in DB.
- The built-in DB is loaded by `useStaticSignups.ts` from a bundled JSON/CSV at `/assets/`.
- When a user uploads their own Client LTV (Looker export), the app MERGES the user file + built-in DB rows:
  - User file rows take precedence (no deduplication conflict since they come from different systems).
  - Only BD/EV rows from the static DB are merged in (non-BD static rows are excluded).

---

## 9. Score Calculation

```
overallScore = (conversionScore × 0.5) + (ltvScore × 0.3) + (volumeScore × 0.2)
```
- Computed in `useAnalysis.ts`.
- Only applies when Looker data is present.
- Do not recalculate in tabs — read from `r.overallScore`.

---

## 10. Province Colors (UI constants — never change arbitrarily)

```typescript
const PROV_COLOR = {
  BC: "#4d8970",
  AB: "#c9a000",
  ON: "#2b5346",
  QC: "#9b4a1c",
  SK: "#6b8e9f",
  MB: "#8a6f00",
};
```

These same values must appear in every tab, map, and chart. Do not introduce new province colors.

---

## 11. What Must Not Change Without a Review

1. `fiscalYear()` function — affects all FY grouping.
2. `matchesChannelScope()` in ReportDashboard — governs all channel filtering.
3. `provMap` accumulation logic in FiscalTab — governs province financial metrics.
4. `effectiveCustomerRows` merge logic in App.tsx — governs what signup rows reach `useCustomerData`.
5. `bdFilteredReports` / `bdFilteredDbRows` filters in App.tsx — govern what reaches the report tabs.
6. `calculatedConversion` field on `AnalyzedCodeReport` — this is already computed; never divide again in UI.
7. The `AB_TEAM_CODES` set in CalendarTab — province override for ~185 AB-team BC-city events.

---

*Last updated: Jul 6, 2026. Maintained alongside the codebase — update when any of the above truths change.*
