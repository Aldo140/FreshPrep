# FreshPrep — Industry-Grade Refactor Design

**Date:** 2026-06-02
**Scope:** Architecture split, documentation update, code quality hardening
**Approach:** Progressive refactor — custom hooks + feature components, no new dependencies

---

## 1. Architecture

### Problem

`src/App.tsx` is ~2,000 lines containing state management, business logic, file parsing orchestration, and all rendering. This makes the file impossible to hold in context, hard to test, and slow to navigate.

### Solution

Extract along three natural seams — file upload, analysis, reporting — into custom hooks and feature components. No new libraries. No routing changes. No behavior changes.

### New Folder Structure

```
src/
├── hooks/
│   ├── useFileUpload.ts          drag-drop, parsing, validation, dbRows state
│   ├── useAnalysis.ts            flow mode, input codes, report results
│   ├── useReport.ts              active tab, page, print preview, export fns
│   └── useCodeFormatting.ts      clean/strip/uppercase/sort text utilities
│
├── features/
│   ├── upload/
│   │   └── UploadFlow.tsx        drag-drop zone + file validation display
│   ├── wizard/
│   │   └── WizardFlow.tsx        mode selection + code input step
│   └── report/
│       ├── ReportDashboard.tsx   tab nav + page orchestration
│       └── tabs/
│           ├── OverviewTab.tsx
│           ├── PerformanceTab.tsx
│           ├── RevenueTab.tsx
│           ├── RegionalTab.tsx
│           ├── DataTab.tsx
│           └── IssuesTab.tsx
│
├── components/                   unchanged
├── utils/                        unchanged
├── types.ts                      unchanged
├── App.tsx                       ~100 lines — hook composition only
├── main.tsx                      unchanged
└── index.css                     unchanged
```

### Hook Contracts

Each hook returns a typed `{ state, actions }` object — never a tuple.

**`useFileUpload`**
```ts
interface FileUploadState {
  dbRows: DiscountCodeData[];
  fileName: string | null;
  fileValidation: FileValidation | null;
  isDragging: boolean;
}
interface FileUploadActions {
  handleFile: (file: File) => Promise<void>;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
  reset: () => void;
}
```

**`useAnalysis`**
```ts
interface AnalysisState {
  selectedFlow: 'paste' | 'all' | 'compare';
  inputText: string;
  compareSearch: string;
  selectedCompareCodes: string[];
  reportResults: ReportResults | null;
}
interface AnalysisActions {
  setSelectedFlow: (flow: AnalysisState['selectedFlow']) => void;
  setInputText: (text: string) => void;
  setCompareSearch: (q: string) => void;
  toggleCompareCode: (code: string) => void;
  runAnalysis: () => void;
}
```

**`useReport`**
```ts
interface ReportState {
  activeTab: ReportTab;
  reportPage: number;
  isPrintPreview: boolean;
}
interface ReportActions {
  setActiveTab: (tab: ReportTab) => void;
  setReportPage: (page: number) => void;
  togglePrintPreview: () => void;
  exportExcel: () => void;
  exportCsv: () => void;
  exportPdf: () => void;
}
```

**`useCodeFormatting`**
```ts
interface CodeFormattingActions {
  cleanEmptyLines: (text: string) => string;
  stripComments: (text: string) => string;
  toUppercase: (text: string) => string;
  sortAlphabetically: (text: string) => string;
}
```

### Simplified App.tsx

After the split, `App.tsx` becomes a pure orchestrator:

```tsx
export default function App() {
  const fileUpload = useFileUpload();
  const formatting = useCodeFormatting();
  const analysis = useAnalysis(fileUpload.state.dbRows);
  const report = useReport(analysis.state.reportResults);

  if (!fileUpload.state.dbRows.length) {
    return <UploadFlow {...fileUpload} />;
  }
  if (!analysis.state.reportResults) {
    return <WizardFlow {...fileUpload.state} {...analysis} formatting={formatting} />;
  }
  return <ReportDashboard {...report} results={analysis.state.reportResults} />;
}
```

---

## 2. Documentation

### README Updates

Replace the current bullet-list stack section with a proper tech stack table:

| Layer        | Technology              | Version  |
|--------------|-------------------------|----------|
| Framework    | React                   | 19.0.1   |
| Language     | TypeScript              | 5.8.2    |
| Build        | Vite                    | 6.2.3    |
| Styling      | Tailwind CSS            | 4.1.14   |
| Animation    | Motion                  | 12.23.24 |
| Icons        | Lucide React            | 0.546.0  |
| Spreadsheets | xlsx                    | 0.18.5   |
| Fonts        | DM Sans / Serif / Mono  | Google   |
| Deployment   | GitHub Actions + Pages  | —        |

Add an **Architecture** section showing the three-layer flow:

```
Upload → Wizard → Report
  ↓         ↓        ↓
useFileUpload  useAnalysis  useReport
```

Add a **Developer Guide** section covering:
- Folder map (one sentence per folder)
- How to add a new report tab (3 steps: create tab component, add to `ReportDashboard`, add to `ReportTab` type)
- How to run, build, lint

### JSDoc Targets

Add JSDoc only to public functions in `utils/` — components are self-documenting via props:

- `fileParser.ts` — `parseFile`, `generateReport`, `exportToExcel`, `exportToCsv`
- `fuzzy.ts` — document the matching algorithm, the similarity threshold, and what the return value represents

---

## 3. Code Quality

### TypeScript Strictness

- Verify `strict: true` is set in `tsconfig.json`
- Eliminate all `any` types — replace with proper types or `unknown` + type guard
- Add explicit return types to all exported functions in `src/utils/`
- Add explicit return types to all hooks

### Consistent Patterns

- All components use **named exports** (no default exports except `App.tsx`)
- All hooks return a typed `{ state, actions }` object, never a tuple or flat object
- No inline styles anywhere — Tailwind classes only
- No hardcoded color strings outside of `designTokens` in `DesignSystem.tsx`

### Error Boundary

Add `src/components/ErrorBoundary.tsx` — a React class component error boundary wrapping the `ReportDashboard`. Catches parse errors or rendering crashes and shows a calm, branded fallback message instead of a blank screen.

```tsx
// Fallback UI uses design tokens — FreshPrep green, DM Sans, no panic language
// Message: "Something went wrong loading this report. Try re-uploading your file."
// Action: "Start over" button that calls reset()
```

---

## Implementation Order

1. **Hooks** — extract `useFileUpload`, `useAnalysis`, `useReport`, `useCodeFormatting` from App.tsx
2. **Feature components** — create `UploadFlow`, `WizardFlow`, `ReportDashboard`, tab components
3. **Simplify App.tsx** — compose hooks + features, verify app still works end-to-end
4. **ErrorBoundary** — add around `ReportDashboard`
5. **TypeScript audit** — strict mode, eliminate `any`, add return types
6. **Patterns cleanup** — named exports, no inline styles
7. **JSDoc** — fileParser.ts and fuzzy.ts
8. **README** — tech stack table, architecture section, developer guide

---

## Out of Scope

- No new libraries or dependencies
- No routing changes (React Router not added)
- No dark mode toggle implementation
- No test suite (separate future initiative)
- No virtualization or pagination (separate performance initiative)
- No backend or API integration
