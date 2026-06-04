# Tablet Responsive Fixes — Design Spec

**Date:** 2026-06-04  
**Target viewport:** 768–1023px (standard tablets, md breakpoint in Tailwind)  
**Approach:** Targeted Tailwind breakpoint class fixes — no structural changes

---

## Problem

Several grid layouts use `lg:` (1024px+) as the breakpoint where they switch from a cramped single- or two-column layout to a full multi-column layout. On tablets (768–1023px) this means content either stacks unnecessarily or wastes horizontal space available at that width. Tailwind's `md:` breakpoint (768px) is the right trigger for these layouts.

---

## Confirmed Fixes

### 1. `src/components/DashboardMetrics.tsx` — line 168
**Change:** `grid-cols-2 lg:grid-cols-4` → `grid-cols-2 md:grid-cols-4`  
**Effect:** Primary KPI cards (Total Signups, Paying Customers, Conversion Rate, Total LTV) lay out in 4 columns on tablet instead of 2. Four cards in a row is exactly what a 768px screen has room for.

### 2. `src/features/report/tabs/PerformanceTab.tsx` — line 21
**Change:** `grid-cols-1 lg:grid-cols-12` → `grid-cols-1 md:grid-cols-12`  
**Effect:** The Performance Chart (8/12 cols) and Portfolio Summary Widget (4/12 cols) sit side-by-side on tablet instead of stacking. Both components scroll independently, so stacking wastes vertical space on a device with limited screen height.

### 3. `src/features/report/tabs/OverviewTab.tsx` — line 70
**Change:** `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` → `grid-cols-2 md:grid-cols-6`  
**Effect:** The 6 compact portfolio health metric tiles (Analyzed, High, Average, Weak, Conv., LTV 12M) fit in a single row at 768px. Each tile is ~115px wide at that viewport — they contain only a short label, a number, and a sub-label, so this is comfortable.

---

## Files to Audit During Implementation

These files were not read during brainstorming and may contain additional `lg:` grids that should be `md:`:

- `src/features/report/tabs/RevenueTab.tsx`
- `src/features/report/tabs/DataTab.tsx`
- `src/features/report/tabs/IssuesTab.tsx`
- `src/components/ProvinceIntelligence.tsx`
- `src/components/PortfolioSummaryWidget.tsx`
- `src/components/DetailedTable.tsx`
- `src/components/PerformanceChart.tsx` — check for fixed `min-width` that could cause horizontal overflow on tablet

For each file: scan for `lg:grid-cols`, `lg:w-`, `lg:flex-row`, and similar layout-affecting `lg:` classes. If the content comfortably fits at 768px, downgrade to `md:`.

---

## Out of Scope

- `src/features/upload/UploadFlow.tsx` — the 40% brand panel at `md:flex` is intentional and correct at 768px
- `src/features/wizard/WizardFlow.tsx` — grids already use `md:` correctly
- `src/features/report/ReportDashboard.tsx` — tab nav fits at 768px without scrolling
- Typography, spacing, color — no changes needed
- Print styles — unaffected

---

## Success Criteria

- At 768px width, no primary content is in a 1- or 2-column layout when 4+ columns clearly fit
- No horizontal scroll on any screen at 768–1023px viewport width
- Desktop (1024px+) appearance is unchanged
- Mobile (< 768px) appearance is unchanged
