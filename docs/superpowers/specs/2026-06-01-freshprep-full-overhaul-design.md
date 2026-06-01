# FreshPrep Campaign Intelligence — Full Overhaul Design Spec

**Date:** 2026-06-01
**Approach:** A — Agent-first, then UI
**Status:** Approved

---

## Overview

Full visual and copy overhaul of the FreshPrep Event Code Performance Analyzer. Rebases the entire design system, agent files, and app UI onto the real FreshPrep brand identity. Applies all three merged skills (Impeccable, Taste-Skill, Emil) throughout.

The app is renamed **FreshPrep Campaign Intelligence** and redesigned for the internal FreshPrep marketing and analytics team analyzing promo/event code performance.

---

## Design Dials (Taste-Skill)

| Dial | Value | Rationale |
|---|---|---|
| DESIGN_VARIANCE | 5 | Offset, left-aligned. Not symmetric, not asymmetric chaos. Data tool clarity. |
| MOTION_INTENSITY | 3 | Hover + CSS transitions only. No scroll animations. Analysts work for 30+ min sessions. |
| VISUAL_DENSITY | 7 | Cockpit-grade density. 1px dividers, DM Mono for numbers, information-rich layout. |

---

## Design System

### Colors

All colors replaced from generic blue palette to real FreshPrep brand identity (sourced from freshprep.ca).

| Token | Value | Usage |
|---|---|---|
| `--color-brand` | `#2b5346` | Primary actions, nav background, focus rings, active states |
| `--color-brand-dark` | `#0d3a2f` | Hover, pressed states |
| `--color-brand-surface` | `#eef4f1` | Subtle green-tinted backgrounds, hover fills |
| `--color-accent-gold` | `#e7bd27` | Average performers, callout highlights |
| `--color-accent-orange` | `#e78a58` | Weak performers, secondary warnings |
| `--color-surface` | `#f8f7f5` | Page background (warm off-white, not blue-50) |
| `--color-surface-white` | `#ffffff` | Card backgrounds, input fields |
| `--color-error` | `#850b0b` | Error states (from FreshPrep palette) |
| `--color-error-surface` | `#ffd0d0` | Error background tints |
| `--color-text` | `#1a1a1a` | Primary text (off-black) |
| `--color-text-muted` | `#3d3d3d` | Secondary text |
| `--color-text-disabled` | `#a1a1a1` | Disabled, placeholder |
| `--color-border` | `#e5e5e5` | Default borders |
| `--color-border-strong` | `#a6a7a5` | Stronger dividers |

**Performance tier semantic mapping:**
- High Converting (≥40%): `--color-brand` tinted surface
- Average (20–39%): `--color-accent-gold` tinted surface
- Weak (<20%): `--color-accent-orange` tinted surface

### Typography

Replace Geist Sans/Mono entirely with the DM type family (matches freshprep.ca).

| Role | Font | Usage |
|---|---|---|
| Body / UI | DM Sans | All interface labels, body copy, buttons, inputs |
| Display | DM Serif Text | Page titles, section headers, brand wordmark |
| Data / Mono | DM Mono | Numbers, codes, file names, timestamps |

**Type scale (unchanged structure, updated family):**

| Name | Size | Weight | Usage |
|---|---|---|---|
| 4XL | 32px / 600 | DM Serif Text | Page/screen titles |
| 3XL | 24px / 600 | DM Serif Text | Section headers |
| 2XL | 20px / 500 | DM Sans | Subsection headers |
| XL | 16px / 500 | DM Sans | Card titles, bold labels |
| LG | 14px / 400 | DM Sans | Body text, UI labels |
| SM | 12px / 400 | DM Sans | Captions, metadata |
| XS | 11px / 400 | DM Mono | Badges, timestamps, code values |

### Spacing

4px base rhythm — unchanged.

### Motion (Emil's framework)

- Button `:active` → `transform: scale(0.97)`, 100ms `cubic-bezier(0.23, 1, 0.32, 1)`
- Card hover → `box-shadow` lift, 150ms `ease-out`
- Drag zone state → border + bg color, 200ms
- Validation entrance → `opacity: 0` + `translateY(8px)` to visible, 200ms. Never from `scale(0)`.
- Report section stagger → 50ms delay offset per card, max 400ms total
- Sidebar active → left-border + text color, 150ms
- All via CSS `transition` (interruptible). Zero `@keyframes` for UI states.
- `prefers-reduced-motion`: collapse all transforms to instant

---

## Agent Files to Update

All four agent/skill files are updated in Phase 1 before any UI code changes.

### `.instructions.md`
- Replace Geist Sans → DM Sans / DM Serif Text / DM Mono
- Replace blue primary → `#2b5346` FreshPrep green
- Update "Brief Inference" user profiles: internal FreshPrep marketing + analytics team
- Update brand voice: "Precise, trustworthy, quietly ambitious. Numbers speak for themselves. Built for the team that feeds Canada."
- Update anti-patterns to include FreshPrep-specific ones

### `DESIGN.md`
- Full color token rewrite with FreshPrep palette
- Typography section: DM family
- Component specs updated (buttons, cards, badges all using green)
- Remove all blue-400/500 references

### `PRODUCT.md`
- App name: FreshPrep Campaign Intelligence
- Users: internal FreshPrep marketing analysts, campaign managers, growth team
- Brand voice update
- Copy examples updated to remove emoji and generic phrasing

### `SKILL.md`
- Update design token references throughout
- Update "Before you design" section with FreshPrep context
- Update component code examples with green palette
- Anti-patterns: add FreshPrep-specific tells to avoid

---

## Screen Designs

### Screen 1 — Upload (Launch State)

**Layout:** Asymmetric split (Taste-Skill offset, DESIGN_VARIANCE 5)
- Left panel, ~40% width, `#2b5346` background:
  - "FreshPrep Campaign Intelligence" in DM Serif Text, white, 32px
  - One-line brand statement: "Analyze campaign code performance. No spreadsheet juggling."
  - Quiet, no decorative elements
- Right panel, ~60% width, `#f8f7f5` background:
  - Upload interface: DM Sans labels, honest drag zone
  - File format pills (CSV, XLSX, XLS, TSV) — no emoji prefix
  - "How it works" list — 3 items, numbered circles in `#2b5346`
  - No "Research Data Portal" headline, no decorative icons

**Copy changes:**
- Header title: "Upload Campaign Data"
- Subtext: "Upload a CSV or XLSX export. We validate columns and surface performance automatically."
- Section label: "Accepted formats" (no emoji)
- Step list header: "How it works"

### Screen 2 — Validation + Wizard

**Layout:** Single column, `max-w-3xl`, centered on `#f8f7f5`

- Validation card: green `#2b5346` checkmark, no `animate-pulse`, semantic text
- Flow cards: **variable widths** to establish hierarchy
  - "Specific Codes" — primary path, full row width
  - "Full Dataset" + "Compare Codes" — side by side below
- Selected flow expands inline, no modal
- No uppercase eyebrow labels on sections

**JSX bug fixes applied here:**
- Line 456: `</ul>` → `</ol>`
- Line 700: remove stray `</p>`

### Screen 3 — Report Dashboard

**Layout:** Fixed left sidebar (200px) + scrollable main content

**Sidebar:**
- FreshPrep green `#2b5346` left-border on active link
- Section anchors: Summary, KPIs, Findings, Chart, Provinces, Missing Codes, Data Table
- DM Sans 13px, muted by default, brand color on active
- Sticky, does not scroll with content

**Main content (section by section):**

1. **Code Performance** (renamed from "Code Performance Summary")
   - 6 metric tiles: green for High Converting, gold for Average, orange for Weak
   - DM Mono for all numbers
   - No Sparkles icon, no uppercase FONT_MONO labels

2. **KPI Cards** — same data, FreshPrep green accents

3. **Key Findings** — clean list, semantic color by finding type

4. **Performance Chart + Portfolio Widget** — 8/4 col split unchanged, colors updated

5. **Regional Breakdown** — renamed from "📍 Regional Breakdown", no emoji prefix

6. **Missing Codes** — if present, warning state uses orange `#e78a58`

7. **Detailed Table** — 1px dividers, DM Mono numbers, scannable

**Footer:**
- "FreshPrep Campaign Intelligence · 2026" (no copyright symbol, no em-dash)
- "All analysis runs client-side. No data leaves your browser."

---

## Copy Rules (Impeccable + Taste-Skill applied)

1. Zero emoji in UI copy
2. Zero uppercase eyebrow labels above every section
3. No em-dashes anywhere (use period, comma, or colon)
4. Button labels: verb + object ("Analyze Codes", "Export Excel", "Replace File")
5. Error messages: specific and guiding, not punitive
6. No hedging language ("we think", "might", "could")
7. Numbers always in DM Mono
8. One copy register throughout: precise, internal-tool tone

### Full copy replacement table

| Before | After |
|---|---|
| "FreshPrep Research" | "FreshPrep Campaign Intelligence" |
| "Research Data Portal" | "Upload Campaign Data" |
| "We'll validate, analyze, and surface insights automatically." | "Upload a CSV or XLSX export. We validate columns and surface performance automatically." |
| "📊 Accepted Formats" | "Accepted formats" |
| "🚀 Getting Started" | "How it works" |
| "🔍 Data Validation" | "Data validation" |
| "🔓 Choose Your Analysis" | "Choose your analysis" |
| "📊 Analysis Report" (tab) | "Report" |
| "🔍 Raw Data" (tab) | "Raw data" |
| "📍 Regional Breakdown" | "Regional breakdown" |
| "Analyze Selected Codes" | "Analyze Codes" |
| "Analyze Full Dataset" | "Analyze All Codes" |
| "Compare selected codes" | "Compare Codes" |
| "CODE PERFORMANCE SUMMARY" (print) | "Code Performance Summary" |
| "Fresh Prep Campaign Intelligence © 2026" | "FreshPrep Campaign Intelligence · 2026" |
| "Validated 100% Client-Side inside secure sandboxed event layers." | "All analysis runs client-side. No data leaves your browser." |
| "Upload Dataset" (button) | "New Dataset" |
| "Print Report" | "Print" |
| "Upload campaign performance data for intelligent analysis." | "Upload a CSV or XLSX export. We validate columns and surface performance automatically." |

---

## Implementation Order

**Phase 1 — Agent files (source of truth first)**
1. Update `DESIGN.md` — full color + typography rewrite
2. Update `PRODUCT.md` — name, users, voice, copy examples
3. Update `.instructions.md` — philosophy, tokens, brand voice
4. Update `SKILL.md` — component examples, token references

**Phase 2 — Bug fixes**
1. Fix `</ul>` → `</ol>` at App.tsx:456
2. Remove stray `</p>` at App.tsx:700

**Phase 3 — Design system (DesignSystem.tsx)**
1. Update all color tokens to FreshPrep palette
2. Update typography to DM font family (load via index.html or index.css)
3. Update component styles (Button, Card, Badge, Alert, Table)
4. Add CSS custom properties to index.css

**Phase 4 — App.tsx full redesign**
1. Header: dark green nav, Campaign Intelligence wordmark
2. Upload screen: asymmetric split layout
3. Wizard screen: variable-width flow cards, fixed JSX
4. Report dashboard: sidebar navigation + main content
5. Print view: updated copy and styling

**Phase 5 — Component files**
1. Update each component (DashboardMetrics, PerformanceChart, DetailedTable, etc.) with FreshPrep palette
2. Apply DM Mono to all number displays
3. Update copy within components (remove emoji, fix labels)

**Phase 6 — Animations**
1. Add `transition` declarations throughout (Emil's rules)
2. Button `:active` scale
3. Stagger entrance for report sections
4. Sidebar active states
5. Drag zone transitions
6. `prefers-reduced-motion` media query

**Phase 7 — Pre-flight validation**
1. Run Taste-Skill 14-point pre-flight check
2. Verify WCAG AA contrast on all text/bg combinations
3. Check zero em-dashes, zero emoji in copy
4. Confirm DM font loading
5. Verify JSX has no errors (npm run lint passes clean)

---

## Anti-Patterns Banned (Impeccable absolute bans applied)

- No gradient text
- No glassmorphism
- No side-stripe borders
- No identical card grids (3 equal feature cards) — flow cards use variable widths
- No uppercase eyebrow above every section
- No numbered section markers (01/02/03)
- No hero-metric template (big number + tiny label in isolation)
- No bouncy spring animations
- No emoji in interface copy
- No em-dashes in any visible string
- No pure `#000000` or `#ffffff` — use off-black and off-white
- No `transition: all` — specify exact properties
- No `scale(0)` entrances — start from `scale(0.97)` + opacity
