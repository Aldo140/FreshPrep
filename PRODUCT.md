# FreshPrep Campaign Intelligence — Product Definition

**Version**: 2.0 | **Last Updated**: June 2026

## Product Mission

Give FreshPrep's marketing and growth teams a fast, accurate view of campaign code performance. No spreadsheet juggling. No manual lookups. Data that speaks for itself.

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

## Brand Voice

**Tone**: Precise, trustworthy, quietly ambitious.
- No exclamation points
- No emoji in UI copy
- No marketing speak
- No em-dashes (use period, comma, or colon instead)
- Instead: specific, honest, functional

**Example Copy**:
```
✅ "14 of 16 codes matched. 2 missing from database."
❌ "Your amazing analysis results!"

✅ "Upload a CSV or XLSX export."
❌ "Drop your data file here or click to browse your computer"

✅ "Analyze Codes"
❌ "Analyze Selected Codes"

✅ "All analysis runs client-side. No data leaves your browser."
❌ "Validated 100% Client-Side inside secure sandboxed event layers."
```

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
- No cream/beige/sand backgrounds (use #f8f7f5 warm off-white)

## Core Workflows

### 1. Daily Review (Compliance Analyst, 10 min)
1. Open FreshPrep → see summary of overnight changes
2. Click into any failing codes → see details
3. Export morning report → email stakeholders
4. ✓ Back to email within 10 minutes

### 2. Monthly Audit (Compliance Officer, 2 hours)
1. Filter by date range and channel
2. Scan all codes marked "passed" → confidence check
3. Drill into "failed" codes → understand root causes
4. Generate compliance certificate → download/print
5. Archive findings for audit trail

### 3. Data Pipeline (Data Scientist, async)
1. Set up scheduled export (FreshPrep API)
2. Ingest clean data into ML model
3. Monitor quality through FreshPrep dashboard
4. Alert on anomalies

## Design Principles

### 1. Clarity > Visual Complexity
- Text hierarchy guides users to the right information
- Color has meaning, not fashion
- Motion guides attention, never distracts

### 2. Purpose > Aesthetic
- Every pixel serves a function
- No decorative borders
- No "because it looks cool"
- Users should marvel at insights, not the UI

### 3. Trust > Delight
- Professional, confident design
- Honest error messages that guide recovery
- Accessibility is non-negotiable
- Researchers depend on this tool for high-stakes decisions

### 4. Performance > Perfection
- Fast loading > beautiful animations
- Researchers read data for 30+ min sessions
- Every interaction should feel responsive

## Key Features

### Dashboard
- **Summary Cards**: Key metrics at a glance (count passed, failed, pending)
- **Trend Chart**: 30-day rolling history of compliance status
- **Recent Activity**: Last 10 changes with timestamp, user, action
- **Quick Filters**: By channel, province, code status

### Code Detail View
- **Code overview**: Name, description, category
- **Status history**: Timeline of changes, who made them
- **Finding details**: If failed, show the specific issue
- **Notes**: Add context for why a code is passing/failing
- **Related codes**: Link to similar codes

### Bulk Operations
- **Export**: CSV, JSON, PDF (for reports)
- **Filter & search**: Find codes by pattern or status
- **Batch actions**: Mark multiple as reviewed, export set

### Settings & Admin
- **User management**: Add/remove team members, set permissions
- **Integration settings**: API keys, webhook URLs
- **Notification preferences**: What alerts to receive, when
- **Audit log**: Every action tracked for compliance

## Data Integrity

### Numbers Are Sacred
- Never round display numbers if it changes meaning
- Show precision where it matters
- Missing data is explicit ("—" or "No data for this period")
- Null/undefined states are handled gracefully

### Fields That Matter
- **Compliance Code**: Unique identifier
- **Status**: Passed, Failed, Pending Review
- **Last Checked**: Timestamp of validation
- **Checker**: Who ran the validation
- **Findings**: What passed/failed and why
- **Channel**: Which data source
- **Province**: Geographic location (if applicable)

## Responsive Design

### Mobile (< 640px)
- Single column layout
- Stacked cards
- Large touch targets (48px minimum)
- Horizontal scroll for tables (not ideal, but necessary)

### Tablet (640px - 1024px)
- Two-column layout where possible
- Collapsible panels for secondary data
- Tables become card-based if better

### Desktop (> 1024px)
- Full dashboard with charts, tables, summaries
- Multiple panels side-by-side
- Hover interactions available

## Accessibility (WCAG AAA)

### Must-Have
- ✅ Contrast ratio 7:1+ for all text
- ✅ Focus indicators visible on all interactive elements
- ✅ Keyboard navigation works fully
- ✅ Screen reader compatible
- ✅ Color is never the only indicator of status

### Animation
- ✅ Respects `prefers-reduced-motion`
- ✅ No flashing content
- ✅ Loading indicators show progress

## Performance Targets

- Page load: < 2 seconds (with data)
- Interaction response: < 100ms
- Animation frame rate: 60fps (or graceful degradation)
- Export processing: < 30 seconds (for large datasets)

## Security & Compliance

- HTTPS only
- Authentication required (OAuth or API key)
- User audit log: every action tracked
- Data encryption in transit and at rest
- No data retention beyond 90 days (unless archived)
- GDPR/SOC2 ready

## Success Metrics

- **Adoption**: % of target users actively using within 6 months
- **Speed**: Average time to complete a daily review (target: < 10 min)
- **Trust**: NPS score from compliance teams
- **Quality**: Zero undetected compliance issues after release
- **Efficiency**: Reduction in manual review time

## Design System Reference

This product uses the **FreshPrep Design System**:
- **Colors**: OKLCH-based semantic palette (blue, success, warning, error)
- **Typography**: Geist Sans + Geist Mono, type scale lg/sm
- **Spacing**: 4px rhythm grid (8, 12, 16, 24, 32px)
- **Motion**: Easing-based, physics-informed, < 300ms
- **Components**: Button, Card, Table, Badge, Input, Alert

See `DESIGN.md` for complete specifications.

## AI Agent Context

When building FreshPrep features, remember:
1. **Users are researchers** → clarity matters more than creativity
2. **Compliance is serious** → no cute copy or distracting animations
3. **They read for 30+ minutes** → spacing and hierarchy are critical
4. **They trust data** → every number displayed exactly as stored
5. **They need speed** → loading states that calm, not frustrate

Every design choice should answer: "Does this help the researcher understand compliance better?"

---

**This document is loaded before every design decision.** Every feature, every UI element, every animation should trace back to this product definition.
