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

## Stack

- React 19 + TypeScript
- Vite 6 + Tailwind v4
- DM Sans / DM Serif Text / DM Mono (Google Fonts)
- xlsx for spreadsheet parsing
- Deployed via GitHub Actions → GitHub Pages

---

## Design

Built with the FreshPrep design system: dark forest green `#2b5346`, DM font family, analyst-grade information density. Anti-slop principles from Impeccable + Taste-Skill + Emil Kowalski's animation philosophy applied throughout.

See [`DESIGN.md`](DESIGN.md) for the full design spec and [`docs/superpowers/specs/`](docs/superpowers/specs/) for the overhaul design document.
