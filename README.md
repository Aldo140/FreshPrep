# FreshPrep Campaign Intelligence

Internal tool for analyzing event and promotional code performance. Upload a campaign export, analyze codes, surface insights.

**Live:** [aldo140.github.io/FreshPrep](https://aldo140.github.io/FreshPrep/)

---

## What it does

Upload a CSV or XLSX export from your database. The tool matches promo codes against signup and LTV data, then surfaces:

- Conversion rates by code and channel
- Portfolio health breakdown (high / average / weak performers)
- Province-level geographic analysis
- Missing code detection with fuzzy-match suggestions
- Exportable reports (Excel, CSV, printable PDF summary)

All processing is client-side. No data leaves the browser.

---

## Architecture

```
Upload → Wizard → Report
  ↓         ↓        ↓
useFileUpload  useAnalysis  useReport
```

State is managed in four custom hooks composed in `App.tsx`. UI is split into feature components under `src/features/`. Shared primitives live in `src/components/`.

| Folder                  | Purpose                                          |
|-------------------------|--------------------------------------------------|
| `src/hooks/`            | State management — one hook per concern          |
| `src/features/upload/`  | Drag-and-drop file upload screen                 |
| `src/features/wizard/`  | Code-entry flow (Paste / Full Dataset / Compare) |
| `src/features/report/`  | Multi-page report dashboard + tab components     |
| `src/components/`       | Shared UI primitives and design system           |
| `src/utils/`            | Parsing, analysis, scoring, fuzzy matching       |
| `src/types.ts`          | Shared TypeScript interfaces and type aliases    |

---

## Using it

1. Export your campaign data as CSV or XLSX
2. Upload at the drag-and-drop zone
3. Choose an analysis mode:
   - **Specific Codes** — paste a list of codes to audit
   - **Full Dataset** — analyze every code in the file
   - **Compare Codes** — side-by-side comparison of selected codes
4. Review the report, export results

Required columns: `discount_code`, `Signups`, `Paying cx`, `Conversion`

Optional (enable deeper analysis): `channel`, `Province`, `total_discount_used`, `Sum LTV 12`, `Avg LTV 12`

---

## Running locally

```bash
npm install
npm run dev
```

Opens at [localhost:3000](http://localhost:3000).

---

## Tech Stack

| Layer        | Technology             | Version  |
|--------------|------------------------|----------|
| Framework    | React                  | 19.0.1   |
| Language     | TypeScript             | 5.8.2    |
| Build        | Vite                   | 6.2.3    |
| Styling      | Tailwind CSS           | 4.1.14   |
| Animation    | Motion                 | 12.23.24 |
| Icons        | Lucide React           | 0.546.0  |
| Spreadsheets | xlsx                   | 0.18.5   |
| Fonts        | DM Sans / Serif / Mono | Google   |
| Deployment   | GitHub Actions + Pages | —        |

---

## Developer Guide

**Add a new report tab:**
1. Create `src/features/report/tabs/YourTab.tsx` as a named export
2. Add `"yourtab"` to the `ReportPage` union in `src/types.ts`
3. Import and render it in `src/features/report/ReportDashboard.tsx`

**Run, build, check:**
```bash
npm run dev      # dev server at localhost:3000/FreshPrep/
npm run build    # production build → dist/
npm run preview  # preview the production build locally
npm run lint     # TypeScript type check (no emit)
```

**Required columns in upload file:** `discount_code`, `Signups`, `Paying cx`, `Conversion`

**Optional columns:** `channel`, `Province`, `total_discount_used`, `Sum LTV 12`, `Avg LTV 12`

---

## Design

Built with the FreshPrep design system: dark forest green `#2b5346`, DM font family, analyst-grade information density. Anti-slop principles from Impeccable + Taste-Skill + Emil Kowalski's animation philosophy applied throughout.

See [`DESIGN.md`](DESIGN.md) for the full design spec and [`docs/superpowers/specs/`](docs/superpowers/specs/) for the overhaul design document.
