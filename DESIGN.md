---
name: FreshPrep Brand Design System
description: Design specifications for FreshPrep research dashboard platform. Anti-slop design system for research, compliance, and data-driven products.
version: 1.0.0
---

# FreshPrep Design System

## Brand Identity

**Mission**: Make research-grade data analysis accessible and trustworthy.

**Voice**: Calm, clinical, precise. No hype. No sales. Just clarity.

**Visual Language**: Clean, evidence-based design that removes cognitive load and reveals insights.


## Colors

### Primary: FreshPrep Green
```
Hex: #2b5346   /* Brand green: primary actions, nav, focus rings */
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
- High Converting (≥40%): `#eef4f1` background, `#2b5346` text
- Average (20–39%): `#fdf8e1` background, `#8a6f00` text
- Weak (<20%): `#fef3ed` background, `#9b4a1c` text

### Accessibility
All primary text combinations achieve WCAG AA (4.5:1+). White text on `#2b5346` achieves AAA (~8.5:1).


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

### Line Heights
- Headers (600 weight): 1.2
- Subheaders (500 weight): 1.3
- Body text (400 weight): 1.6
- Captions (400 weight): 1.5

### Letter Spacing
- Headings: -0.01em (tighter)
- Body: 0em (normal)
- Captions: 0.005em (very slight)


## Spacing & Grid

### Spacing Scale (4px base)
```
2:  4px
3:  8px
4:  12px
5:  16px
6:  24px
8:  32px
10: 40px
12: 48px
```

### Grid
- Desktop: 12-column with 24px gutters
- Tablet: 8-column with 16px gutters
- Mobile: 4-column with 12px gutters
- Container max-width: 1440px

### Component Padding
- Buttons: 8px (vertical) × 12px (horizontal)
- Cards: 16px
- Sections: 24px
- Page padding: 0px (full-width) → 16px (mobile)


## Components

### Button Variants

**Primary** (Call to action)
- Background: oklch(60% 0.14 250) blue-400
- Text: white
- Hover: oklch(50% 0.15 250) blue-500
- Disabled: oklch(94% 0.03 250) blue-100 + dark gray text

**Secondary** (Moderate action)
- Background: oklch(95% 0 0) neutral-100
- Text: oklch(12% 0 0) neutral-900
- Hover: oklch(89% 0 0) neutral-200
- Border: none (implied by background)

**Ghost** (Low emphasis)
- Background: transparent
- Text: oklch(60% 0.14 250) blue-400
- Hover: oklch(95% 0 0) neutral-100 background
- Useful for secondary actions

### Button Sizes
- **Large**: 14px text, 12px × 16px padding
- **Medium**: 12px text, 8px × 12px padding
- **Small**: 11px text, 4px × 8px padding

### States
- Default: as specified
- Hover: Slightly darker background (or shadow lift for card buttons)
- Active: Darker background + scale 0.98
- Disabled: 50% opacity + cursor-not-allowed
- Loading: Show spinner, disable interaction

### Card
- Background: white
- Border: 1px oklch(84% 0 0) neutral-300
- Border-radius: 8px
- Padding: 16px
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Hover Shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
- Transition: all 200ms ease-out

### Input / Form Field
- Border: 1px oklch(84% 0 0) neutral-300
- Border-radius: 4px
- Padding: 8px 12px
- Focus: border-color oklch(60% 0.14 250) blue-400, box-shadow 0 0 0 3px rgba(59, 130, 246, 0.1)
- Disabled: background oklch(98% 0 0) neutral-50, text oklch(64% 0 0) neutral-500
- Error: border-color oklch(58% 0.15 28) red-400

### Badge
- Padding: 4px 8px
- Border-radius: 4px
- Font-size: 11px
- Font-weight: 500
- Example variants:
  - **Success**: bg green-100, text green-700
  - **Warning**: bg amber-100, text amber-700
  - **Error**: bg red-100, text red-700
  - **Neutral**: bg neutral-200, text neutral-700

### Tables
- Row height: 40px
- Header bg: oklch(98% 0 0) neutral-50
- Header border: 1px oklch(84% 0 0) neutral-300
- Row hover: oklch(98% 0 0) neutral-50 background
- Cell padding: 12px 16px
- Text color: oklch(12% 0 0) neutral-900
- Muted text (secondary columns): oklch(32% 0 0) neutral-700

### Charts / Data Visualization
- Use semantic colors from palette
- Chart grid lines: oklch(95% 0 0) neutral-100
- Legend: position bottom or right
- Tooltip: dark background neutral-900, white text
- Animation: staggered entrance, no auto-rotate


## Motion & Animation

### Easing Functions
```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);      /* Quick exit */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Smooth both ways */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Physics – rare */
```

### Duration Guidelines
- Feedback (hover, focus): 150ms
- Transition (page change, modal): 250ms
- Entrance (reveal): 300-400ms
- Exit (hide): 200ms

### Safe Animations
✅ **Entrance**: Fade + slight scale (200ms)
✅ **State change**: Color transition (150ms)
✅ **Hover**: Icon animation + color shift (150ms)
✅ **Loading**: Rhythmic progress bar (2s cycle)
✅ **Data reveal**: Staggered scale-in with delay

❌ **Never**: Bouncy springs, scroll-triggered animations, auto-playing transitions


## Responsive Breakpoints

| Breakpoint | Width | Grid | Use Case |
|-----------|-------|------|----------|
| Mobile   | < 640px | 1-col | Phones |
| Tablet   | 640px–1024px | 2-col | Tablets |
| Desktop  | ≥ 1024px | 3-col+ | Monitors |

Content drives breakpoints, not fashion.


## Accessibility

### WCAG AAA Compliance
- Text contrast: minimum 7:1
- Focus indicators: visible 2px outline
- Touch targets: 48px minimum
- Font size: 14px minimum for body text
- Color alone never conveys meaning (use icons + labels)

### Motion & Seizure
- Animations flashing < 3 times/sec
- Support `prefers-reduced-motion` media query
- Never auto-play animations

### Interactive Elements
- All buttons are large enough to tap
- Form labels visible and connected
- Error messages clear and helpful
- Links underlined or sufficiently different style
- Keyboard navigation works fully

### Semantic HTML
```html
<button> for actions
<a> for links
<label> for form fields
<main>, <nav>, <section> for structure
<img alt="..."> for images
<table> for data, not layout
```


## Copy & Voice

### Tone
Precise, trustworthy, quietly ambitious. No hype. No emoji in UI copy. Numbers speak for themselves. Built for the team that feeds Canada.

- No exclamation points
- No emoji in interface labels or section headers
- No marketing buzzwords (streamline, empower, seamless, etc.)
- No em-dashes — use period, comma, or colon instead
- Button labels: verb + object ("Analyze Codes", "Export Excel", "Replace File")
- Error messages: specific and guiding, not punitive

### Example Copy

**Button labels** (verbs, specific)
✅ "Analyze Codes"
✅ "Export Excel"
✅ "Replace File"
❌ "Submit"
❌ "Go"

**Error messages** (helpful, not punitive)
✅ "Email format required. Use: name@company.com"
❌ "Invalid email"

**Empty states**
✅ "No codes matched this period."
❌ "No data found."

**Loading states**
✅ "Validating campaign data..."
❌ "Processing..."


---

## Implementation

This DESIGN.md follows Google Stitch spec and is portable across design and development tools. Use these specifications as source of truth for all FreshPrep products.

Last updated: 2026-06-01
