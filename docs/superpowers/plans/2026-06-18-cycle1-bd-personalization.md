# Cycle 1 — BD Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive a `userPersona` from how the user entered the report (paste = BD rep, all+EV = BD lead), then personalize the report UI: hide regional tab for BD reps, add a BD filter toggle in the wizard, show context banners, adjust findings language, and add province filter chips on the regional tab.

**Architecture:** `userPersona` is derived inside `useAnalysis` from `selectedFlow` + new `bdFilter` boolean state, then flows as a prop through `App → ReportDashboard → tabs`. No new routes or data fetching — pure derived state.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide icons. No new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Modify | Add `UserPersona` type |
| `src/hooks/useAnalysis.ts` | Modify | Add `bdFilter` state, derive `userPersona`, export both |
| `src/features/wizard/WizardFlow.tsx` | Modify | EV toggle in "all" panel; filter codes before `compilePortfolio` |
| `src/App.tsx` | Modify | Pass `userPersona` to `ReportDashboard` |
| `src/features/report/ReportDashboard.tsx` | Modify | Accept `userPersona`; hide regional tab; show `ContextBanner`; pass persona to tabs |
| `src/features/report/components/KeyFindingsSection.tsx` | Modify | Accept `userPersona`; inject BD-specific verdict lines |
| `src/features/report/tabs/OverviewTab.tsx` | Modify | Accept `userPersona`; pass to `KeyFindingsSection`; add portfolio line for `bd-lead` |
| `src/features/report/tabs/DataTab.tsx` | Modify | Accept `userPersona`; hide Province badge for `bd-rep` |
| `src/features/report/tabs/RegionalTab.tsx` | Modify | Province filter chips with local `activeProvinces` Set state |
| `src/config/flowRelevance.ts` | Modify | Add `analyst` to `AnalysisFlow`-keyed maps (regional = hidden for analyst) |

---

## Task 1: Add `UserPersona` type to `src/types.ts`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add the type**

Open `src/types.ts`. After line `export type AnalysisFlow = "paste" | "all" | "compare";`, add:

```ts
export type UserPersona = "bd-rep" | "bd-lead" | "neutral" | "analyst";
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: no new errors (the pre-existing `fileParser` error is unrelated and can be ignored throughout this plan).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add UserPersona type"
```

---

## Task 2: Add `bdFilter` + `userPersona` to `useAnalysis`

**Files:**
- Modify: `src/hooks/useAnalysis.ts`

- [ ] **Step 1: Add imports and extend interfaces**

In `src/hooks/useAnalysis.ts`, add `UserPersona` to the import at line 2:

```ts
import { DiscountCodeData, AnalysisFlow, UserPersona } from "../types";
```

In `AnalysisState` interface, add two fields after `eventDate: string;`:

```ts
  bdFilter: boolean;
  userPersona: UserPersona;
```

In `AnalysisActions` interface, add after `setEventDate`:

```ts
  setBdFilter: (on: boolean) => void;
```

- [ ] **Step 2: Add `bdFilter` state and derive `userPersona`**

Inside the `useAnalysis` function body, after the `const [eventDate, setEventDate] = useState("")` line, add:

```ts
  const [bdFilter, setBdFilter] = useState(false);

  const userPersona = useMemo((): UserPersona => {
    if (selectedFlow === "paste") return "bd-rep";
    if (selectedFlow === "all" && bdFilter) return "bd-lead";
    if (selectedFlow === "compare") return "analyst";
    return "neutral";
  }, [selectedFlow, bdFilter]);
```

- [ ] **Step 3: Reset `bdFilter` on `reset()`**

Inside the `reset` callback, add `setBdFilter(false);` alongside the other resets.

- [ ] **Step 4: Expose `bdFilter` and `userPersona` in the returned state, and `setBdFilter` in actions**

In the `return` statement's `state` object, add after `eventDate`:

```ts
      bdFilter, userPersona,
```

In the `actions` object, add after `setEventDate`:

```ts
      setBdFilter,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAnalysis.ts
git commit -m "feat: derive userPersona from selectedFlow + bdFilter in useAnalysis"
```

---

## Task 3: EV/BD filter toggle in WizardFlow

**Files:**
- Modify: `src/features/wizard/WizardFlow.tsx`

- [ ] **Step 1: Wire `bdFilter` from analysis state**

`WizardFlow` already destructures `const { state, actions } = analysis;`. No prop changes needed — `state.bdFilter` and `actions.setBdFilter` are now available.

- [ ] **Step 2: Compute filtered EV codes inside the component**

Directly inside the `WizardFlow` function body (before the return), add:

```tsx
  const evCodes = fileState.uniqueDbCodes.filter(c => c.toUpperCase().startsWith("EV"));
  const bdDisplayCount = state.bdFilter ? evCodes.length : fileState.uniqueDbCodes.length;
```

- [ ] **Step 3: Replace the "ALL flow" panel content**

Find the block starting with `{state.selectedFlow === "all" && (` (around line 371). Replace the inner content — keep the outer `<div className="flex flex-col items-center py-4 gap-4" id="panel-all-flow">` wrapper but replace everything inside it with:

```tsx
  <p className="text-sm text-[#3d3d3d] text-center max-w-sm leading-relaxed">
    Analyze{" "}
    <strong className="text-[#1a1a1a]">
      {bdDisplayCount.toLocaleString()} {state.bdFilter ? "BD event" : ""} codes
    </strong>{" "}
    in your dataset.
  </p>

  {/* BD filter toggle */}
  <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#e5e5e5] bg-[#f8f7f5] cursor-pointer select-none">
    <div
      onClick={() => actions.setBdFilter(!state.bdFilter)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${
        state.bdFilter ? "bg-[#2b5346]" : "bg-[#d4d4d4]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
          state.bdFilter ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </div>
    <span className="text-xs text-[#3d3d3d] font-medium">
      BD codes only
      <span className="block text-[10px] text-[#a1a1a1] font-normal mt-0.5">
        Filter to EV-prefix codes ({evCodes.length.toLocaleString()} codes)
      </span>
    </span>
  </label>

  <button
    onClick={() => actions.compilePortfolio(state.bdFilter ? evCodes : fileState.uniqueDbCodes)}
    className="px-6 py-2.5 rounded-lg bg-[#2b5346] hover:bg-[#0d3a2f] text-white font-semibold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
    style={{ transition: "background-color 150ms var(--ease-out), transform 100ms var(--ease-out)" }}
    onMouseDown={pressMd}
    onMouseUp={pressUp}
    onMouseLeave={pressUp}
  >
    <BarChart3 className="w-4 h-4" />
    Analyze{state.bdFilter ? " BD" : " All"} Codes
  </button>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/wizard/WizardFlow.tsx
git commit -m "feat: EV/BD filter toggle in All Database wizard panel"
```

---

## Task 4: Pass `userPersona` through App → ReportDashboard

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/report/ReportDashboard.tsx`

- [ ] **Step 1: Add `UserPersona` import and `userPersona` prop to `ReportDashboard`**

In `src/features/report/ReportDashboard.tsx`, add `UserPersona` to the import from `../../types`:

```ts
import {
  ReportPage,
  ActiveTab,
  AnalysisFlow,
  UserPersona,        // add this
  AnalyzedCodeReport,
  KPIReportSummary,
  ChannelSummary,
  DiscountCodeData,
} from "../../types";
```

Add `userPersona: UserPersona;` to the `ReportDashboardProps` interface, after `selectedFlow: AnalysisFlow;`.

Destructure it in the function body: add `userPersona,` to the destructuring block.

- [ ] **Step 2: Pass `userPersona` from `App.tsx`**

In `src/App.tsx`, add `userPersona={analysis.state.userPersona}` to the `<ReportDashboard>` JSX props, after `selectedFlow={analysis.state.selectedFlow}`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/features/report/ReportDashboard.tsx
git commit -m "feat: thread userPersona from useAnalysis through App to ReportDashboard"
```

---

## Task 5: Hide regional tab + show ContextBanner in ReportDashboard

**Files:**
- Modify: `src/features/report/ReportDashboard.tsx`

- [ ] **Step 1: Import ContextBanner**

In `src/features/report/ReportDashboard.tsx`, add the import:

```ts
import { ContextBanner } from "./components/ContextBanner";
```

- [ ] **Step 2: Filter pages based on `userPersona`**

Find the `const pages: { id: ReportPage; label: string }[] = [...]` array. Replace it with:

```ts
  const allPages: { id: ReportPage; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "revenue", label: "Revenue" },
    { id: "regional", label: "Regional" },
    { id: "data", label: "Data" },
    {
      id: "issues",
      label: `Issues${missingCodes.length > 0 ? ` (${missingCodes.length})` : ""}`,
    },
  ];

  const pages = allPages.filter(p => {
    if (p.id === "regional" && (userPersona === "bd-rep" || userPersona === "analyst")) return false;
    return true;
  });
```

- [ ] **Step 3: Redirect away from regional if it becomes hidden**

After the `pages` declaration, add a `useEffect` that redirects to "overview" if the current page is hidden:

First add `useEffect` to the React import at the top of the file:
```ts
import React, { useEffect } from "react";
```

Then add after the `pages` declaration:
```ts
  useEffect(() => {
    if (reportPage === "regional" && (userPersona === "bd-rep" || userPersona === "analyst")) {
      setReportPage("overview");
    }
  }, [userPersona, reportPage, setReportPage]);
```

- [ ] **Step 4: Add ContextBanner below the tab bar**

Find the closing `</div>` of the sticky page navigation section (the one containing `{pages.map(page => ...}` and the back/reset buttons). Directly after that closing `</div>`, add:

```tsx
      {/* Persona context banner */}
      {(userPersona === "bd-rep" || userPersona === "bd-lead") && (
        <div className="px-4 pt-3 max-w-6xl mx-auto w-full">
          <ContextBanner
            title={userPersona === "bd-rep" ? "BD Rep Mode" : "BD Lead Mode"}
            message={
              userPersona === "bd-rep"
                ? "Regional tab hidden — you're viewing event-level performance for your submitted codes."
                : "Showing BD event codes only (EV prefix). Regional tab available for province breakdown."
            }
          />
        </div>
      )}
```

- [ ] **Step 5: Pass `userPersona` to tabs that need it**

In the page content section, update three tab renders:

**OverviewTab** — add `userPersona={userPersona}`:
```tsx
        {reportPage === "overview" && (
          <OverviewTab
            foundReports={foundReports}
            summary={summary}
            fileName={fileName}
            dbRowCount={dbRows.length}
            portfolioHealth={portfolioHealth}
            selectedFlow={selectedFlow}
            userPersona={userPersona}
            eventName={eventName}
            eventDate={eventDate}
            onNavigate={setReportPage}
          />
        )}
```

**RegionalTab** — add `userPersona={userPersona}`:
```tsx
        {reportPage === "regional" && (
          <RegionalTab
            dbRows={dbRows}
            foundReports={foundReports}
            selectedFlow={selectedFlow}
            userPersona={userPersona}
          />
        )}
```

**DataTab** — add `userPersona={userPersona}`:
```tsx
        {reportPage === "data" && (
          <DataTab
            foundReports={foundReports}
            uniqueChannels={uniqueChannels}
            dbRows={dbRows}
            fileName={fileName}
            selectedFlow={selectedFlow}
            userPersona={userPersona}
            onSwitchToExplorer={() => setActiveTab("explorer")}
          />
        )}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: TypeScript will now complain about missing `userPersona` prop on `OverviewTab`, `RegionalTab`, and `DataTab` — that's expected and will be fixed in Tasks 6–8.

- [ ] **Step 7: Commit**

```bash
git add src/features/report/ReportDashboard.tsx
git commit -m "feat: hide regional tab for bd-rep/analyst, show persona context banner"
```

---

## Task 6: BD language in KeyFindingsSection + OverviewTab

**Files:**
- Modify: `src/features/report/components/KeyFindingsSection.tsx`
- Modify: `src/features/report/tabs/OverviewTab.tsx`

- [ ] **Step 1: Add `userPersona` prop to `KeyFindingsSection`**

In `src/features/report/components/KeyFindingsSection.tsx`, add `UserPersona` to imports:

```ts
import { AnalyzedCodeReport, KPIReportSummary, UserPersona } from "../../../types";
```

Extend the `KeyFindingsSectionProps` interface — add:
```ts
  userPersona: UserPersona;
```

Destructure in function signature:
```ts
export default function KeyFindingsSection({ reports, summary, eventDate, userPersona }: KeyFindingsSectionProps) {
```

- [ ] **Step 2: Inject BD-specific verdict finding**

At the end of the findings array build block (after all existing `findings.push(...)` calls, before the return), add:

```ts
  // BD-specific verdict
  if (userPersona === "bd-rep") {
    if (summary.blendedConversionRate >= 40) {
      findings.push({
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        text: <>Strong event — recommend returning next year.</>,
        tone: "good",
      });
    } else if (summary.blendedConversionRate < 20) {
      findings.push({
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        text: <>Below event threshold — review booth placement or offer before committing to a return.</>,
        tone: "bad",
      });
    }
  }
```

- [ ] **Step 3: Add `userPersona` prop to `OverviewTab`**

In `src/features/report/tabs/OverviewTab.tsx`, add `UserPersona` to the types import:

```ts
import { AnalyzedCodeReport, KPIReportSummary, ReportPage, AnalysisFlow, UserPersona } from "../../../types";
```

In the `OverviewTabProps` interface, add after `selectedFlow: AnalysisFlow;`:
```ts
  userPersona: UserPersona;
```

Destructure `userPersona` in the function signature alongside the other props.

- [ ] **Step 4: Pass `userPersona` to `KeyFindingsSection`**

Find the `<KeyFindingsSection reports={foundReports} summary={summary} eventDate={eventDate} />` usage in `OverviewTab.tsx` and add the prop:

```tsx
<KeyFindingsSection reports={foundReports} summary={summary} eventDate={eventDate} userPersona={userPersona} />
```

- [ ] **Step 5: Add BD lead portfolio summary line**

In `OverviewTab.tsx`, find the section that renders the report title/headline (around where `eventName` is used, roughly line 60–70). After the existing headline block, add:

```tsx
{userPersona === "bd-lead" && (
  <p className="text-xs text-[#2b5346] bg-[#eef4f1] border border-[#2b5346]/20 rounded-lg px-3 py-2 font-mono mt-2">
    Showing {foundReports.length} BD event codes across{" "}
    {Array.from(new Set(foundReports.map(r => r.Province ?? "ON"))).join(", ")}
  </p>
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: errors on `RegionalTab` and `DataTab` still (not yet fixed). No new errors from these files.

- [ ] **Step 7: Commit**

```bash
git add src/features/report/components/KeyFindingsSection.tsx src/features/report/tabs/OverviewTab.tsx
git commit -m "feat: BD-specific findings verdict and portfolio headline in OverviewTab"
```

---

## Task 7: Hide Province column in DataTab for `bd-rep`

**Files:**
- Modify: `src/features/report/tabs/DataTab.tsx`

- [ ] **Step 1: Add `UserPersona` to DataTab props**

In `src/features/report/tabs/DataTab.tsx`, add `UserPersona` to the types import:

```ts
import { AnalyzedCodeReport, DiscountCodeData, AnalysisFlow, UserPersona } from "../../../types";
```

In the `DataTabProps` interface (near the top of the file), add:
```ts
  userPersona: UserPersona;
```

Destructure `userPersona` in the `DataTab` function signature.

Also add `userPersona` to the `FullscreenView` component's props interface and pass it through from `DataTab` to `FullscreenView`.

- [ ] **Step 2: Hide Province badge in paginated table rows**

In the paginated table section, find the Province badge render (around line 479–485):

```tsx
{r.Province && r.Province !== "ON" && (
  <span className="text-[9px] text-[#a1a1a1] font-mono bg-[#f0f0f0] px-1 rounded">{r.Province}</span>
```

Wrap it with a persona check:

```tsx
{userPersona !== "bd-rep" && r.Province && r.Province !== "ON" && (
  <span className="text-[9px] text-[#a1a1a1] font-mono bg-[#f0f0f0] px-1 rounded">{r.Province}</span>
```

- [ ] **Step 3: Hide Province badge in FullscreenView cards**

In `FullscreenView`, find the Province badge (around the section where `r.Province` is rendered inside the card body — `r.Province && r.Province !== "ON"`). Wrap it with:

```tsx
{userPersona !== "bd-rep" && r.Province && r.Province !== "ON" && (
  <span className="mt-1 inline-block text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-[#f5f5f3] text-[#a0a0a0] border border-[#e8e8e8]">
    {r.Province}
  </span>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: only `RegionalTab` error remains.

- [ ] **Step 5: Commit**

```bash
git add src/features/report/tabs/DataTab.tsx
git commit -m "feat: hide Province column in DataTab for bd-rep persona"
```

---

## Task 8: Province filter chips in RegionalTab

**Files:**
- Modify: `src/features/report/tabs/RegionalTab.tsx`

- [ ] **Step 1: Add `UserPersona` to RegionalTab props**

In `src/features/report/tabs/RegionalTab.tsx`, add `UserPersona` to the types import:

```ts
import { AnalyzedCodeReport, DiscountCodeData, AnalysisFlow, UserPersona } from "../../../types";
```

In the `RegionalTabProps` interface, add:
```ts
  userPersona: UserPersona;
```

Destructure `userPersona` in the function signature.

- [ ] **Step 2: Add `activeProvinces` local state**

Add `useState` to the React import: `import React, { useState } from "react";`

Inside the `RegionalTab` function, add:

```ts
  const allProvinces = Array.from(
    new Set(foundReports.map(r => r.Province ?? "ON"))
  ).sort();

  const [activeProvinces, setActiveProvinces] = useState<Set<string>>(
    () => new Set(allProvinces)
  );

  const toggleProvince = (p: string) => {
    setActiveProvinces(prev => {
      if (prev.size === 1 && prev.has(p)) return prev; // keep at least one
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const filteredReports = foundReports.filter(r => activeProvinces.has(r.Province ?? "ON"));
```

- [ ] **Step 3: Render province filter chips above ProvinceIntelligence**

Find the section in the return where `<ProvinceIntelligence dbRows={dbRows} foundReports={foundReports} />` is rendered. Replace `foundReports={foundReports}` with `foundReports={filteredReports}`.

Then, above `<ProvinceIntelligence>`, add the filter chips row:

```tsx
{allProvinces.length > 1 && (
  <div className="flex items-center gap-2 flex-wrap mb-4">
    <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] shrink-0">Province</span>
    {allProvinces.map(p => (
      <button
        key={p}
        onClick={() => toggleProvince(p)}
        className={`px-3 py-1 rounded-full text-[10.5px] font-mono font-semibold cursor-pointer border transition-colors ${
          activeProvinces.has(p)
            ? "bg-[#2b5346] text-white border-[#2b5346]"
            : "bg-white text-[#a1a1a1] border-[#e5e5e5] hover:border-[#2b5346]/40"
        }`}
      >
        {p}
      </button>
    ))}
    {activeProvinces.size < allProvinces.length && (
      <button
        onClick={() => setActiveProvinces(new Set(allProvinces))}
        className="text-[10px] font-mono text-[#2b5346] hover:underline cursor-pointer"
      >
        Show all
      </button>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -v "fileParser"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/report/tabs/RegionalTab.tsx
git commit -m "feat: province filter chips on regional tab"
```

---

## Task 9: Final smoke test + push

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Smoke test paste flow (BD rep persona)**

1. Upload the FreshPrep dataset
2. Select "Specific Codes", paste 2–3 EV codes, click Analyze
3. Verify: Regional tab is **absent** from the tab bar
4. Verify: ContextBanner reads "BD Rep Mode — regional data hidden"
5. Open Data tab, click Full Screen View → Province badges should be hidden
6. Check Overview → Key Findings should include the "Strong event / below threshold" verdict line

- [ ] **Step 3: Smoke test all+EV flow (BD lead persona)**

1. Back to wizard, select "Full Dataset"
2. Toggle "BD codes only" ON
3. Verify the count updates to show only EV codes
4. Click Analyze BD Codes
5. Verify: Regional tab **is present**
6. Verify: ContextBanner reads "BD Lead Mode — EV portfolio filtered"
7. Check Overview → portfolio summary line shows provinces

- [ ] **Step 4: Smoke test regional filter chips**

1. Run full dataset (no EV filter)
2. Navigate to Regional tab
3. Verify province chips appear
4. Click a province chip — data should filter
5. Try to deselect the last chip — should be blocked

- [ ] **Step 5: Smoke test neutral (all flow, no filter)**

1. Full Dataset, no EV toggle
2. Verify: no ContextBanner
3. Regional tab visible, no special framing

- [ ] **Step 6: Push**

```bash
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** All Cycle 1 items covered: EV toggle ✓, persona detection ✓, regional tab hidden for bd-rep/analyst ✓, Province column hidden ✓, BD findings language ✓, ContextBanner ✓, province filter chips ✓, bd-lead portfolio line ✓
- **Type consistency:** `UserPersona` defined in Task 1, used by name in all subsequent tasks. `bdFilter`/`userPersona` added to both `AnalysisState` interface and the returned object in Task 2.
- **No placeholders:** All code blocks are complete implementations, not stubs.
- **Reset handling:** `bdFilter` resets to `false` in Task 2's `reset()` callback — ensures persona clears when workspace is reset.
