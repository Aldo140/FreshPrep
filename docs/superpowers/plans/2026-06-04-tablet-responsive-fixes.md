# Tablet Responsive Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five Tailwind grid layouts that incorrectly use `lg:` (1024px) breakpoints instead of `md:` (768px), so the app looks correct on 768–1023px tablet screens.

**Architecture:** Pure Tailwind class substitutions — no structural changes, no new components, no logic changes. Each task is a single-file edit followed by a visual check at 768px and a commit.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Vite

---

## Files Modified

| File | Change |
|---|---|
| `src/components/DashboardMetrics.tsx` | Primary KPI grid: `lg:grid-cols-4` → `md:grid-cols-4` |
| `src/features/report/tabs/PerformanceTab.tsx` | Chart+widget row: `lg:grid-cols-12` → `md:grid-cols-12` |
| `src/features/report/tabs/OverviewTab.tsx` | Portfolio health tiles: `md:grid-cols-3 lg:grid-cols-6` → `md:grid-cols-6` |
| `src/components/ProvinceIntelligence.tsx` | Scorecard row: `lg:grid-cols-4` → `md:grid-cols-4` |
| `src/components/ProvinceIntelligence.tsx` | Heatmap+comparison row: `lg:grid-cols-12` → `md:grid-cols-12` |

---

## How to Verify Each Task

Start the dev server once and keep it open for all tasks:

```bash
npm run dev
# → http://localhost:3000
```

Open Chrome DevTools → toggle device toolbar (Ctrl+Shift+M) → set width to **768px**. Navigate to the relevant screen after each change and confirm the layout matches the expected description.

---

## Task 1: Fix primary KPI grid in DashboardMetrics

**File:** `src/components/DashboardMetrics.tsx`

- [ ] **Step 1: Make the change**

  Find line 168. Change:
  ```
  className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
  ```
  To:
  ```
  className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
  ```

- [ ] **Step 2: Verify at 768px**

  Navigate to the Performance tab in the report dashboard. At 768px width, the four primary KPI cards (Total Signups, Paying Customers, Conversion Rate, Total LTV 12M) must appear in **a single row of 4 columns**, not stacked as 2×2.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/DashboardMetrics.tsx
  git commit -m "fix: show primary KPI cards in 4 columns on tablet (md breakpoint)"
  ```

---

## Task 2: Fix Performance tab chart+widget row

**File:** `src/features/report/tabs/PerformanceTab.tsx`

- [ ] **Step 1: Make the change**

  Find line 21. Change:
  ```
  className="grid grid-cols-1 lg:grid-cols-12 gap-5"
  ```
  To:
  ```
  className="grid grid-cols-1 md:grid-cols-12 gap-5"
  ```

- [ ] **Step 2: Verify at 768px**

  Navigate to the Performance tab. At 768px width, the `PerformanceChart` (8/12 columns) and `PortfolioSummaryWidget` (4/12 columns) must appear **side by side**, not stacked vertically.

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/report/tabs/PerformanceTab.tsx
  git commit -m "fix: show performance chart and widget side-by-side on tablet"
  ```

---

## Task 3: Fix Overview tab portfolio health tiles

**File:** `src/features/report/tabs/OverviewTab.tsx`

- [ ] **Step 1: Make the change**

  Find line 70. Change:
  ```
  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
  ```
  To:
  ```
  className="grid grid-cols-2 md:grid-cols-6 gap-3"
  ```

- [ ] **Step 2: Verify at 768px**

  Navigate to the Overview tab. At 768px width, all six portfolio health metric tiles (Analyzed, High, Average, Weak, Conv., LTV 12M) must appear in **a single row of 6 columns**. Each tile should be roughly 115px wide — the content (a short label, a number, and a sub-label) fits comfortably at that width.

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/report/tabs/OverviewTab.tsx
  git commit -m "fix: show all 6 portfolio health tiles in one row on tablet"
  ```

---

## Task 4: Fix Province scorecards grid in ProvinceIntelligence

**File:** `src/components/ProvinceIntelligence.tsx`

- [ ] **Step 1: Make the change**

  Find line 317. Change:
  ```
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
  ```
  To:
  ```
  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
  ```

- [ ] **Step 2: Verify at 768px**

  Navigate to the Regional tab. At 768px width, the four province scorecard cards (Best Conversion, Highest Avg LTV12, Most Regional Signups, Most Paying Customers) must appear in **a single row of 4 columns**.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/ProvinceIntelligence.tsx
  git commit -m "fix: show province scorecards in 4 columns on tablet"
  ```

---

## Task 5: Fix Province heatmap+comparison row in ProvinceIntelligence

**File:** `src/components/ProvinceIntelligence.tsx`

- [ ] **Step 1: Make the change**

  Find line 408. Change:
  ```
  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
  ```
  To:
  ```
  className="grid grid-cols-1 md:grid-cols-12 gap-6"
  ```

- [ ] **Step 2: Verify at 768px**

  Still on the Regional tab, scroll past the scorecards. At 768px width, the **Regional Performance Heatmap Matrix** (left, 6/12 cols) and the **Relative Province Market Comparison** visual meter panel (right, 6/12 cols) must appear **side by side**, not stacked.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/ProvinceIntelligence.tsx
  git commit -m "fix: show regional heatmap and comparison panel side-by-side on tablet"
  ```

---

## Task 6: Final cross-screen verification

- [ ] **Step 1: Check all five screens at 768px**

  With the dev server running at http://localhost:3000, open Chrome DevTools device toolbar at **768px**. Walk through each screen and confirm:

  | Screen | Expected at 768px |
  |---|---|
  | Performance tab | 4-col KPI row; chart + widget side by side |
  | Overview tab | 6-col portfolio health tile row |
  | Regional tab | 4-col scorecard row; heatmap + comparison side by side |
  | Upload screen | 40% brand panel + 60% upload panel (unchanged) |
  | Wizard screen | 3-col analysis choice cards (unchanged, already `md:grid-cols-3`) |

- [ ] **Step 2: Check desktop is unchanged at 1280px**

  Change DevTools width to **1280px**. Walk through the same screens and confirm nothing regressed. All layouts should look identical to before.

- [ ] **Step 3: Check mobile is unchanged at 375px**

  Change DevTools width to **375px**. Walk through the same screens. Grids should fall back to 1 or 2 columns as before.
