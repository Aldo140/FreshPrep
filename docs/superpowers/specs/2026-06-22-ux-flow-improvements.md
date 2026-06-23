# UX Flow Improvements — Spec

**Date:** 2026-06-22
**Status:** Approved

---

## Problem

The dashboard has an invisible "mode wall": when Looker data is uploaded, Calendar and Fiscal tabs disappear — exactly when they are most enriched by that data. Province context resets on every tab switch. bd-rep personas are locked out of Regional. Comparison mode requires wizard re-entry. The Families view has 296 entries with no search. No data freshness signal exists. These gaps force users to hold context mentally rather than letting the UI carry it.

---

## Principle

Remove mode walls. Connect related views. Let data availability enrich, not gate.

---

## Changes

### Change 1 — Always show Calendar and Fiscal tabs

**File:** `src/features/report/ReportDashboard.tsx`

Remove this rule (currently line 121):
```tsx
if ((p.id === "calendar" || p.id === "fiscal") && foundReports.length > 0) return false;
```

Both tabs accept `foundReports` as a prop and handle the presence/absence of Looker data internally. CalendarTab enriches event family rows with conversion % and LTV when `foundReports` is available. FiscalTab already splits into "Event Volume" (customer data) and "Financial Performance" (Looker data) sections. Neither tab breaks without Looker data.

Also remove the redirect that fires when Looker data is added:
```tsx
// lines ~146-149 — remove:
if (foundReports.length > 0 && (reportPage === "calendar" || reportPage === "fiscal")) {
  setReportPage("overview");
}
```

Also remove the BD-only default redirect (currently sends users to Calendar when no Looker data is loaded, which is now unnecessary since Calendar is always visible):
```tsx
// lines ~127-129 — remove:
if (foundReports.length === 0 && !["calendar", "fiscal", "regional"].includes(reportPage)) {
  setReportPage("calendar");
}
```

Default starting page becomes `"overview"` unconditionally.

Also update `flowRelevance.ts` — `calendar` and `fiscal` are currently `none` for `all` and `paste` flows. Change both to `"full"` since these tabs now operate in all flows:
```ts
calendar: { all: "full", paste: "partial", compare: "partial" },
fiscal:   { all: "full", paste: "partial", compare: "partial" },
```
`compare: "partial"` — calendar/fiscal provide historical context even in compare mode; marking them `"none"` would hide them.

The data source bar (currently `foundReports.length === 0` gated) should remain visible whenever Calendar or Fiscal is the active tab, regardless of Looker data presence — it tells the user which customer dataset is loaded.

---

### Change 2 — Global province filter chip

**Files:** `src/features/report/ReportDashboard.tsx`, `src/features/report/tabs/CalendarTab.tsx`, `src/features/report/tabs/FiscalTab.tsx`, `src/features/report/tabs/RegionalTab.tsx`

**State:** Add `activeProvince: string | null` to `ReportDashboard` local state (null = All provinces).

**UI:** A compact pill row renders below the tab bar, above tab content, only when the active tab is one of `calendar`, `fiscal`, `regional`. Pills: one per province that has data, ordered by signup volume (already computed in `volume.eventsByProv` in FiscalTab and `eventStats` in useCustomerData). Include an "All" pill. Style matches existing province color scheme (`provColor(p)`).

**Prop threading:** Pass `activeProvince` and `onProvinceChange` down to CalendarTab, FiscalTab, RegionalTab.

**Per-tab behavior:**
- **CalendarTab:** In Families view, filter the displayed families to those whose `homeProvince === activeProvince` (or show all when null). In Heatmap view, pre-select the matching province column.
- **FiscalTab:** In "By Province" table, scroll-highlight the matching row (bold border, no hiding — all rows still visible). In the province drill-down modal opened from the totals row, pre-set `modalProvFilter` to `activeProvince`.
- **RegionalTab:** Filter the province table rows to the active province (or show all when null).

**Cross-tab linking:** When a user clicks a province name cell in FiscalTab's "By Province" table, call `onProvinceChange(prov)` — this sets the global chip without opening the modal. The existing modal click (on the "Events" count cell) remains unchanged.

**Deriving available provinces for the chip:** Compute from `customerData.eventStats` in ReportDashboard (already available as a prop). Extract unique `homeProvince` values, exclude `"??"`, sort by total signups descending.

---

### Change 3 — Comparison entry from Families view

**File:** `src/features/report/tabs/CalendarTab.tsx`

**Prop added:** `onCompareFamily?: (codes: string[]) => void`

Each event family row in the Families view that has 2+ instances gets a small "Compare" button on hover (or always visible on mobile). Clicking it calls `onCompareFamily` with the array of that family's event codes (e.g. `["EVSTAMPEDE10", "EVSTAMPEDE25", "EVSTAMPEDE26"]`).

**In ReportDashboard:** Wire `onCompareFamily`:
```tsx
onCompareFamily={(codes) => {
  onSetPastedCodes(codes);       // sets the codes in the wizard/app state
  onSetSelectedFlow("compare");  // switches to compare mode
  setReportPage("comparison");   // navigates to the Comparison tab
}}
```

`onSetPastedCodes` and `onSetSelectedFlow` are callbacks that already exist in App.tsx and are passed into the dashboard — check exact prop names and wire accordingly.

The "Compare" button renders only in the Families view, not the Heatmap view. It appears as a small text link (`text-[9px] font-mono text-[#2b5346] underline decoration-dotted cursor-pointer`) at the right edge of the family row header, after the signup count.

---

### Change 4 — Remove persona restriction on Regional

**File:** `src/features/report/ReportDashboard.tsx`

Remove this rule (line 115):
```tsx
if (p.id === "regional" && (userPersona === "bd-rep" || userPersona === "analyst")) return false;
```

Also remove the redirect that fires when a bd-rep or analyst is on the Regional tab:
```tsx
// lines ~133-136 — remove:
if (reportPage === "regional" && (userPersona === "bd-rep" || userPersona === "analyst")) {
  setReportPage("overview");
}
```

Regional tab content is unchanged. All personas see it.

---

### Change 5 — Fiscal: YTD vs same-period last year row

**File:** `src/features/report/tabs/FiscalTab.tsx`

In the "Fiscal Year over Year" table, add a third row below "Signups" labeled **"YTD signups"**.

**Logic:**
- `nowMk` is already computed (`YYYY-MM` string of today).
- For each FY in `volume.years`, compute YTD signups = sum of signups from events whose `eventMonth` falls within that FY's Jul–Jun range AND `eventMonth <= nowMk` (month key ≤ today).
- Only render this row if the current FY is in `volume.years` (i.e., we have data for the ongoing year).
- The delta column compares current FY's YTD vs prior FY's same-period YTD (prior FY months where the month-of-year ≤ month-of-year today).

**Implementation detail:** Add `ytdSignupsByFY: Record<string, number>` to the `volume` useMemo. For each event `e`, compute the "month of year" position (1–12 within the FY: Jul=1 … Jun=12). If that position ≤ the current month's position within the current FY, include it in YTD. This lets you correctly compare "through June" across both years.

**Display:** Same format as the Signups row — `fmtBig(n)` values, `↑/↓pct%` delta badge. The row label reads `"YTD (through [Mon YYYY])"` where Mon YYYY is derived from `nowMk`.

Row only renders when `volume.years.length >= 2` (same guard as the whole section) AND the latest year is the current FY.

---

### Change 6 — Families search

**File:** `src/features/report/tabs/CalendarTab.tsx`

A text `<input>` renders above the Families list, below the view toggle (Heatmap / Families). Placeholder: `Search event families...`. State: `familySearch: string`, local to CalendarTab, resets to `""` when switching to Heatmap view.

Filter logic: show a family row if `family.stem.toLowerCase().includes(familySearch.toLowerCase())` OR any of the family's codes includes the search string.

The `family.stem` is the common code prefix used to group instances (e.g. `"EVSTAMPEDE"`). This already exists in CalendarTab's grouping logic.

Input style matches the search bar added to the Fiscal modal: `text-[11px] font-mono px-3 py-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa]`.

When the search yields 0 results, show a centered `"No families match"` row in the list area.

---

### Change 7 — Data freshness badge

**Files:** `src/features/report/ReportDashboard.tsx`, `src/features/report/tabs/CalendarTab.tsx`

**Logic:** The last event month in the dataset is already derivable from `customerData.eventStats` — `max(eventStats.map(e => e.eventMonth))`. Compute a `dataThrough: string` value (formatted as `"Jun 2026"`) and a `dataAge` in months from today.

**Display locations:**
1. **Data source bar** in ReportDashboard (the bar that shows the CSV filename or "Built-in BD Events DB") — append `· data through Jun 2026` in `text-[9px] font-mono text-[#a1a1a1]`.
2. If `dataAge > 3` months, replace the grey text with amber (`text-[#c9a000]`) and show: `· data through Jun 2026 · consider uploading newer data`.

**No modal, no blocking UI** — purely informational inline text. The existing upload button in the data source bar already provides the action.

CalendarTab's coverage stats section (the `"2024 · 4,551 signups · 149 events"` strip) already computes year-by-year ranges — no change needed there, the data source bar handles the freshness signal.

---

## File Change Summary

| File | Changes |
|---|---|
| `src/features/report/ReportDashboard.tsx` | Remove Calendar/Fiscal hiding (1), remove bd-rep/analyst Regional gate (4), add `activeProvince` state + chip UI + prop threading (2), wire `onCompareFamily` (3), default page → `"overview"` (1) |
| `src/config/flowRelevance.ts` | calendar/fiscal relevance: `all`→`"full"`, `paste`→`"partial"` (1) |
| `src/features/report/tabs/CalendarTab.tsx` | Accept `activeProvince` prop (2), `onCompareFamily` prop (3), family search input (6), freshness badge (7) |
| `src/features/report/tabs/FiscalTab.tsx` | Accept `activeProvince` prop + highlight row (2), YTD same-period row in volume memo + table (5) |
| `src/features/report/tabs/RegionalTab.tsx` | Accept `activeProvince` prop + filter rows (2) |

No new files. No new npm dependencies.

---

## Non-goals

- No tab grouping / nav restructure
- No URL-based state persistence (province filter is session-only)
- No mobile layout changes
- No changes to WizardFlow or UploadFlow
- No changes to Performance, Revenue, Data, Issues, Overview, or Comparison tabs

---

## Acceptance criteria

1. Calendar tab visible in all modes (with and without Looker data).
2. Fiscal tab visible in all modes (with and without Looker data).
3. Default landing page is Overview in all modes.
4. Province chip appears when on Calendar, Fiscal, or Regional tab; selecting a province filters all three tabs consistently.
5. Clicking a province name in Fiscal's "By Province" table sets the global province chip.
6. bd-rep and analyst personas can navigate to Regional tab.
7. Families view with 2+ instances shows a "Compare" link; clicking pre-fills compare mode and navigates to Comparison tab.
8. Fiscal "Fiscal Year over Year" table shows a "YTD (through Mon YYYY)" row comparing current-year YTD to same months last year.
9. Families search input filters families by stem or code; empty result shows "No families match".
10. Data source bar shows "data through [Mon YYYY]"; turns amber when data is >3 months old.
