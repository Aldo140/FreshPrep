# BD Report Builder + Paying-Data Rollout

**Date:** 2026-07-16 · **Approved:** user approved combined design ("Yes — build it").

## Part A — Paying customers in more sections

Built-in DB conversion data (shipped earlier today) appears only in Regional.
Roll it into:

- **FiscalTab (BD-only):** paying + blended conversion in FY aggregates and
  the province × FY table; KPI strip gains a paying/conversion card.
- **ComparisonTab:** edition groups gain paying count + conversion % so
  editions compare on quality, not just volume.
- **CalendarTab:** summary/totals strip gains paying + conversion. Heatmap
  cells stay signups-only (recent months' conversion hasn't matured; coloring
  by it would mislead).

## Part B — Report Builder (new "report" page)

**Scope picker — two modes:**
1. **Paste codes:** blank textarea, one code per line; case-insensitive,
   trimmed, deduped; live found/missing count; missing codes listed in the
   report footnote.
2. **Filter:** province multi-select chips + month range (from/to,
   `<input type="month">`), defaulting to the full DB range. Either or both.

**Options:** title (default "BD Events Report"), optional "Prepared by",
section toggles.

**Document:** standalone HTML opened via `window.open` + `print()` (same
pipeline as FiscalPrintModal — proven). Print-grade, branded:
- Masthead letterhead with the real FreshPrep logo
  (freshprep.imgix.net/fresh-prep-logo.svg), DM Sans/Mono, #2b5346.
- Executive KPI band: events, signups, paying, blended conversion, median
  days-to-pay; total spend + $/signup + $/paying when wrap-up costs exist.
- Monthly trend table (signups / paying / conv per month) when range > 1 month.
- Province split table when > 1 province.
- Per-event table: code, event name (wrap-up join), month, province, signups,
  paying, conv %, spend, $/paying; sorted by signups desc.
- Status snapshot (active/paused/closed) + pre-existing-account counts.
- Methodology footnote: definitions, data source, built-in DB version
  (from BUILTIN_DB), missing codes.
- @page margins + page-number footer; sections auto-hide when irrelevant.

**Placement:** `ReportPage` union gains `"report"`; nav item "Report" (icon
FileText). Works whenever eventStats exist (BD-only and Looker modes).

## Added mid-build (user request)

- **Recent-first ordering:** Calendar heatmap month axis reversed (newest month
  first, desktop left / mobile top); coverage footer and province × year
  mini-table show newest year first; Fiscal per-FY KPI cards newest first; FY
  filter chips newest first. Chronological left→right kept only inside YoY
  comparison tables where delta math reads oldest→newest.
- **Regional tab makeover** (frontend-design + dataviz skills): unified dark
  hero (events / signups / paying·conv), signature clickable national-share
  strip (2px surface gaps, direct labels on segments ≥7%, hover detail line,
  click scrolls to and expands the province), and a single ranked leaderboard
  (rank numerals, gold "top province" tag, magnitude bars, paying/conv +
  BD-share per row, expandable top-10) replacing the separate mobile tiles and
  desktop grid. Brand province palette kept; dataviz validator's CVD/contrast
  warnings discharged via direct labels + gaps + the leaderboard-as-table.

## Non-goals
- No LTV in the report (built-in DB lacks it; Looker-mode LTV report already
  exists via FiscalPrintModal/PrintPreview).
- No charts in v1 — tables and KPI tiles print more reliably.
- No server/PDF library; browser print → Save as PDF.
