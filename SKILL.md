---
name: freshprep-campaign-intelligence
description: |-
  FreshPrep Campaign Intelligence design system. Merged Impeccable + Taste-Skill + Emil,
  calibrated to real FreshPrep brand identity: dark green #2b5346, DM font family,
  zero emoji in UI copy, analyst-grade density. For internal FreshPrep marketing tools.
version: 1.0.0
author: FreshPrep Research Team
tags:
  - design
  - research
  - dashboard
  - anti-slop
  - frontend
  - data-visualization
applyTo:
  filePathPattern: |
    **/*.{tsx,jsx,ts,js,css}
  modelGlobs: ["claude", "codex", "cursor"]
---

# FreshPrep Research Design System

## Vision

Build dashboards and data interfaces that researchers trust. Eliminate design slop. Make every pixel intentional. Let data speak clearly.

## Core Principles

### Anti-Slop Design (Impeccable)
Remove the reflexive defaults that make AI-generated UIs look generic:
- **Typography**: Real typeface chosen on purpose (Geist Sans), not Inter by default
- **Color**: OKLCH-based semantic palette, not purple gradients
- **Spacing**: Rhythm-based (4, 8, 12, 16, 24, 32px), not random
- **Interaction**: Honest affordances—buttons look clickable, inputs look editable
- **Motion**: Physics-based easing, not bouncy springs without purpose

### Precision Layout (Taste-Skill)
Design languages require tuning. Before you build, set your dials:

```yaml
DESIGN_VARIANCE: 4        # 1-10: For dashboards, lean toward clarity (4-5) over chaos
MOTION_INTENSITY: 2       # 1-10: Data products: motion informs, not performs
VISUAL_DENSITY: 7         # 1-10: Researchers handle density; make it scannable
```

### Deliberate Animation (Emil)
Every animation must answer these questions:
1. Does it guide attention to the right thing?
2. Is it smooth (easing) or responsive (spring)?
3. Does it interrupt workflow or run alongside?
4. Will it land cleanly or feel incomplete?

Safe animations for data dashboards:
- **Entrance**: Subtle fade + scale (200ms)
- **Hover**: Color shift + icon animation (150ms)
- **Data reveal**: Staggered scale-in (400ms per item)
- **Transition**: Cross-fade between states (250ms)


## The FreshPrep Design System

### Tokens

#### Typography
```css
--font-sans:   'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--font-serif:  'DM Serif Text', Georgia, serif;
--font-mono:   'DM Mono', 'Courier New', monospace;

/* Type Scale */
--type-4xl: 32px / 1.2 / 600 weight;  /* Section headers */
--type-3xl: 24px / 1.3 / 600 weight;  /* Card titles */
--type-2xl: 20px / 1.4 / 500 weight;  /* Subsections */
--type-xl:  16px / 1.5 / 500 weight;  /* Small headers, bold text */
--type-lg:  14px / 1.6 / 400 weight;  /* Body text, UI labels */
--type-sm:  12px / 1.5 / 400 weight;  /* Captions, hints, code */
--type-xs:  11px / 1.4 / 400 weight;  /* Tiny labels, badges */
```

#### Color Palette (OKLCH)
```css
/* FreshPrep Brand Colors */
--color-brand:          #2b5346;  /* Primary actions, nav, focus */
--color-brand-dark:     #0d3a2f;  /* Hover, pressed states */
--color-brand-surface:  #eef4f1;  /* Subtle green-tinted backgrounds */
--color-accent-gold:    #e7bd27;  /* Average performers, highlights */
--color-accent-orange:  #e78a58;  /* Weak performers, warnings */
--color-surface:        #f8f7f5;  /* Page background */
--color-error:          #850b0b;  /* Error states */
--color-text:           #1a1a1a;  /* Primary text (off-black) */
--color-text-muted:     #3d3d3d;  /* Secondary text */
--color-border:         #e5e5e5;  /* Default borders */
```

#### Spacing System
```css
--space-px:  1px;
--space-2:   4px;
--space-3:   8px;
--space-4:   12px;
--space-5:   16px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
```

#### Motion Easing
```css
/* Safe easing for data dashboards */
--ease-in:        cubic-bezier(0.4, 0, 1, 1);
--ease-out:       cubic-bezier(0, 0, 0.2, 1);
--ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1); /* Only when earned */
```


## Design Directives

### 1. Typography is Hierarchy

**Rule**: Type size + weight + color = information importance. Not decoration.

```tsx
// ✅ Right: Hierarchy through deliberate type choices
<header>
  <h1 style={{ fontSize: 'var(--type-3xl)', fontWeight: 600 }}>
    Compliance Status
  </h1>
  <p style={{ fontSize: 'var(--type-sm)', color: 'var(--color-neutral-700)' }}>
    30-day snapshot
  </p>
</header>

// ❌ Wrong: Everything the same size, hierarchy through color alone
<header>
  <div>Compliance Status</div>
  <div>30-day snapshot</div>
</header>
```

### 2. Color is Semantic

**Rule**: Blue = interaction/data. Green = success. Amber = warning. Red = error. Never choose color for beauty.

```tsx
// ✅ Right: Color tells the story
<Badge color="green">Passed</Badge>
<Badge color="amber">Pending Review</Badge>
<Badge color="red">Failed</Badge>

// ❌ Wrong: "Creative" colors hide meaning
<Badge color="purple">Status</Badge>
<Badge color="teal">Status</Badge>
<Badge color="orange">Status</Badge>
```

### 3. Spacing Creates Structure

**Rule**: Use the 4px rhythm grid. Never arbitrary spacing.

```tsx
// ✅ Right: Grid-aligned spacing
<div style={{ padding: 'var(--space-5)' }}>
  <div style={{ marginBottom: 'var(--space-4)' }}>Item 1</div>
  <div>Item 2</div>
</div>

// ❌ Wrong: Haphazard spacing
<div style={{ padding: '13px' }}>
  <div style={{ marginBottom: '6px' }}>Item 1</div>
  <div>Item 2</div>
</div>
```

### 4. Interaction States Are Explicit

**Rule**: Interactive elements have 4 clear states: default, hover, active, disabled.

```tsx
// ✅ Right: All states defined
const Button = ({ disabled, pressed, ...props }) => (
  <button
    {...props}
    style={{
      background: disabled
        ? 'var(--color-neutral-100)'
        : pressed
        ? 'var(--color-blue-500)'
        : 'var(--color-blue-400)',
      color: disabled ? 'var(--color-neutral-700)' : 'white',
      transition: 'all 150ms var(--ease-out)',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  />
);

// ❌ Wrong: Hover state is guessed
<button style={{ background: 'blue' }}>Click me</button>
```

### 5. Responsive Follows Content

**Rule**: Design mobile-first. Breakpoints exist because content needs them, not because design convention says so.

```tsx
// ✅ Right: Content drives breakpoints
<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr',      // Mobile: single column
  gap: 'var(--space-4)',
  '@media (min-width: 768px)': {
    gridTemplateColumns: '1fr 1fr', // Tablet+: two columns
  },
  '@media (min-width: 1280px)': {
    gridTemplateColumns: '1fr 1fr 1fr', // Desktop: three columns
  },
}}>
  {/* Content */}
</div>

// ❌ Wrong: Breakpoints because "that's what designers do"
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  // Breaks on mobile; no responsive rules
}}>
```

### 6. Animation Guides, Never Distracts

**Rule**: If animation doesn't make interaction feel better or guide attention, remove it.

Safe animations:
- **Page transitions**: Fade boundaries between sections
- **Hover feedback**: Subtle color/shadow changes
- **Loading states**: Rhythmic indicators (not spinners)
- **Data reveals**: Staggered entrance when content loads

**Never**:
- 🚫 Scroll-triggered animations that fight user control
- 🚫 Bouncy springs in data dashboards
- 🚫 Confetti, glitter, or celebration animations
- 🚫 Auto-playing transitions
- 🚫 Motion that interferes with reading


## Code Patterns

### Safe Component Structure

```tsx
// Button: All states covered
export const Button = ({ 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-[#2b5346] text-white hover:bg-[#0d3a2f] active:scale-[0.97]',
    secondary: 'bg-[#f8f7f5] text-[#1a1a1a] hover:bg-[#eef4f1]',
    ghost: 'text-[#2b5346] border border-[#2b5346] hover:bg-[#eef4f1] active:scale-[0.97]',
  };
  
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      disabled={disabled || loading}
      className={`
        ${variants[variant]} ${sizes[size]}
        rounded-md transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400
      `}
      {...props}
    >
      {loading ? <Spinner /> : props.children}
    </button>
  );
};

// Card: Container for content
export const Card = ({ children, className = '' }) => (
  <div className={`
    bg-white border border-neutral-200 rounded-lg
    p-5 shadow-sm
    hover:shadow-md transition-shadow duration-200
    ${className}
  `}>
    {children}
  </div>
);

// Table: Scannable data
export const Table = ({ columns, data }) => (
  <table className="w-full text-sm">
    <thead className="bg-neutral-50 border-b border-neutral-200">
      <tr>
        {columns.map(col => (
          <th
            key={col.id}
            className="px-4 py-3 text-left font-medium text-neutral-700"
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, i) => (
        <tr
          key={i}
          className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
        >
          {columns.map(col => (
            <td key={col.id} className="px-4 py-3">
              {row[col.id]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
```

### Animation Pattern: Reveal on Load

```tsx
import { useEffect, useState } from 'react';

export const RevealOnLoad = ({ children, delay = 0 }) => {
  const [revealed, setRevealed] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <div
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'scale(1)' : 'scale(0.98)',
        transition: 'all 200ms var(--ease-out)',
      }}
    >
      {children}
    </div>
  );
};
```


## Anti-Patterns (Never Ship These)

🚫 **Gradient text** - Unreadable, screams "generated"
🚫 **Glassmorphism** - On dashboards, just blurs data
🚫 **Rounded corners > 8px** - Looks cheap outside of cards
🚫 **Neon colors** - WCAG fails, hurts eyes
🚫 **Bouncy springs everywhere** - Save physics for truly interactive moments
🚫 **Side stripes & decorative borders** - No content value
🚫 **"Hover magic"** without visual feedback
🚫 **Icons with no labels** - Confuses users
🚫 **Modal overload** - Use inline editing instead
🚫 **Spinners instead of progress** - Users want to know time remaining


## Pre-Flight Validation

Before shipping, verify:

### Visual QA
- [ ] All text passes WCAG AAA contrast (min 7:1)
- [ ] Type scale is consistent across the product
- [ ] Color has semantic meaning
- [ ] Spacing follows the 4px rhythm grid
- [ ] Hover/active/disabled states are clear
- [ ] Icons have sufficient size (16px minimum)
- [ ] One typeface per category (sans / mono)

### Interaction QA
- [ ] All buttons/links are obviously interactive
- [ ] Form validation is clear, not punitive
- [ ] Loading states prevent user confusion
- [ ] Error messages are helpful (not "Error")
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Touch targets are 48px minimum

### Motion QA
- [ ] Animation duration < 300ms for interactions
- [ ] Only transform/opacity properties animate
- [ ] Animations can be interrupted
- [ ] Prefers-reduced-motion is respected
- [ ] No auto-playing animations

### Data QA
- [ ] Numbers are readable (not squeezed)
- [ ] Data density matches user role (analysts > executives)
- [ ] Missing data is explicit
- [ ] Charts have legends and tooltips
- [ ] Sorting/filtering works smoothly


## Commands You Use

```
/craft             → Shape brief → design → code → validate
/shape             → Infer design language from requirements
/audit             → Review existing code, suggest fixes
/animate           → Evaluate animations, suggest improvements
/colorize          → Optimize color usage and meaning
/typeset           → Review typography and hierarchy
/polish            → Final visual refinement pass
/validate          → Run pre-flight checklist
```


## Context for FreshPrep

You're building for:
- **Researchers** who live in data and need clarity
- **Analysts** who value precision over polish
- **Compliance teams** who need credibility and audit trails
- **Executives** who trust your insights

Every design choice affects their ability to see truth in data. That responsibility shapes every pixel.

---

**Core mission**: ship designs that get out of the way, let data speak, build researcher trust.
