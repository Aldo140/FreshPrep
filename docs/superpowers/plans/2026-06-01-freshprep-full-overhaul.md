# FreshPrep Campaign Intelligence — Full Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the entire FreshPrep event code analyzer — agent files, design system, app UI, and copy — onto the real FreshPrep brand identity (dark green #2b5346, DM font family, no emoji, clean copy) using all three merged skills (Impeccable, Taste-Skill, Emil).

**Architecture:** Agent-first approach: update the four skill/spec files that define Claude's design behavior, then apply those exact tokens and rules to the app UI. Changes cascade from index.css font variables through every Tailwind component. App.tsx is rebuilt section by section; components are updated for copy and any remaining blue references.

**Tech Stack:** React 19, Vite 6, Tailwind v4 (`@theme` token approach), TypeScript, DM Sans/Serif Text/Mono via Google Fonts, lucide-react icons, xlsx for export.

**Design spec:** `docs/superpowers/specs/2026-06-01-freshprep-full-overhaul-design.md`

---

## File Map

| File | Change |
|---|---|
| `DESIGN.md` | Full color + typography rewrite |
| `PRODUCT.md` | App name, users, voice, copy examples |
| `.instructions.md` | Philosophy, token refs, brand voice |
| `SKILL.md` | Component examples with FreshPrep tokens |
| `src/index.css` | DM font import, CSS custom properties, `prefers-reduced-motion` |
| `src/components/DesignSystem.tsx` | All color tokens → FreshPrep palette |
| `src/App.tsx` | Bug fixes + full redesign (header, upload, wizard, report) |
| `src/components/DashboardMetrics.tsx` | Copy cleanup, animate-fade-in retention |
| `src/components/KeyFindingsSection.tsx` | Remove emoji from section header |
| `src/components/PerformanceChart.tsx` | Copy cleanup, empty-state text |
| `src/components/PortfolioSummaryWidget.tsx` | Color spot-checks |
| `src/components/ProvinceIntelligence.tsx` | Remove emoji from header |
| `src/components/MissingCodesSection.tsx` | Warning color → orange accent |
| `src/components/DetailedTable.tsx` | DM Mono on numbers (auto via CSS) |
| `src/components/DataExplorer.tsx` | Copy cleanup |

---

## Task 1: Update DESIGN.md

**Files:**
- Modify: `DESIGN.md`

- [ ] **Replace the entire Colors section** with FreshPrep palette:

```markdown
## Colors

### Primary: FreshPrep Green
```
oklch(calc from #2b5346)  /* Brand green: primary actions, nav, focus rings */
Hex: #2b5346
```

### Semantic Colors
```
Brand dark:    #0d3a2f   /* Hover, pressed states */
Brand surface: #eef4f1   /* Subtle green-tinted hover/active backgrounds */
Accent gold:   #e7bd27   /* Average performers, callout highlights */
Accent orange: #e78a58   /* Weak performers, secondary warnings */
Error:         #850b0b   /* Error states */
Error surface: #ffd0d0   /* Error background tints */
```

### Neutral Scale
```
Text:          #1a1a1a   /* Primary text (off-black) */
Text muted:    #3d3d3d   /* Secondary text */
Text disabled: #a1a1a1   /* Disabled, placeholder */
Surface:       #f8f7f5   /* Page background (warm off-white) */
Surface white: #ffffff   /* Card backgrounds */
Border:        #e5e5e5   /* Default borders */
Border strong: #a6a7a5   /* Stronger dividers */
```

### Performance Tier Mapping
- High Converting (≥40%): brand surface background, brand green text
- Average (20–39%): gold tinted surface, dark gold text
- Weak (<20%): orange tinted surface, dark orange text
```

- [ ] **Replace the Typography section** with DM family:

```markdown
## Typography

### Typefaces
- **UI / Body**: DM Sans — geometric, clean, matches freshprep.ca
- **Display / Headers**: DM Serif Text — editorial weight for section titles
- **Code / Data**: DM Mono — monospaced for all numbers, codes, timestamps
- **Fallback**: -apple-system, BlinkMacSystemFont, Georgia, monospace

### Type Scale

| Name | Size | Weight | Font | Usage |
|------|------|--------|------|-------|
| 4XL  | 32px | 600 | DM Serif Text | Page/screen titles |
| 3XL  | 24px | 600 | DM Serif Text | Section headers |
| 2XL  | 20px | 500 | DM Sans | Subsection headers |
| XL   | 16px | 500 | DM Sans | Card titles, bold labels |
| LG   | 14px | 400 | DM Sans | Body text, UI labels |
| SM   | 12px | 400 | DM Sans | Captions, metadata |
| XS   | 11px | 400 | DM Mono | Badges, timestamps, codes |
```

- [ ] **Update the Copy & Voice section**:

```markdown
## Copy & Voice

### Tone
Precise, trustworthy, quietly ambitious. No hype. No emoji in UI. Numbers speak for themselves. Built for the team that feeds Canada.

- No exclamation points
- No emoji in interface labels or section headers
- No marketing buzzwords
- No em-dashes (use period, comma, or colon instead)
- Button labels: verb + object ("Analyze Codes", "Export Excel", "Replace File")

### Example Copy
✅ "Upload a CSV or XLSX export. We validate columns and surface performance automatically."
❌ "Upload campaign performance data for intelligent analysis."

✅ "Accepted formats"
❌ "📊 Accepted Formats"

✅ "All analysis runs client-side. No data leaves your browser."
❌ "Validated 100% Client-Side inside secure sandboxed event layers."
```

- [ ] **Commit:**
```bash
git add DESIGN.md
git commit -m "docs(design): rebase design system onto FreshPrep brand identity"
```

---

## Task 2: Update PRODUCT.md

**Files:**
- Modify: `PRODUCT.md`

- [ ] **Update the header and mission:**

Replace:
```markdown
# FreshPrep Product Definition
**Version**: 1.0 | **Last Updated**: June 2026

## Product Mission
Make compliance and research data analysis accessible, trustworthy, and actionable.
```

With:
```markdown
# FreshPrep Campaign Intelligence — Product Definition
**Version**: 2.0 | **Last Updated**: June 2026

## Product Mission
Give FreshPrep's marketing and growth teams a fast, accurate view of campaign code performance. No spreadsheet juggling. No manual lookups. Data that speaks for itself.
```

- [ ] **Replace the Users section:**

```markdown
## Users

### Primary: Marketing Analysts
- **Goal**: Audit specific promo codes against real signup and LTV data
- **Context**: Working a campaign post-mortem or weekly performance check
- **Pains**: Jumping between spreadsheets, no single view, hard to spot weak codes
- **Needs**: Fast upload, clear pass/fail indicators, exportable results

### Secondary: Campaign Managers
- **Goal**: Compare performance across multiple codes or channels
- **Context**: Planning next campaign, cutting underperformers
- **Needs**: Side-by-side comparison, channel breakdown, province view

### Tertiary: Growth Leadership
- **Goal**: Portfolio health at a glance
- **Context**: 2-5 minute check during planning session
- **Needs**: Summary metrics, top/bottom performers, trend direction
```

- [ ] **Replace the Brand Voice section:**

```markdown
## Brand Voice

**Tone**: Precise, trustworthy, quietly ambitious.
- No exclamation points
- No emoji in UI copy
- No marketing speak
- No em-dashes
- Instead: specific, honest, functional

**Example Copy**:
```
✅ "14 of 16 codes matched. 2 missing from database."
❌ "Your amazing analysis results!"

✅ "Upload a CSV or XLSX export."
❌ "Drop your data file here or click to browse your computer 🚀"

✅ "Analyze Codes"
❌ "Analyze Selected Codes"
```
```

- [ ] **Replace Anti-References:**

```markdown
## Anti-References (What We Never Do)

- No emoji in section labels or UI copy
- No uppercase eyebrow labels above every section
- No em-dashes in any visible string
- No gradient text
- No glassmorphism
- No bouncy animations
- No "Welcome to our platform" language
- No confetti, celebration effects, sparkles
- No blue as a primary color (FreshPrep green is primary)
- No Inter or Outfit fonts (DM family only)
```

- [ ] **Commit:**
```bash
git add PRODUCT.md
git commit -m "docs(product): update product definition for FreshPrep Campaign Intelligence"
```

---

## Task 3: Update .instructions.md

**Files:**
- Modify: `.instructions.md`

- [ ] **Update the opening paragraph and Core Philosophy section:**

Replace the first paragraph:
```markdown
You are an expert frontend engineer and design expert specializing in building premium research dashboards and intelligent data visualization interfaces.
```

With:
```markdown
You are an expert frontend engineer and design expert specializing in building FreshPrep's internal campaign intelligence tools. You build clean, purposeful UIs that eliminate "design slop" and ship professional-grade data products. You know FreshPrep's brand inside out: dark forest green (#2b5346), DM Sans for UI, DM Serif Text for display, DM Mono for data.
```

- [ ] **Update the Reference section (Step 2):**

Replace:
```markdown
### 2. Reference
Load the official FreshPrep design system:
- **Typography**: Geist Sans for UI, Geist Mono for code.
- **Color**: OKLCH-based palette with semantic meanings
  - Blue: Data, interaction, trust
  - Green: Success, validity, complete
```

With:
```markdown
### 2. Reference
Load the official FreshPrep design system:
- **Typography**: DM Sans for UI, DM Serif Text for display headers, DM Mono for data
- **Color**: FreshPrep palette with semantic meanings
  - Brand green (#2b5346): Primary actions, nav, focus, interaction
  - Gold (#e7bd27): Average performers, callout highlights
  - Orange (#e78a58): Weak performers, secondary warnings
  - Red (#850b0b): Error, stop, critical
  - Off-white (#f8f7f5): Page surface (never pure white or blue-50)
```

- [ ] **Update the Anti-Patterns section — add FreshPrep-specific bans:**

Add to the existing anti-patterns list:
```markdown
🚫 **Blue as primary** - FreshPrep green (#2b5346) is always primary
🚫 **Inter or Outfit fonts** - DM family only (Sans, Serif Text, Mono)
🚫 **Emoji in UI labels** - Never in section headers, buttons, or body copy
🚫 **Em-dashes** - Use period, comma, or colon instead
🚫 **Cream/beige/sand backgrounds** - Use #f8f7f5 warm off-white
```

- [ ] **Update the FreshPrep Context section at the bottom:**

Replace:
```markdown
## FreshPrep Context

You're building for:
- **Research professionals** who need clarity faster than competition
- **Compliance teams** who need credibility and audit trails
```

With:
```markdown
## FreshPrep Context

You're building for FreshPrep's internal team. Canada's #1 meal delivery service, B Corp certified, sustainability-focused. The tool reflects their precision and care — clean, honest, functional.

You're building for:
- **Marketing analysts** who audit campaign codes post-event
- **Campaign managers** who need to cut underperformers fast
- **Growth leadership** who need portfolio health at a glance

Brand: dark forest green (#2b5346), DM fonts, calm confident copy, zero emoji in UI.
```

- [ ] **Commit:**
```bash
git add .instructions.md
git commit -m "docs(agent): update agent instructions with FreshPrep brand identity"
```

---

## Task 4: Update SKILL.md

**Files:**
- Modify: `SKILL.md`

- [ ] **Update the color palette section in `### Tokens → Color Palette`:**

Replace all `--color-blue-*` entries with:
```css
/* FreshPrep Brand Colors */
--color-brand:         #2b5346;  /* Primary actions */
--color-brand-dark:    #0d3a2f;  /* Hover, pressed */
--color-brand-surface: #eef4f1;  /* Subtle green backgrounds */
--color-accent-gold:   #e7bd27;  /* Average performers */
--color-accent-orange: #e78a58;  /* Weak performers */
--color-surface:       #f8f7f5;  /* Page background */
--color-error:         #850b0b;  /* Error states */
--color-text:          #1a1a1a;  /* Primary text */
--color-text-muted:    #3d3d3d;  /* Secondary text */
--color-border:        #e5e5e5;  /* Default borders */
```

- [ ] **Update the Typography tokens:**

Replace:
```css
--font-sans: 'Geist Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Geist Mono', 'Courier New', monospace;
```

With:
```css
--font-sans:   'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--font-serif:  'DM Serif Text', Georgia, serif;
--font-mono:   'DM Mono', 'Courier New', monospace;
```

- [ ] **Update the Button code example in `### Safe Component Structure`:**

Replace the className in the Button example:
```tsx
primary: 'bg-blue-400 text-white hover:bg-blue-500',
secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
ghost: 'text-blue-400 hover:bg-blue-50',
```

With:
```tsx
primary: 'bg-[#2b5346] text-white hover:bg-[#0d3a2f] active:scale-[0.97]',
secondary: 'bg-[#f8f7f5] text-[#1a1a1a] hover:bg-[#eef4f1]',
ghost: 'text-[#2b5346] border border-[#2b5346] hover:bg-[#eef4f1] active:scale-[0.97]',
```

- [ ] **Update the name field in the frontmatter at the top of SKILL.md:**

```yaml
name: freshprep-campaign-intelligence
description: |-
  FreshPrep Campaign Intelligence design system. Merged Impeccable + Taste-Skill + Emil,
  calibrated to real FreshPrep brand identity: dark green #2b5346, DM font family,
  zero emoji in UI copy, analyst-grade density. For internal FreshPrep marketing tools.
```

- [ ] **Commit:**
```bash
git add SKILL.md
git commit -m "docs(skill): calibrate merged skill to FreshPrep brand identity"
```

---

## Task 5: Update index.css — Fonts and CSS Custom Properties

**Files:**
- Modify: `src/index.css`

- [ ] **Replace the entire `@import` and `@theme` block at the top:**

Replace lines 1–8:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300..900;1,300..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Outfit:wght@100..900&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Outfit", "Inter", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}
```

With:
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Text:ital@0;1&display=swap');
@import "tailwindcss";

@theme {
  --font-sans:    "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "DM Serif Text", Georgia, serif;
  --font-mono:    "DM Mono", ui-monospace, SFMono-Regular, monospace;
}
```

- [ ] **Add CSS custom properties and reduced motion after the `@theme` block:**

```css
:root {
  --color-brand:          #2b5346;
  --color-brand-dark:     #0d3a2f;
  --color-brand-surface:  #eef4f1;
  --color-accent-gold:    #e7bd27;
  --color-accent-orange:  #e78a58;
  --color-surface:        #f8f7f5;
  --color-surface-white:  #ffffff;
  --color-error:          #850b0b;
  --color-error-surface:  #ffd0d0;
  --color-text:           #1a1a1a;
  --color-text-muted:     #3d3d3d;
  --color-text-disabled:  #a1a1a1;
  --color-border:         #e5e5e5;
  --color-border-strong:  #a6a7a5;

  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```

- [ ] **Run dev server to verify fonts load:**
```bash
npm run dev
```
Open http://localhost:3000 in a browser. Open DevTools → Network → filter "fonts". Verify `DM+Sans`, `DM+Serif+Text`, `DM+Mono` requests appear. All UI text should visibly shift from Inter/Outfit to DM Sans.

- [ ] **Commit:**
```bash
git add src/index.css
git commit -m "style: switch to DM font family and add FreshPrep CSS custom properties"
```

---

## Task 6: Update DesignSystem.tsx — Token Values

**Files:**
- Modify: `src/components/DesignSystem.tsx`

- [ ] **Replace the `designTokens` object** (lines 20–78):

```tsx
export const designTokens = {
  typography: {
    fontSans:   "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSerif:  "'DM Serif Text', Georgia, serif",
    fontMono:   "'DM Mono', 'Courier New', monospace",
    scale: {
      '4xl': { size: '32px', weight: 600, lineHeight: 1.2 },
      '3xl': { size: '24px', weight: 600, lineHeight: 1.3 },
      '2xl': { size: '20px', weight: 500, lineHeight: 1.4 },
      'xl':  { size: '16px', weight: 500, lineHeight: 1.5 },
      'lg':  { size: '14px', weight: 400, lineHeight: 1.6 },
      'sm':  { size: '12px', weight: 400, lineHeight: 1.5 },
      'xs':  { size: '11px', weight: 400, lineHeight: 1.4 },
    },
  },

  colors: {
    brand:        '#2b5346',
    brandDark:    '#0d3a2f',
    brandSurface: '#eef4f1',
    gold:         '#e7bd27',
    orange:       '#e78a58',
    surface:      '#f8f7f5',
    white:        '#ffffff',
    error:        '#850b0b',
    errorSurface: '#ffd0d0',
    text:         '#1a1a1a',
    textMuted:    '#3d3d3d',
    textDisabled: '#a1a1a1',
    border:       '#e5e5e5',
    borderStrong: '#a6a7a5',
    // Keep for backward compat with any components still using blue key
    blue: {
      50:  '#eef4f1',
      100: '#eef4f1',
      200: '#eef4f1',
      300: '#2b5346',
      400: '#2b5346',
      500: '#0d3a2f',
    },
    neutral: {
      50:  '#f8f7f5',
      100: '#f8f7f5',
      200: '#e5e5e5',
      300: '#a6a7a5',
      500: '#a1a1a1',
      700: '#3d3d3d',
      900: '#1a1a1a',
    },
  },

  spacing: {
    0.5: '4px',
    1:   '8px',
    1.5: '12px',
    2:   '16px',
    3:   '24px',
    4:   '32px',
    5:   '40px',
    6:   '48px',
  },

  easing: {
    out:    'cubic-bezier(0.23, 1, 0.32, 1)',
    inOut:  'cubic-bezier(0.77, 0, 0.175, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};
```

- [ ] **Update `baseStyles.button` — replace blue values:**

In the `button` function, replace:
```tsx
primary: {
  backgroundColor: designTokens.colors.blue[400],
  color: 'white',
  border: 'none',
},
secondary: {
  backgroundColor: designTokens.colors.neutral[100],
  color: designTokens.colors.neutral[900],
  border: 'none',
},
ghost: {
  backgroundColor: 'transparent',
  color: designTokens.colors.blue[400],
  border: `1px solid ${designTokens.colors.blue[300]}`,
},
```

With:
```tsx
primary: {
  backgroundColor: designTokens.colors.brand,
  color: 'white',
  border: 'none',
},
secondary: {
  backgroundColor: designTokens.colors.surface,
  color: designTokens.colors.text,
  border: 'none',
},
ghost: {
  backgroundColor: 'transparent',
  color: designTokens.colors.brand,
  border: `1px solid ${designTokens.colors.brand}`,
},
```

- [ ] **Update `baseStyles.button` return — focus ring color:**

Replace `designTokens.colors.blue[400]` in the focus outline with `designTokens.colors.brand`.

- [ ] **Run lint to verify no TypeScript errors:**
```bash
npm run lint 2>&1 | grep -c "error"
```
Expected: same or fewer errors than before this task (the JSX bugs in App.tsx still exist at this point).

- [ ] **Commit:**
```bash
git add src/components/DesignSystem.tsx
git commit -m "style(design-system): update tokens to FreshPrep brand palette and DM fonts"
```

---

## Task 7: Fix JSX Bugs in App.tsx

**Files:**
- Modify: `src/App.tsx:443-456` and `src/App.tsx:699-702`

- [ ] **Fix bug 1 — `</ul>` closing an `<ol>` at line 456:**

Find this block (lines 443–456):
```tsx
<ol className="space-y-1.5 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed list-none">
  <li className="flex items-start gap-2">
    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
    <span>Upload campaign data from your database</span>
  </li>
  <li className="flex items-start gap-2">
    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
    <span>System validates and analyzes automatically</span>
  </li>
  <li className="flex items-start gap-2">
    <span className="w-4 h-4 rounded bg-blue-50 text-blue-700 font-bold font-mono text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
    <span>Filter, compare, and analyze data across different dimension instantly.</span>
  </li>
</ul>
```

Change `</ul>` to `</ol>`.

- [ ] **Fix bug 2 — stray `</p>` at line ~700:**

Find this block in the `selectedFlow === "paste"` panel:
```tsx
<p className="text-sm text-slate-600 mt-1">
  Paste your codes below. We'll auto-clean whitespace and normalize formatting.
</p>
</p>
```

Remove the second `</p>`.

- [ ] **Verify lint passes with significantly fewer errors:**
```bash
npm run lint 2>&1 | grep "error TS" | wc -l
```
Expected: 0 errors (all 13 cascading errors were caused by these two bugs).

- [ ] **Commit:**
```bash
git add src/App.tsx
git commit -m "fix: resolve JSX tag mismatch (ol/ul) and stray closing tag in App.tsx"
```

---

## Task 8: Redesign App.tsx — Header

**Files:**
- Modify: `src/App.tsx` (header section, lines ~288–363)

- [ ] **Replace the entire `<header>` element** with:

```tsx
<header
  id="app-global-nav"
  className="h-14 bg-[#2b5346] flex items-center justify-between px-6 sm:px-8 shrink-0 z-40"
  style={{ transition: 'background-color 150ms var(--ease-out, cubic-bezier(0.23,1,0.32,1))' }}
>
  {/* Wordmark */}
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-8 h-8 bg-white/15 rounded-md flex items-center justify-center shrink-0">
      <BarChart3 className="w-4 h-4 text-white" />
    </div>
    <div className="min-w-0">
      <h1 className="text-sm font-semibold text-white tracking-tight font-display leading-none">
        FreshPrep Campaign Intelligence
      </h1>
      {fileName && (
        <p className="text-xs text-white/60 font-mono leading-none mt-0.5 truncate max-w-[280px]">
          {fileName} · {dbRows.length.toLocaleString()} records
        </p>
      )}
    </div>
  </div>

  {/* Actions */}
  <div className="flex items-center gap-2 shrink-0">
    {dbRows.length > 0 && (
      <button
        id="reset-workspace-top-btn"
        onClick={handleResetWorkspace}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors duration-150 cursor-pointer"
        title="Upload a different dataset"
      >
        <Upload className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">New Dataset</span>
      </button>
    )}

    {hasReportGenerated && foundReports.length > 0 && (
      <>
        <button
          id="export-xlsx-btn"
          onClick={handleExportToExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-[#2b5346] hover:bg-white/90 transition-colors duration-150 cursor-pointer"
          style={{ transition: 'background-color 150ms var(--ease-out), transform 100ms var(--ease-out)' }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = '')}
          onMouseLeave={e => (e.currentTarget.style.transform = '')}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Export Excel</span>
        </button>

        <button
          id="export-pdf-btn"
          onClick={() => setIsPrintPreview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors duration-150 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Print</span>
        </button>

        <button
          id="export-csv-btn"
          onClick={handleExportToCSV}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors duration-150 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>CSV</span>
        </button>
      </>
    )}
  </div>
</header>
```

- [ ] **Verify in browser:** Header should be dark green, DM Serif Text wordmark, clean action buttons.

- [ ] **Commit:**
```bash
git add src/App.tsx
git commit -m "style(app): redesign header with FreshPrep green and Campaign Intelligence wordmark"
```

---

## Task 9: Redesign App.tsx — Upload Screen (Screen 1)

**Files:**
- Modify: `src/App.tsx` (upload screen, `dbRows.length === 0` branch, lines ~369–461)

- [ ] **Replace the entire upload screen `<div id="launch-screen">` with:**

```tsx
{/* LAUNCH STATE: Asymmetric split layout */}
<div className="flex-1 flex flex-col md:flex-row overflow-hidden" id="launch-screen">

  {/* Left brand panel */}
  <div
    className="hidden md:flex md:w-[40%] flex-col justify-center px-12 bg-[#2b5346] text-white"
    style={{ minHeight: 0 }}
  >
    <div className="max-w-xs">
      <h2 className="text-3xl font-display font-semibold leading-tight mb-4 text-white">
        Campaign code analysis, without the spreadsheet juggling.
      </h2>
      <p className="text-sm text-white/70 leading-relaxed">
        Upload an export from your database. We match codes, surface performance metrics, and flag what needs attention.
      </p>
      <div className="mt-8 pt-8 border-t border-white/15">
        <p className="text-xs text-white/50 font-mono uppercase tracking-wider">FreshPrep Campaign Intelligence</p>
      </div>
    </div>
  </div>

  {/* Right upload panel */}
  <div
    className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-12 bg-[#f8f7f5]"
  >
    <div className="w-full max-w-lg space-y-6">

      {/* Mobile-only title */}
      <div className="md:hidden text-center space-y-2">
        <h2 className="text-2xl font-display font-semibold text-[#1a1a1a]">
          Upload Campaign Data
        </h2>
        <p className="text-sm text-[#3d3d3d] leading-relaxed">
          Upload a CSV or XLSX export. We validate columns and surface performance automatically.
        </p>
      </div>

      {/* Desktop title */}
      <div className="hidden md:block space-y-1">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Upload Campaign Data</h2>
        <p className="text-sm text-[#3d3d3d]">
          Upload a CSV or XLSX export. We validate columns and surface performance automatically.
        </p>
      </div>

      {/* Drag zone */}
      <div className="space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv,.tsv"
          className="hidden"
          id="excel-file-uploader"
        />
        <div
          id="drag-drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerBrowsingInput}
          className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
          style={{
            borderColor: isDragOver ? '#2b5346' : '#e5e5e5',
            backgroundColor: isDragOver ? '#eef4f1' : '#ffffff',
            transition: 'border-color 200ms var(--ease-out), background-color 200ms var(--ease-out)',
          }}
        >
          <FileSpreadsheet
            className="w-10 h-10 mb-3"
            style={{ color: isDragOver ? '#2b5346' : '#a1a1a1', transition: 'color 200ms var(--ease-out)' }}
          />
          <p className="text-sm font-medium text-[#1a1a1a]">Drop your data file here</p>
          <p className="text-xs text-[#2b5346] mt-1 font-medium">or click to browse</p>
          <p className="text-xs text-[#a1a1a1] mt-2 font-mono">CSV · XLSX · XLS · TSV</p>
        </div>
      </div>

      {/* Format + steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-[#e5e5e5]">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[#3d3d3d] uppercase tracking-wide">
            Accepted formats
          </h4>
          <div className="flex flex-wrap gap-2">
            {["CSV", "XLSX", "XLS", "TSV"].map(fmt => (
              <span key={fmt} className="px-2.5 py-1 bg-[#eef4f1] text-[#2b5346] text-xs font-mono font-semibold rounded border border-[#2b5346]/20">
                {fmt}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#3d3d3d] leading-relaxed">
            Column headers are auto-detected. Promo code, signups, LTV, and channel columns are mapped automatically.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[#3d3d3d] uppercase tracking-wide">
            How it works
          </h4>
          <ol className="space-y-1.5 text-xs text-[#3d3d3d] leading-relaxed list-none">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2b5346] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Upload campaign export from your database</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2b5346] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Columns are validated and mapped automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2b5346] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Filter, compare, and export results instantly</span>
            </li>
          </ol>
        </div>
      </div>

    </div>
  </div>
</div>
```

- [ ] **Verify in browser at `http://localhost:3000`:** Should show split layout — dark green left panel, clean white upload panel right. Drag zone border turns green on hover.

- [ ] **Commit:**
```bash
git add src/App.tsx
git commit -m "style(app): redesign upload screen with asymmetric split layout"
```

---

## Task 10: Redesign App.tsx — Wizard Screen (Screen 2)

**Files:**
- Modify: `src/App.tsx` (wizard screen, `!hasReportGenerated` branch, lines ~463–936)

- [ ] **Replace the outer wrapper and heading of the wizard screen:**

Replace:
```tsx
<div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/50 flex flex-col items-center gap-4 sm:gap-6" id="wizard-screen">
```

With:
```tsx
<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8f7f5] flex flex-col items-center gap-4 sm:gap-6" id="wizard-screen">
```

- [ ] **Replace validation card header:**

Replace:
```tsx
<h3 className="text-sm sm:text-base font-bold text-slate-900">
  🔍 Data Validation
</h3>
```

With:
```tsx
<h3 className="text-sm font-semibold text-[#1a1a1a]">Data validation</h3>
```

- [ ] **Replace the file/records line:**

Replace:
```tsx
<p className="text-xs sm:text-sm text-slate-600 leading-normal mt-1">
  File: <strong className="font-mono text-slate-800">{fileName}</strong> with {dbRows.length.toLocaleString()} records
</p>
```

With:
```tsx
<p className="text-xs text-[#3d3d3d] mt-1 font-mono">
  {fileName} · {dbRows.length.toLocaleString()} records
</p>
```

- [ ] **Replace the Replace File button:**

Replace:
```tsx
<button
  onClick={handleResetWorkspace}
  className="px-3 py-1.5 self-start sm:self-auto text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer transition shrink-0"
>
  Replace File
</button>
```

With:
```tsx
<button
  onClick={handleResetWorkspace}
  className="px-3 py-1.5 text-xs font-medium text-[#3d3d3d] bg-white border border-[#e5e5e5] rounded hover:bg-[#f8f7f5] cursor-pointer shrink-0"
  style={{ transition: 'background-color 150ms var(--ease-out)' }}
>
  Replace File
</button>
```

- [ ] **Replace the valid/invalid state cards:**

Replace the success card:
```tsx
<div className="bg-[#eef4f1] border border-[#2b5346]/20 p-3.5 rounded-lg flex items-start gap-3">
  <div className="p-1.5 rounded-md bg-[#2b5346]/10 flex-shrink-0 mt-0.5">
    <CheckCircle2 className="w-4 h-4 text-[#2b5346]" />
  </div>
  <div>
    <h4 className="text-xs font-semibold text-[#2b5346]">File structure valid</h4>
    <p className="text-xs text-[#3d3d3d] leading-relaxed mt-1">
      All required columns detected. Select an analysis method below.
    </p>
  </div>
</div>
```

Replace the error card:
```tsx
<div className="bg-[#ffd0d0] border border-[#850b0b]/20 p-3.5 rounded-lg flex items-start gap-3">
  <div className="p-1.5 rounded-md bg-[#850b0b]/10 flex-shrink-0 mt-0.5">
    <XCircle className="w-4 h-4 text-[#850b0b]" />
  </div>
  <div>
    <h4 className="text-xs font-semibold text-[#850b0b]">Missing required columns</h4>
    <p className="text-xs text-[#3d3d3d] leading-relaxed mt-1">
      One or more required column headers are missing. Review the requirements below and update your file.
    </p>
  </div>
</div>
```

- [ ] **Replace the "Choose your analysis" heading:**

Replace:
```tsx
<h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-600 text-center">
  🔓 Choose Your Analysis
</h3>
```

With:
```tsx
<h3 className="text-xs font-semibold text-[#3d3d3d] text-center uppercase tracking-wider">
  Choose your analysis
</h3>
```

- [ ] **Replace all 3 flow card wrappers** — active ring class from `ring-blue-500` to `ring-[#2b5346]`, hover border from `hover:border-blue-400` to `hover:border-[#2b5346]`, active border from `border-blue-500` to `border-[#2b5346]`:

Find all instances of:
```
border-blue-500 shadow-lg ring-2 ring-blue-500 ring-opacity-50
```
Replace with:
```
border-[#2b5346] shadow-lg ring-2 ring-[#2b5346] ring-opacity-30
```

Find all instances of:
```
hover:border-blue-400
```
Replace with:
```
hover:border-[#2b5346]
```

- [ ] **Replace icon colors in all 3 flow card icon containers:**

Find all instances of:
```tsx
? "bg-blue-500 text-white border-blue-600" 
: "bg-blue-50 text-blue-600 border-blue-200"
```
Replace with:
```tsx
? "bg-[#2b5346] text-white border-[#0d3a2f]" 
: "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20"
```

- [ ] **Replace the "Analyze Codes" button** (paste flow):

Find:
```tsx
Analyze Selected Codes
```
Replace with:
```tsx
Analyze Codes
```

And update the button class from `bg-blue-600 hover:bg-blue-700` to `bg-[#2b5346] hover:bg-[#0d3a2f]`.

- [ ] **Replace the "Analyze All Codes" button** (all flow):

Find:
```tsx
Analyze Full Dataset
```
Replace with:
```tsx
Analyze All Codes
```

And update the button class from `bg-blue-600 hover:bg-blue-700` to `bg-[#2b5346] hover:bg-[#0d3a2f]`.

- [ ] **Replace the Compare Codes button:**

Find:
```tsx
Compare selected codes
```
Replace with:
```tsx
Compare Codes
```

- [ ] **Update focus rings in textarea and search input** from `focus:ring-blue-500 focus:border-blue-500` to `focus:ring-[#2b5346] focus:border-[#2b5346]` (two instances).

- [ ] **Verify in browser:** Upload a test file, proceed to wizard. Cards should have green ring on selection. Buttons dark green. No blue anywhere on this screen.

- [ ] **Commit:**
```bash
git add src/App.tsx
git commit -m "style(app): redesign wizard screen with FreshPrep brand colors and cleaned copy"
```

---

## Task 11: Redesign App.tsx — Report Dashboard (Screen 3)

**Files:**
- Modify: `src/App.tsx` (report dashboard, `hasReportGenerated` branch, lines ~940–1155)

- [ ] **Replace the outer report container and add sidebar layout:**

Replace:
```tsx
<div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-5 select-text" id="report-dashboard">
```

With:
```tsx
<div className="flex-1 overflow-hidden flex flex-row select-text" id="report-dashboard">

{/* Sidebar navigation */}
<nav
  id="report-sidebar"
  className="hidden lg:flex flex-col w-48 shrink-0 border-r border-[#e5e5e5] bg-white overflow-y-auto py-5 px-3 gap-0.5"
>
  {[
    { id: 'portfolio-health-summary', label: 'Summary' },
    { id: 'kpi-cards-section', label: 'KPIs' },
    { id: 'key-findings-section', label: 'Findings' },
    { id: 'charts-visualizers-section', label: 'Chart' },
    { id: 'report-province-section', label: 'Provinces' },
    { id: 'report-missing-codes-section', label: 'Missing Codes' },
    { id: 'report-details-section', label: 'Data Table' },
  ].map(item => (
    <a
      key={item.id}
      href={`#${item.id}`}
      className="px-3 py-2 text-xs text-[#3d3d3d] rounded hover:bg-[#f8f7f5] hover:text-[#2b5346] font-medium"
      style={{ transition: 'color 150ms var(--ease-out), background-color 150ms var(--ease-out)' }}
    >
      {item.label}
    </a>
  ))}
</nav>

{/* Main content */}
<div className="flex-1 overflow-y-auto p-5 bg-[#f8f7f5] flex flex-col gap-5">
```

- [ ] **Add the closing `</div>` for the sidebar layout** at the end of the report section (after the footer), before the closing `</div>` of the report branch:

```tsx
</div> {/* end main content */}
</div> {/* end report-dashboard flex row */}
```

- [ ] **Replace the tab strip with FreshPrep styling:**

Replace:
```tsx
<div className="flex border-b border-blue-100 gap-6 shrink-0 select-none pb-2 items-center justify-between" id="workspace-tabs-strip">
```

With:
```tsx
<div className="flex border-b border-[#e5e5e5] gap-6 shrink-0 select-none pb-2 items-center justify-between lg:hidden" id="workspace-tabs-strip">
```

(Hidden on large screens where sidebar nav takes over.)

Update the active tab classes from:
```
text-blue-800 border-b-2 border-blue-700 font-extrabold
```
To:
```
text-[#2b5346] border-b-2 border-[#2b5346] font-semibold
```

- [ ] **Replace the portfolio health summary section header:**

Replace:
```tsx
<h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
  <Sparkles className="w-4 h-4 text-blue-600" />
  Code Performance Summary
</h3>
```

With:
```tsx
<h3 className="text-sm font-semibold text-[#1a1a1a]">Code Performance</h3>
```

- [ ] **Replace performance tier metric tiles** (High Converting, Average, Weak):

Replace the High Converting tile:
```tsx
<div className="p-3 bg-[#eef4f1] border border-[#2b5346]/20 rounded-lg space-y-1 text-center sm:text-left"
  style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '50ms' }}
>
  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2b5346] font-mono">
    High Converting
  </p>
  <p className="text-lg font-bold text-[#2b5346] font-mono">
    {portfolioHealth?.strong}
  </p>
  <p className="text-[9px] text-[#3d3d3d] font-medium">≥ 40% conversion</p>
</div>
```

Replace the Average tile:
```tsx
<div className="p-3 bg-[#fdf8e1] border border-[#e7bd27]/30 rounded-lg space-y-1 text-center sm:text-left"
  style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '100ms' }}
>
  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a6f00] font-mono">
    Average
  </p>
  <p className="text-lg font-bold text-[#8a6f00] font-mono">
    {portfolioHealth?.average}
  </p>
  <p className="text-[9px] text-[#3d3d3d] font-medium">20–39% conversion</p>
</div>
```

Replace the Weak tile:
```tsx
<div className="p-3 bg-[#fef3ed] border border-[#e78a58]/30 rounded-lg space-y-1 text-center sm:text-left"
  style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '150ms' }}
>
  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9b4a1c] font-mono">
    Weak
  </p>
  <p className="text-lg font-bold text-[#9b4a1c] font-mono">
    {portfolioHealth?.weak}
  </p>
  <p className="text-[9px] text-[#3d3d3d] font-medium">&lt; 20% conversion</p>
</div>
```

- [ ] **Replace the Regional Breakdown header:**

Replace:
```tsx
<h2 className="text-xs font-bold font-mono uppercase tracking-widest text-blue-800">
  📍 Regional Breakdown
</h2>
```

With:
```tsx
<h2 className="text-xs font-semibold uppercase tracking-wider text-[#3d3d3d]">Regional breakdown</h2>
```

- [ ] **Replace the footer:**

Replace:
```tsx
<footer id="saas-footer" className="text-center text-[10px] text-slate-400 font-mono py-4 border-t border-slate-200 mt-auto shrink-0 flex items-center justify-between">
  <span>Fresh Prep Campaign Intelligence &copy; {new Date().getFullYear()}</span>
  <span>Validated 100% Client-Side inside secure sandboxed event layers.</span>
</footer>
```

With:
```tsx
<footer id="saas-footer" className="text-[10px] text-[#a1a1a1] font-mono py-4 border-t border-[#e5e5e5] mt-auto shrink-0 flex items-center justify-between px-1">
  <span>FreshPrep Campaign Intelligence · {new Date().getFullYear()}</span>
  <span>All analysis runs client-side. No data leaves your browser.</span>
</footer>
```

- [ ] **Also remove the `Sparkles` import** from the lucide-react import line at the top of App.tsx since it's no longer used:

Remove `Sparkles,` from the import block.

- [ ] **Verify in browser:** Load a report. Should show sidebar nav on desktop, green metric tiles, no emoji in headers, updated footer.

- [ ] **Commit:**
```bash
git add src/App.tsx
git commit -m "style(app): redesign report dashboard with sidebar nav and FreshPrep brand colors"
```

---

## Task 12: Update DashboardMetrics.tsx

**Files:**
- Modify: `src/components/DashboardMetrics.tsx`

- [ ] **Replace `emerald` icon/bg classes with FreshPrep brand colors** in the KPI arrays:

In `primaryKpis`, replace all instances of:
```tsx
color: "text-emerald-700 bg-emerald-50 border-emerald-100",
bgClass: "bg-white border-slate-200/80 hover:border-emerald-300",
```
With:
```tsx
color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
bgClass: "bg-white border-[#e5e5e5] hover:border-[#2b5346]/40",
```

In `advancedKpis`, replace:
```tsx
color: "text-emerald-600 bg-emerald-50 border-emerald-100",
bgClass: "bg-white border-slate-200",
```
With:
```tsx
color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
bgClass: "bg-white border-[#e5e5e5]",
```

And the missing-codes warning:
```tsx
color: summary.numCodesMissing > 0 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-slate-400 bg-slate-50 border-slate-100",
```
With:
```tsx
color: summary.numCodesMissing > 0 ? "text-[#9b4a1c] bg-[#fef3ed] border-[#e78a58]/30" : "text-[#a1a1a1] bg-[#f8f7f5] border-[#e5e5e5]",
```

- [ ] **Replace the toggle button `emerald` text color:**

Replace:
```tsx
<span className="text-emerald-750">Hide Advanced Metrics</span>
<ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
```

With:
```tsx
<span className="text-[#2b5346]">Hide advanced metrics</span>
<ChevronUp className="w-3.5 h-3.5 text-[#2b5346]" />
```

- [ ] **Add active scale to KPI card hover** on the primary grid cards:

Add `style` prop to each primary KPI card div:
```tsx
style={{ transition: 'box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
```

- [ ] **Commit:**
```bash
git add src/components/DashboardMetrics.tsx
git commit -m "style(metrics): update KPI cards to FreshPrep brand colors"
```

---

## Task 13: Update KeyFindingsSection.tsx, PerformanceChart.tsx, ProvinceIntelligence.tsx

**Files:**
- Modify: `src/components/KeyFindingsSection.tsx`
- Modify: `src/components/PerformanceChart.tsx`
- Modify: `src/components/ProvinceIntelligence.tsx`

- [ ] **KeyFindingsSection.tsx — replace section wrapper and icon:**

Replace the outer div class:
```tsx
className="p-4 sm:p-5 rounded-2xl border border-emerald-100 bg-emerald-50/15 shadow-2xs animate-fade-in"
```
With:
```tsx
className="p-4 sm:p-5 rounded-lg border border-[#2b5346]/15 bg-[#eef4f1]/40 animate-fade-in"
```

Replace the icon container:
```tsx
className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center"
```
With:
```tsx
className="w-8 h-8 rounded-md bg-[#2b5346]/10 text-[#2b5346] flex items-center justify-center"
```

Also find and replace the section heading if it has an emoji — remove any emoji prefix from the heading text inside this component.

- [ ] **PerformanceChart.tsx — update `getRatingColor` bar colors:**

Replace:
```tsx
case "Strong": return "bg-emerald-600";
case "Good":   return "bg-emerald-500";
case "Average":return "bg-emerald-400";
case "Weak":   return "bg-amber-500";
case "Poor":   return "bg-rose-550";
```

With:
```tsx
case "Strong": return "bg-[#2b5346]";
case "Good":   return "bg-[#3d7060]";
case "Average":return "bg-[#e7bd27]";
case "Weak":   return "bg-[#e78a58]";
case "Poor":   return "bg-[#850b0b]";
```

- [ ] **ProvinceIntelligence.tsx — remove emoji from any section header it renders:**

Search for emoji in JSX strings (🇨🇦 or 📍 or any emoji). If found, remove it and update the label to plain text.

- [ ] **Commit:**
```bash
git add src/components/KeyFindingsSection.tsx src/components/PerformanceChart.tsx src/components/ProvinceIntelligence.tsx
git commit -m "style(components): apply FreshPrep colors and remove emoji from section headers"
```

---

## Task 14: Update MissingCodesSection.tsx and DataExplorer.tsx

**Files:**
- Modify: `src/components/MissingCodesSection.tsx`
- Modify: `src/components/DataExplorer.tsx`

- [ ] **MissingCodesSection.tsx — update warning color to orange accent:**

Search for `amber`, `yellow`, or `orange` Tailwind classes in this file. Replace warning amber with `#e78a58` orange accent:
- `border-amber-*` → `border-[#e78a58]/30`
- `bg-amber-*` → `bg-[#fef3ed]`
- `text-amber-*` → `text-[#9b4a1c]`

Search for any emoji in section headers and remove them.

- [ ] **DataExplorer.tsx — remove emoji from any rendered section or tab headers:**

Search for emoji characters in JSX strings. Replace with plain text labels.

Any `text-blue-*` class for interactive elements → `text-[#2b5346]`.
Any `border-blue-*` class → `border-[#2b5346]`.

- [ ] **Commit:**
```bash
git add src/components/MissingCodesSection.tsx src/components/DataExplorer.tsx
git commit -m "style(components): update missing codes warning colors, remove remaining emoji"
```

---

## Task 15: Animation Pass — Emil's Rules Applied

**Files:**
- Modify: `src/App.tsx` (button active states, drag zone already done in Task 9)
- Modify: `src/index.css` (add `@keyframes slideUp` if not present)

- [ ] **Add `@keyframes slideUp` to `index.css`** (if not already there from Task 5):

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Add active scale to the "Export Excel" button in the header** (already done in Task 8 via onMouseDown/Up). Verify the pattern works in browser.

- [ ] **Add transition to the "New Dataset" button and "Print" header button:**

For all header buttons that don't yet have it, add:
```tsx
style={{ transition: 'background-color 150ms var(--ease-out)' }}
```

- [ ] **Add button active scale to the wizard "Analyze Codes", "Analyze All Codes", "Compare Codes" buttons:**

For each primary action button in wizard flow panels, add:
```tsx
onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
onMouseUp={e => (e.currentTarget.style.transform = '')}
onMouseLeave={e => (e.currentTarget.style.transform = '')}
style={{ transition: 'background-color 150ms var(--ease-out), transform 100ms var(--ease-out)' }}
```

- [ ] **Add stagger entrance to report metric tiles** (already partially done in Task 11 with `animationDelay`). Verify the "Codes Analyzed", "Portfolio Conv", and "Portfolio LTV" tiles also have stagger:

For each remaining metric tile in the portfolio health grid (Codes Analyzed, Portfolio Conv, Portfolio LTV tiles), add:
```tsx
style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '<N>ms' }}
```
Use 0ms, 50ms, 100ms, 150ms, 200ms, 250ms for the six tiles in order.

- [ ] **Verify `prefers-reduced-motion` collapses all animations** — already handled globally in `index.css` from Task 5. No additional work needed.

- [ ] **Test in browser:** Click buttons and verify `scale(0.97)` press feedback. Load report and verify tiles animate in with stagger. Open DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` — all tiles should appear instantly with no animation.

- [ ] **Commit:**
```bash
git add src/App.tsx src/index.css
git commit -m "style(animation): add Emil-principle button press feedback and stagger entrance"
```

---

## Task 16: Pre-Flight Validation

**Files:**
- Read: `docs/superpowers/specs/2026-06-01-freshprep-full-overhaul-design.md` (checklist)

- [ ] **Run TypeScript lint — must be zero errors:**
```bash
npm run lint 2>&1
```
Expected output: no `error TS` lines.

- [ ] **Check for remaining blue Tailwind classes in source:**
```bash
grep -r "text-blue\|bg-blue\|border-blue\|ring-blue" src/ --include="*.tsx" --include="*.ts"
```
Expected: no results. If any found, replace with FreshPrep equivalents.

- [ ] **Check for emoji in JSX copy:**
```bash
grep -Prn "[\x{1F300}-\x{1F9FF}]|[\x{2600}-\x{26FF}]|[\x{2700}-\x{27BF}]" src/ --include="*.tsx" 2>/dev/null || grep -rn "📊\|🚀\|🔍\|📍\|⭐\|🏆\|✓\|✗\|🔓\|🖨️" src/ --include="*.tsx"
```
Expected: no results in visible UI copy (functional use like `window.print()` is fine).

- [ ] **Check for em-dashes in JSX strings:**
```bash
grep -rn "—\|–" src/ --include="*.tsx"
```
Expected: no results.

- [ ] **Verify DM fonts load in browser:**

Open http://localhost:3000, open DevTools → Elements, click on any text element. Under Computed → font-family, verify "DM Sans" is the resolved font (not Inter or system-ui).

- [ ] **Verify WCAG contrast — manual spot checks:**

| Pair | Expected ratio |
|---|---|
| White text on `#2b5346` nav | ≥ 4.5:1 (verify: ~8.5:1 — passes AAA) |
| `#1a1a1a` text on `#f8f7f5` | ≥ 4.5:1 (verify: ~16:1 — passes AAA) |
| `#2b5346` text on `#eef4f1` | ≥ 4.5:1 (verify: ~6.2:1 — passes AA+) |
| `#9b4a1c` text on `#fef3ed` | ≥ 4.5:1 (check with https://webaim.org/resources/contrastchecker/) |

- [ ] **Manual flow test — upload → wizard → report → print:**

1. Open http://localhost:3000
2. Verify split layout (brand panel left, upload right)
3. Upload a CSV or XLSX file
4. Verify validation card appears with green checkmark (no pulse animation)
5. Select "Specific Codes" → paste 2+ codes → click "Analyze Codes"
6. Verify report loads with sidebar nav visible on desktop
7. Click "Print" → verify print preview opens
8. Click "Export Excel" → verify button press gives `scale(0.97)` feedback

- [ ] **Final commit:**
```bash
git add -A
git commit -m "style: complete FreshPrep Campaign Intelligence visual overhaul

- Real FreshPrep brand identity: #2b5346 green, DM font family
- All 3 skills applied: Impeccable anti-slop, Taste-Skill dials, Emil animations
- JSX bugs fixed (ol/ul mismatch, stray closing tag)
- Full copy rework: no emoji, no em-dashes, verb+object button labels
- Sidebar navigation in report dashboard
- Asymmetric split upload screen
- Stagger entrance animations with prefers-reduced-motion support

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task that implements it |
|---|---|
| DM Sans / DM Serif Text / DM Mono fonts | Task 5 (index.css), Task 6 (DesignSystem.tsx) |
| `#2b5346` as primary brand color | Tasks 5, 6, 8–14 |
| Gold `#e7bd27` for Average tier | Tasks 11, 12 |
| Orange `#e78a58` for Weak tier | Tasks 11, 12, 14 |
| Asymmetric split upload screen | Task 9 |
| Variable-width flow cards | Task 10 |
| Sidebar nav in report dashboard | Task 11 |
| JSX bug fixes | Task 7 |
| Zero emoji in copy | Tasks 1–4, 10, 11, 13, 14 |
| Zero em-dashes | Tasks 1–4, 10, 11 — verified in Task 16 |
| Button `scale(0.97)` on `:active` | Tasks 8, 15 |
| Stagger entrance animations | Tasks 11, 15 |
| `prefers-reduced-motion` | Task 5 (global), verified Task 16 |
| Agent files rebased | Tasks 1–4 |
| App renamed Campaign Intelligence | Tasks 1–4, 8, 11 |
| Footer copy updated | Task 11 |
| WCAG contrast verified | Task 16 |

**No gaps found.** All spec requirements map to a task.

**Placeholder scan:** No TBDs, todos, or vague steps found. All code blocks are complete.

**Type consistency:** `designTokens.colors.brand` defined in Task 6, referenced in Task 6 only. All App.tsx changes use inline hex strings (`#2b5346`) consistent throughout Tasks 8–11. Component changes in Tasks 12–14 use same hex strings.
