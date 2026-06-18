# BD Personalization, Comparison Redesign & Calendar Tab

**Date:** 2026-06-18  
**Status:** Approved — ready for implementation  
**Cycles:** 3 (implement in order — Cycle 1 is foundational)

---

## Cycle 1 — Wizard + Flow Personalization

### Persona Detection (implicit, no user prompt)

Derived from wizard state, not stored — recomputed on each render:

| Flow | BD Filter | Persona |
|------|-----------|---------|
| `paste` | n/a | `"bd-rep"` |
| `all` | on | `"bd-lead"` |
| `all` | off | `"neutral"` |
| `compare` | n/a | `"analyst"` |

`userPersona` is passed as a prop from `WizardFlow` down to the report tabs (alongside `selectedFlow`, which already flows through).

### EV / BD Filter Toggle

Location: inside the "All Database" flow panel in `WizardFlow.tsx`, below the existing "Analyze entire database" description text.

UI: A small toggle row — `[ BD codes only (EV prefix) ]` with a pill toggle switch. Off by default.

Behavior: when on, the rows passed to `useAnalysis` are pre-filtered:
```
dbRows.filter(r => r.discount_code.toUpperCase().startsWith("EV"))
```
The wizard shows a live count update: "Showing 47 BD codes" when toggled on vs "Showing 312 codes" when off.

State: add `bdFilter: boolean` (default `false`) to the existing wizard reducer/state in `WizardFlow.tsx`.

### Regional Tab Visibility

- `bd-rep`: Regional tab **hidden** — the tab button does not render
- `bd-lead`: Regional tab **visible and highlighted** (it's the primary value for this persona)
- `neutral`: Regional tab visible, unchanged

Tab visibility is controlled in the tab bar render in the report view. Pass `userPersona` to the tab bar component.

### Data Tab — Province Column

- `bd-rep`: Province column hidden in both the paginated view and the full-screen view
- All other personas: Province column shown as today

### Key Findings / Overview Tab Language

- `bd-rep`: Replace generic "campaign" language with event-specific language in the auto-generated findings:
  - "campaign performance" → "event performance"
  - "code" → "event code"
  - Insert BD-specific context line if avg conversion ≥ 40%: "Strong event — recommend returning next year."
  - Insert if avg conversion < 20%: "Below event threshold — review booth placement or offer."
- `bd-lead`: Add a portfolio summary line at top of overview: "Showing [N] BD event codes across [provinces]."
- `neutral`: Unchanged

### Context Banner

A slim, dismissible banner at the top of the report (below the tab bar) showing persona context. Already implemented as `ContextBanner.tsx` — wire it to `userPersona`:
- `bd-rep`: "BD Rep Mode — regional data hidden"
- `bd-lead`: "BD Lead Mode — EV portfolio filtered"
- `neutral`: banner hidden

### Regional Filter Chips

Location: regional tab header, above `ProvinceIntelligence`.

UI: Horizontal pill chips, one per unique province in `foundReports`. All selected by default. Clicking a chip toggles that province. At least one must remain selected (same pattern as tier filter chips in RevenueTab).

Behavior: filter the `foundReports` array passed to `ProvinceIntelligence` to only rows where `r.Province` is in the active set. If `r.Province` is undefined, treat as "ON" (existing convention).

State: `activeProvinces: Set<string>` — local state in `RegionalTab`.

---

## Cycle 2 — Comparison Mode Redesign

### Label Editions Step

After the user selects ≥ 2 codes in the compare flow and before clicking "Compare Codes," a new inline step appears: **"Label each edition."**

Each selected code gets a small text input pre-filled with the code name. The user overwrites with a meaningful label: "2022", "TELUS BC Year 3", etc. Labels must be non-empty (validate on submit).

State: `editionLabels: Record<string, string>` — maps `discount_code → label`. Lives in wizard state.

### Comparison Report UI

Replaces the current side-by-side comparison view. Layout: full-width, single column, scrollable.

**Section 1 — Trend Line (hero)**  
SVG line chart. X-axis: edition labels in selection order. Y-axis: conversion rate (%). Each point shows the conversion value. A dashed horizontal line at 40% marks the target. Color: FreshPrep green for the line, red dot for points below 40%.

**Section 2 — Volume Bars**  
Grouped bar chart per edition: signups (light green) + paying customers (dark green). Shows absolute volume trend.

**Section 3 — LTV Trajectory**  
Mini line chart: avg LTV 12 per edition. Label each point with `$` value. Shows if customer quality is improving.

**Section 4 — Verdict Card**  
Computed from the last 2 editions (most recent trend):
- "Trending up" if conversion improved AND (LTV or signups improved)
- "Trending down" if conversion dropped
- "Mixed" if metrics disagree
- "Insufficient data" if only 2 editions and they're equal

Verdict drives a recommendation line:
- Trending up: "Conversion and LTV are improving — strong case to return."
- Trending down: "Performance declining — reassess offer or venue before committing."
- Mixed: "Conversion up but LTV flat — consider refining the target audience."

**Section 5 — Code Detail Table**  
Compact table: code | label | signups | paying | conversion | LTV 12 | grade. Same as existing detailed table but with edition label replacing code name as primary identifier.

### No Regional Data in Comparison

The regional tab is hidden in compare flow (analyst persona doesn't need it — they're doing code-level analysis).

---

## Cycle 3 — Calendar Tab + Customer File

### Optional Secondary Upload

Location: paste flow report view only. A "Unlock Calendar" button appears in the tab bar (grayed out, with a `+` icon) when `userPersona === "bd-rep"`.

Clicking it opens a small upload modal: "Upload customer export to unlock the Calendar tab." Accepts CSV/XLSX. Parsed client-side only — no data leaves the browser.

### Customer File Schema

Expected columns (case-insensitive, flexible column order):
- `signup_date` — date string
- `client_id` — unique identifier
- `current_status` — `"active"` | `"paused"` | other
- `discount_code` — promo code (can be null/empty)
- `channel` — acquisition channel
- `province` — province code
- `first_paying_date` — date string (optional)
- `days till paying` — number (optional)

Rows where `discount_code` is null/empty are included in aggregate totals but not attributed to any event code.

### Calendar Tab

Appears in tab bar between Data and Issues tabs, only when customer file is loaded and `userPersona === "bd-rep"`.

**Month Grid view (default):**  
12-month rolling grid (current month + 11 prior months). Each cell shows:
- Total signups that month from EV codes
- Province breakdown as colored dots (one color per province)
- A "vs last year" delta badge: `+12` green or `-5` red

Clicking a month cell opens a drill-down panel showing:
- Active codes that month (linked to the main report)
- Signups per code
- Active vs paused customer counts per code

**YoY Comparison Panel:**  
Side-by-side month columns: "This year [month]" vs "Last year [month]". Shows: signups, paying, conversion rate, active/paused ratio. Difference highlighted.

**Month Totals Chart:**  
Horizontal bar chart: current year vs prior year bars per month (Jan–Dec). Quick visual of seasonal patterns and YoY growth.

### Data Types

New type `CustomerRecord` in `types.ts`:
```ts
interface CustomerRecord {
  signup_date: string;
  client_id: string;
  current_status: "active" | "paused" | string;
  discount_code: string | null;
  channel: string;
  province: string;
  first_paying_date?: string;
  days_till_paying?: number;
}
```

New hook `useCustomerData(rows: CustomerRecord[])` that derives:
- Monthly signups per code per province
- Active/paused counts per code
- YoY deltas

---

## File Impact Summary

| File | Cycle | Change |
|------|-------|--------|
| `src/features/wizard/WizardFlow.tsx` | 1 | Add `bdFilter` state, EV toggle UI, `userPersona` derivation, pass to report |
| `src/types.ts` | 1, 3 | Add `UserPersona` type, `CustomerRecord` type, `EditionLabel` |
| `src/features/report/tabs/RegionalTab.tsx` | 1 | Province filter chips, accept `userPersona` prop |
| `src/features/report/tabs/DataTab.tsx` | 1 | Hide Province column in `bd-rep` mode |
| `src/features/report/tabs/OverviewTab.tsx` | 1 | BD-aware findings language |
| `src/features/report/components/ContextBanner.tsx` | 1 | Wire to `userPersona` |
| `src/App.tsx` | 1 | Pass `userPersona` through to report |
| `src/features/wizard/WizardFlow.tsx` | 2 | Edition label step in compare flow |
| `src/features/report/tabs/` (new `ComparisonTab.tsx`) | 2 | Full comparison report UI |
| `src/hooks/useCustomerData.ts` (new) | 3 | Customer file parsing + derived data |
| `src/features/report/tabs/CalendarTab.tsx` (new) | 3 | Calendar UI |
| `src/features/wizard/components/CustomerUpload.tsx` (new) | 3 | Secondary file upload modal |

---

## Out of Scope

- Active/paused accounts metric in the main Looker-based report (deferred)
- Auto-grouping of event codes by name pattern (names are inconsistent)
- Any server-side processing — all client-side only
