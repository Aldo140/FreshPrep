# FreshPrep — Industry-Grade Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `App.tsx` (1,543 lines) into custom hooks + feature components, update README with a tech stack table and developer guide, add JSDoc to utils, and harden TypeScript.

**Architecture:** Extract state into four custom hooks (`useCodeFormatting`, `useFileUpload`, `useAnalysis`, `useReport`) composed in `App.tsx`. Move JSX into feature components under `src/features/` — `UploadFlow`, `WizardFlow`, `ReportDashboard`, six tab components, and `PrintPreview`. `App.tsx` becomes a ~100-line composition shell.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Lucide React, xlsx

---

## File Map

**Create:**
- `src/hooks/useCodeFormatting.ts`
- `src/hooks/useFileUpload.ts`
- `src/hooks/useAnalysis.ts`
- `src/hooks/useReport.ts`
- `src/features/upload/UploadFlow.tsx`
- `src/features/wizard/WizardFlow.tsx`
- `src/features/report/ReportDashboard.tsx`
- `src/features/report/tabs/OverviewTab.tsx`
- `src/features/report/tabs/PerformanceTab.tsx`
- `src/features/report/tabs/RevenueTab.tsx`
- `src/features/report/tabs/RegionalTab.tsx`
- `src/features/report/tabs/DataTab.tsx`
- `src/features/report/tabs/IssuesTab.tsx`
- `src/features/report/PrintPreview.tsx`
- `src/components/ErrorBoundary.tsx`

**Modify:**
- `src/types.ts` — add `ReportPage`, `AnalysisFlow`, `ActiveTab` types
- `src/App.tsx` — simplify to ~100-line composition shell
- `src/utils/fileParser.ts` — add JSDoc, fix `any` types
- `src/utils/fuzzy.ts` — add JSDoc to remaining exports
- `tsconfig.json` — add `"strict": true`
- `README.md` — tech stack table, architecture section, developer guide

---

## Task 1: Add shared types to types.ts

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add three type aliases after the last export in `src/types.ts`**

```ts
export type ReportPage = "overview" | "performance" | "revenue" | "regional" | "data" | "issues";

export type AnalysisFlow = "paste" | "all" | "compare";

export type ActiveTab = "report" | "explorer";
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add ReportPage, AnalysisFlow, ActiveTab types"
```

---

## Task 2: Extract useCodeFormatting hook

**Files:**
- Create: `src/hooks/useCodeFormatting.ts`

Source: `src/App.tsx` lines 80–115 (the five `handleFormat*` functions). These are pure text transformations with no external state dependencies — the simplest extraction.

- [ ] **Step 1: Create `src/hooks/useCodeFormatting.ts`**

```ts
import { useCallback } from "react";

export interface CodeFormattingActions {
  cleanEmptyLines: (text: string) => string;
  stripComments: (text: string) => string;
  toUppercase: (text: string) => string;
  sortAlphabetically: (text: string) => string;
  eraseLinesContaining: (text: string, keyword: string) => string;
}

export function useCodeFormatting(): CodeFormattingActions {
  const cleanEmptyLines = useCallback((text: string): string =>
    text.split("\n").filter(line => line.trim().length > 0).join("\n"), []);

  const stripComments = useCallback((text: string): string =>
    text.split("\n").filter(line => {
      const t = line.trim();
      return !t.startsWith("#") && !t.startsWith("//") && !t.startsWith("--") && !t.startsWith("/*");
    }).join("\n"), []);

  const toUppercase = useCallback((text: string): string => text.toUpperCase(), []);

  const sortAlphabetically = useCallback((text: string): string =>
    text.split("\n").filter(l => l.trim().length > 0).sort((a, b) => a.localeCompare(b)).join("\n"), []);

  const eraseLinesContaining = useCallback((text: string, keyword: string): string => {
    if (!keyword.trim()) return text;
    const query = keyword.trim().toUpperCase();
    return text.split("\n").filter(line => !line.toUpperCase().includes(query)).join("\n");
  }, []);

  return { cleanEmptyLines, stripComments, toUppercase, sortAlphabetically, eraseLinesContaining };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCodeFormatting.ts
git commit -m "feat: extract useCodeFormatting hook"
```

---

## Task 3: Extract useFileUpload hook

**Files:**
- Create: `src/hooks/useFileUpload.ts`

Source: `src/App.tsx` lines 59–62 (file state), 118–119 (drag state), 122–127 (`uniqueDbCodes`), 158–199 (file handlers), 242–252 (reset fields).

- [ ] **Step 1: Create `src/hooks/useFileUpload.ts`**

```ts
import { useState, useRef, useMemo, useCallback, RefObject } from "react";
import { DiscountCodeData } from "../types";
import { parseSpreadsheetFile, FileValidationResult } from "../utils/fileParser";

export interface FileUploadState {
  dbRows: DiscountCodeData[];
  fileName: string | null;
  fileValidation: FileValidationResult | null;
  isDragOver: boolean;
  uniqueDbCodes: string[];
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export interface FileUploadActions {
  processUploadedFile: (file: File) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  triggerBrowsingInput: () => void;
  reset: () => void;
}

export function useFileUpload(): { state: FileUploadState; actions: FileUploadActions } {
  const [dbRows, setDbRows] = useState<DiscountCodeData[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileValidation, setFileValidation] = useState<FileValidationResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueDbCodes = useMemo(() =>
    dbRows.length === 0
      ? []
      : Array.from(new Set(dbRows.map(r => r.discount_code.trim().toUpperCase()))).filter(Boolean).sort(),
    [dbRows]
  );

  const processUploadedFile = useCallback(async (file: File): Promise<void> => {
    try {
      const result = await parseSpreadsheetFile(file);
      setDbRows(result.dbRows);
      setFileValidation(result.validation);
      setFileName(file.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verify document format (XLSX, XLS, CSV, TSV) and retry.";
      alert(`Error reading file: ${msg}`);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((): void => setIsDragOver(false), []);

  const handleDrop = useCallback(async (e: React.DragEvent): Promise<void> => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processUploadedFile(file);
  }, [processUploadedFile]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (file) await processUploadedFile(file);
  }, [processUploadedFile]);

  const triggerBrowsingInput = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const reset = useCallback((): void => {
    setDbRows([]);
    setFileName(null);
    setFileValidation(null);
  }, []);

  return {
    state: { dbRows, fileName, fileValidation, isDragOver, uniqueDbCodes, fileInputRef },
    actions: { processUploadedFile, handleDragOver, handleDragLeave, handleDrop, handleFileChange, triggerBrowsingInput, reset },
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFileUpload.ts
git commit -m "feat: extract useFileUpload hook"
```

---

## Task 4: Extract useAnalysis hook

**Files:**
- Create: `src/hooks/useAnalysis.ts`

Source: `src/App.tsx` lines 64–68 (reporting state), 71–78 (flow inputs), 130–156 (derived state), 202–289 (compile + reset handlers).

- [ ] **Step 1: Create `src/hooks/useAnalysis.ts`**

```ts
import { useState, useMemo, useCallback } from "react";
import { DiscountCodeData, AnalysisFlow } from "../types";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../types";
import { generateAnalysisReport, parsePastedCodes } from "../utils/fileParser";

export interface AnalysisReportResults {
  foundReports: AnalyzedCodeReport[];
  missingCodes: string[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
}

export interface PortfolioHealth {
  total: number;
  strong: number;
  average: number;
  weak: number;
}

export interface AnalysisState {
  selectedFlow: AnalysisFlow;
  inputText: string;
  compareSearch: string;
  selectedCompareCodes: string[];
  eraseKeyword: string;
  rawPastedCodes: string[];
  isAnalyzing: boolean;
  hasReportGenerated: boolean;
  filteredCompareCodes: string[];
  normalizedPastedCodes: string[];
  reportResults: AnalysisReportResults;
  portfolioHealth: PortfolioHealth | null;
  uniqueChannels: string[];
}

export interface AnalysisActions {
  setSelectedFlow: (flow: AnalysisFlow) => void;
  setInputText: (text: string) => void;
  setCompareSearch: (query: string) => void;
  setEraseKeyword: (keyword: string) => void;
  toggleCompareCode: (code: string) => void;
  selectAllCompareCodes: (codes: string[]) => void;
  clearCompareCodes: () => void;
  compileSpecificCodes: () => void;
  compilePortfolio: (allCodes: string[]) => void;
  compileComparison: () => void;
  applyCorrections: (corrections: Record<string, string>) => void;
  reset: () => void;
}

export function useAnalysis(
  dbRows: DiscountCodeData[],
  uniqueDbCodes: string[]
): { state: AnalysisState; actions: AnalysisActions } {
  const [selectedFlow, setSelectedFlow] = useState<AnalysisFlow>("paste");
  const [inputText, setInputText] = useState("");
  const [compareSearch, setCompareSearch] = useState("");
  const [selectedCompareCodes, setSelectedCompareCodes] = useState<string[]>([]);
  const [eraseKeyword, setEraseKeyword] = useState("");
  const [rawPastedCodes, setRawPastedCodes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasReportGenerated, setHasReportGenerated] = useState(false);

  const filteredCompareCodes = useMemo(() => {
    const query = compareSearch.trim().toUpperCase();
    if (!query) return uniqueDbCodes.slice(0, 80);
    return uniqueDbCodes.filter(c => c.includes(query));
  }, [uniqueDbCodes, compareSearch]);

  const normalizedPastedCodes = useMemo(() => parsePastedCodes(inputText), [inputText]);

  const reportResults = useMemo(
    (): AnalysisReportResults => generateAnalysisReport(dbRows, rawPastedCodes),
    [dbRows, rawPastedCodes]
  );

  const portfolioHealth = useMemo((): PortfolioHealth | null => {
    if (!hasReportGenerated || reportResults.foundReports.length === 0) return null;
    const total = reportResults.foundReports.length;
    const strong = reportResults.foundReports.filter(r => r.calculatedConversion >= 40).length;
    const average = reportResults.foundReports.filter(r => r.calculatedConversion >= 20 && r.calculatedConversion < 40).length;
    const weak = reportResults.foundReports.filter(r => r.calculatedConversion < 20).length;
    return { total, strong, average, weak };
  }, [reportResults.foundReports, hasReportGenerated]);

  const uniqueChannels = useMemo(() =>
    Array.from(new Set(reportResults.foundReports.map(r => r.channel)))
      .filter((c): c is string => typeof c === "string" && c.length > 0)
      .sort(),
    [reportResults.foundReports]
  );

  const runWithLoading = useCallback((codes: string[]): void => {
    setIsAnalyzing(true);
    setRawPastedCodes(codes);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasReportGenerated(true);
    }, 450);
  }, []);

  const compileSpecificCodes = useCallback((): void => {
    if (normalizedPastedCodes.length === 0) {
      alert("Please enter or paste at least one discount code to analyze.");
      return;
    }
    runWithLoading(normalizedPastedCodes);
  }, [normalizedPastedCodes, runWithLoading]);

  const compilePortfolio = useCallback((allCodes: string[]): void => {
    if (allCodes.length === 0) return;
    runWithLoading(allCodes);
  }, [runWithLoading]);

  const compileComparison = useCallback((): void => {
    if (selectedCompareCodes.length < 2) {
      alert("Please select at least 2 distinct promo codes to compare side-by-side.");
      return;
    }
    runWithLoading(selectedCompareCodes);
  }, [selectedCompareCodes, runWithLoading]);

  const toggleCompareCode = useCallback((code: string): void => {
    setSelectedCompareCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const applyCorrections = useCallback((corrections: Record<string, string>): void => {
    const newCodes = rawPastedCodes.map(code => corrections[code] !== undefined ? corrections[code] : code);
    const unique = Array.from(new Set(newCodes));
    setRawPastedCodes(unique);
    setInputText(unique.join("\n"));
  }, [rawPastedCodes]);

  const reset = useCallback((): void => {
    setHasReportGenerated(false);
    setRawPastedCodes([]);
    setInputText("");
    setSelectedCompareCodes([]);
    setCompareSearch("");
    setSelectedFlow("paste");
  }, []);

  return {
    state: {
      selectedFlow, inputText, compareSearch, selectedCompareCodes, eraseKeyword,
      rawPastedCodes, isAnalyzing, hasReportGenerated,
      filteredCompareCodes, normalizedPastedCodes, reportResults,
      portfolioHealth, uniqueChannels,
    },
    actions: {
      setSelectedFlow, setInputText, setCompareSearch, setEraseKeyword,
      toggleCompareCode,
      selectAllCompareCodes: setSelectedCompareCodes,
      clearCompareCodes: () => setSelectedCompareCodes([]),
      compileSpecificCodes, compilePortfolio, compileComparison,
      applyCorrections, reset,
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAnalysis.ts
git commit -m "feat: extract useAnalysis hook"
```

---

## Task 5: Extract useReport hook

**Files:**
- Create: `src/hooks/useReport.ts`

Source: `src/App.tsx` lines 64–66 (`activeTab`, `isPrintPreview`), 68 (`reportPage`), 271–279 (export handlers).

- [ ] **Step 1: Create `src/hooks/useReport.ts`**

```ts
import { useState, useCallback } from "react";
import { ReportPage, ActiveTab } from "../types";
import { AnalyzedCodeReport, KPIReportSummary } from "../types";
import { exportToExcelFile, exportToCSVFile } from "../utils/fileParser";

interface UseReportParams {
  foundReports: AnalyzedCodeReport[];
  missingCodes: string[];
  summary: KPIReportSummary;
  hasReportGenerated: boolean;
}

export interface ReportState {
  activeTab: ActiveTab;
  isPrintPreview: boolean;
  reportPage: ReportPage;
}

export interface ReportActions {
  setActiveTab: (tab: ActiveTab) => void;
  setIsPrintPreview: (value: boolean) => void;
  setReportPage: (page: ReportPage) => void;
  exportExcel: () => void;
  exportCsv: () => void;
  reset: () => void;
}

export function useReport(params: UseReportParams): { state: ReportState; actions: ReportActions } {
  const [activeTab, setActiveTab] = useState<ActiveTab>("report");
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [reportPage, setReportPage] = useState<ReportPage>("overview");

  const exportExcel = useCallback((): void => {
    if (!params.hasReportGenerated || params.foundReports.length === 0) return;
    exportToExcelFile(params.summary, params.foundReports, params.missingCodes);
  }, [params]);

  const exportCsv = useCallback((): void => {
    if (!params.hasReportGenerated || params.foundReports.length === 0) return;
    exportToCSVFile(params.foundReports);
  }, [params]);

  const reset = useCallback((): void => {
    setReportPage("overview");
    setIsPrintPreview(false);
    setActiveTab("report");
  }, []);

  return {
    state: { activeTab, isPrintPreview, reportPage },
    actions: { setActiveTab, setIsPrintPreview, setReportPage, exportExcel, exportCsv, reset },
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useReport.ts
git commit -m "feat: extract useReport hook"
```

---

## Task 6: Create UploadFlow feature component

**Files:**
- Create: `src/features/upload/UploadFlow.tsx`
- Modify: `src/App.tsx` (replace launch-screen JSX)

Source JSX: `src/App.tsx` lines 379–542 (the entire `id="launch-screen"` div, including the hidden file input at ~line 531).

- [ ] **Step 1: Create `src/features/upload/UploadFlow.tsx`**

```tsx
import React from "react";
import { FileUploadState, FileUploadActions } from "../../hooks/useFileUpload";

interface UploadFlowProps {
  state: FileUploadState;
  actions: FileUploadActions;
}

export function UploadFlow({ state, actions }: UploadFlowProps): React.ReactElement {
  const { isDragOver, fileValidation, fileName, fileInputRef } = state;
  const { handleDragOver, handleDragLeave, handleDrop, handleFileChange, triggerBrowsingInput } = actions;

  // MOVE the entire launch-screen div from App.tsx lines 379–542 into this return.
  // Replace every reference to a local variable or handler with the prop equivalents above.
  // The hidden <input ref={fileInputRef} ...> must be inside this component.
  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden" id="launch-screen">
      {/* Left brand panel — move from App.tsx ~lines 382–443 */}
      {/* Right upload panel — move from App.tsx ~lines 444–541 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: In `src/App.tsx`, replace the launch-screen branch with the component**

Add import at top:
```tsx
import { UploadFlow } from "./features/upload/UploadFlow";
```

Replace lines 379–542 (`dbRows.length === 0 ? ( ... ) :`) with:
```tsx
{dbRows.length === 0 ? (
  <UploadFlow state={fileUpload.state} actions={fileUpload.actions} />
) : (
```

Remove the hidden `<input ref={fileInputRef} ...>` from App.tsx — it now lives in `UploadFlow`.

- [ ] **Step 3: Run the app and verify the upload screen**

```bash
npm run dev
```

Open `http://localhost:3000/FreshPrep/`. Confirm:
- Left brand panel and right drop-zone render correctly
- Drag-over styling activates on file drag
- Clicking the drop-zone opens the file picker
- Uploading a valid CSV/XLSX proceeds to the wizard screen

- [ ] **Step 4: Commit**

```bash
git add src/features/upload/UploadFlow.tsx src/App.tsx
git commit -m "feat: extract UploadFlow feature component"
```

---

## Task 7: Create WizardFlow feature component

**Files:**
- Create: `src/features/wizard/WizardFlow.tsx`
- Modify: `src/App.tsx` (replace wizard branch JSX)

Source JSX: `src/App.tsx` lines 544–1017 (the `!hasReportGenerated` branch — wizard options, flow panels, file info header, validation card).

- [ ] **Step 1: Create `src/features/wizard/WizardFlow.tsx`**

```tsx
import React from "react";
import { FileUploadState } from "../../hooks/useFileUpload";
import { AnalysisState, AnalysisActions } from "../../hooks/useAnalysis";
import { CodeFormattingActions } from "../../hooks/useCodeFormatting";
import CodeInputBox from "../../components/CodeInputBox";
// Import all lucide icons used in the wizard JSX (BarChart3, Database, Scale, etc.)

interface WizardFlowProps {
  fileState: FileUploadState;
  analysis: { state: AnalysisState; actions: AnalysisActions };
  formatting: CodeFormattingActions;
  onReset: () => void;
}

export function WizardFlow({ fileState, analysis, formatting, onReset }: WizardFlowProps): React.ReactElement {
  const { state, actions } = analysis;

  // MOVE the wizard branch JSX from App.tsx lines 545–1017 into this return.
  // Replace every handler reference:
  //   handleCompileSpecificCodes  → actions.compileSpecificCodes()
  //   handleCompilePortfolio      → actions.compilePortfolio(fileState.uniqueDbCodes)
  //   handleCompileComparison     → actions.compileComparison()
  //   handleToggleCompareCode     → actions.toggleCompareCode(code)
  //   handleSelectAllCompare      → actions.selectAllCompareCodes(fileState.uniqueDbCodes)
  //   handleSelectNoneCompare     → actions.clearCompareCodes()
  //   handleFormatCleanEmpty      → setInputText(formatting.cleanEmptyLines(state.inputText))
  //   handleFormatStripComments   → setInputText(formatting.stripComments(state.inputText))
  //   handleFormatUppercase       → setInputText(formatting.toUppercase(state.inputText))
  //   handleFormatAlphaSort       → setInputText(formatting.sortAlphabetically(state.inputText))
  //   handleEraseLinesContaining  → setInputText(formatting.eraseLinesContaining(state.inputText, state.eraseKeyword))
  //   handleResetWorkspace        → onReset()
  return (
    <div>{/* wizard JSX */}</div>
  );
}
```

- [ ] **Step 2: In `src/App.tsx`, replace the wizard branch with the component**

Add import:
```tsx
import { WizardFlow } from "./features/wizard/WizardFlow";
```

Replace lines 544–1017 with:
```tsx
) : !hasReportGenerated ? (
  <WizardFlow
    fileState={fileUpload.state}
    analysis={analysis}
    formatting={formatting}
    onReset={handleResetWorkspace}
  />
) : (
```

- [ ] **Step 3: Run the app and verify all wizard flows**

```bash
npm run dev
```

Upload a CSV, then verify:
- All three mode cards (Paste, Full Dataset, Compare) are clickable and switch the active panel
- Paste mode: enter codes → "Analyze Specific Codes" button compiles a report
- Full Dataset mode: "Analyze All Codes" button compiles a report
- Compare mode: checkbox list, select 2+ codes → compile
- Formatting buttons (clean, strip, uppercase, sort, erase) work correctly
- "New Dataset" reset returns to upload screen

- [ ] **Step 4: Commit**

```bash
git add src/features/wizard/WizardFlow.tsx src/App.tsx
git commit -m "feat: extract WizardFlow feature component"
```

---

## Task 8: Create report tab components

**Files:**
- Create: `src/features/report/tabs/OverviewTab.tsx`
- Create: `src/features/report/tabs/PerformanceTab.tsx`
- Create: `src/features/report/tabs/RevenueTab.tsx`
- Create: `src/features/report/tabs/RegionalTab.tsx`
- Create: `src/features/report/tabs/DataTab.tsx`
- Create: `src/features/report/tabs/IssuesTab.tsx`

Source: `src/App.tsx` — each `reportPage === 'X'` block:
- `overview`: lines 1063–1205
- `performance`: lines 1194–1206
- `revenue`: lines 1208–1242
- `regional`: lines 1244–1255
- `data`: lines 1257–1277
- `issues`: lines 1279–1315

- [ ] **Step 1: Create `OverviewTab.tsx`**

```tsx
import React from "react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import { PortfolioHealth } from "../../../hooks/useAnalysis";
import DashboardMetrics from "../../../components/DashboardMetrics";
import PerformanceChart from "../../../components/PerformanceChart";
import PortfolioSummaryWidget from "../../../components/PortfolioSummaryWidget";
import { MetricTooltip } from "../../../components/DesignSystem";

interface OverviewTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
  fileName: string | null;
  dbRowCount: number;
  portfolioHealth: PortfolioHealth | null;
}

export function OverviewTab({ foundReports, summary, channelSummary, fileName, dbRowCount, portfolioHealth }: OverviewTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* MOVE the reportPage === 'overview' JSX from App.tsx lines 1063–1205 here */}
    </div>
  );
}
```

- [ ] **Step 2: Create `PerformanceTab.tsx`**

```tsx
import React from "react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import DashboardMetrics from "../../../components/DashboardMetrics";
import PerformanceChart from "../../../components/PerformanceChart";
import PortfolioSummaryWidget from "../../../components/PortfolioSummaryWidget";

interface PerformanceTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
}

export function PerformanceTab({ foundReports, summary, channelSummary }: PerformanceTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* MOVE the reportPage === 'performance' JSX from App.tsx lines 1194–1206 here */}
    </div>
  );
}
```

- [ ] **Step 3: Create `RevenueTab.tsx`**

```tsx
import React from "react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import PortfolioSummaryWidget from "../../../components/PortfolioSummaryWidget";

interface RevenueTabProps {
  summary: KPIReportSummary;
  foundReports: AnalyzedCodeReport[];
  channelSummary: ChannelSummary[];
}

export function RevenueTab({ summary, foundReports, channelSummary }: RevenueTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* MOVE the reportPage === 'revenue' JSX from App.tsx lines 1208–1242 here */}
    </div>
  );
}
```

- [ ] **Step 4: Create `RegionalTab.tsx`**

```tsx
import React from "react";
import { DiscountCodeData, AnalyzedCodeReport } from "../../../types";
import ProvinceIntelligence from "../../../components/ProvinceIntelligence";

interface RegionalTabProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
}

export function RegionalTab({ dbRows, foundReports }: RegionalTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* MOVE the reportPage === 'regional' JSX from App.tsx lines 1244–1255 here */}
    </div>
  );
}
```

- [ ] **Step 5: Create `DataTab.tsx`**

```tsx
import React from "react";
import { DiscountCodeData, AnalyzedCodeReport } from "../../../types";
import DetailedTable from "../../../components/DetailedTable";
import DataExplorer from "../../../components/DataExplorer";

interface DataTabProps {
  foundReports: AnalyzedCodeReport[];
  uniqueChannels: string[];
  dbRows: DiscountCodeData[];
  fileName: string | null;
  onSwitchToExplorer: () => void;
}

export function DataTab({ foundReports, uniqueChannels, dbRows, fileName, onSwitchToExplorer }: DataTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* MOVE the reportPage === 'data' JSX from App.tsx lines 1257–1277 here */}
      {/* Replace setActiveTab2("explorer") with onSwitchToExplorer() */}
    </div>
  );
}
```

- [ ] **Step 6: Create `IssuesTab.tsx`**

```tsx
import React from "react";
import { AnalyzedCodeReport } from "../../../types";
import MissingCodesSection from "../../../components/MissingCodesSection";
import { CheckCircle2 } from "lucide-react";

interface IssuesTabProps {
  missingCodes: string[];
  uniqueDbCodes: string[];
  rawPastedCodes: string[];
  foundReports: AnalyzedCodeReport[];
  onApplyCorrections: (corrections: Record<string, string>) => void;
}

export function IssuesTab({ missingCodes, uniqueDbCodes, rawPastedCodes, foundReports, onApplyCorrections }: IssuesTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* MOVE the reportPage === 'issues' JSX from App.tsx lines 1279–1315 here */}
    </div>
  );
}
```

- [ ] **Step 7: Verify TypeScript for all six tab files**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/report/tabs/
git commit -m "feat: extract report tab components (Overview, Performance, Revenue, Regional, Data, Issues)"
```

---

## Task 9: Create ReportDashboard and PrintPreview

**Files:**
- Create: `src/features/report/ReportDashboard.tsx`
- Create: `src/features/report/PrintPreview.tsx`

Source: Tab nav bar at `src/App.tsx` lines 1018–1053. Print preview block at lines 1330–1543.

- [ ] **Step 1: Create `src/features/report/ReportDashboard.tsx`**

```tsx
import React from "react";
import { ReportPage, ActiveTab, AnalyzedCodeReport, KPIReportSummary, ChannelSummary, DiscountCodeData } from "../../types";
import { PortfolioHealth } from "../../hooks/useAnalysis";
import { RefreshCw } from "lucide-react";
import { OverviewTab } from "./tabs/OverviewTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { RegionalTab } from "./tabs/RegionalTab";
import { DataTab } from "./tabs/DataTab";
import { IssuesTab } from "./tabs/IssuesTab";

interface ReportDashboardProps {
  reportPage: ReportPage;
  setReportPage: (page: ReportPage) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
  dbRows: DiscountCodeData[];
  fileName: string | null;
  uniqueDbCodes: string[];
  rawPastedCodes: string[];
  missingCodes: string[];
  uniqueChannels: string[];
  portfolioHealth: PortfolioHealth | null;
  onApplyCorrections: (corrections: Record<string, string>) => void;
  onReset: () => void;
}

export function ReportDashboard(props: ReportDashboardProps): React.ReactElement {
  const { reportPage, setReportPage, foundReports, summary, channelSummary } = props;

  const pages: { id: ReportPage; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "revenue", label: "Revenue" },
    { id: "regional", label: "Regional" },
    { id: "data", label: "Data" },
    { id: "issues", label: `Issues${props.missingCodes.length > 0 ? ` (${props.missingCodes.length})` : ""}` },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* MOVE the tab nav bar from App.tsx lines 1018–1053 here */}
      {/* Replace the inline pages array with the one above */}

      <div
        key={reportPage}
        className="flex-1 overflow-y-auto bg-[#f8f7f5]"
        style={{ animation: "fadeIn 180ms var(--ease-out)" }}
      >
        {reportPage === "overview" && (
          <OverviewTab
            foundReports={foundReports}
            summary={summary}
            channelSummary={channelSummary}
            fileName={props.fileName}
            dbRowCount={props.dbRows.length}
            portfolioHealth={props.portfolioHealth}
          />
        )}
        {reportPage === "performance" && (
          <PerformanceTab foundReports={foundReports} summary={summary} channelSummary={channelSummary} />
        )}
        {reportPage === "revenue" && (
          <RevenueTab summary={summary} foundReports={foundReports} channelSummary={channelSummary} />
        )}
        {reportPage === "regional" && (
          <RegionalTab dbRows={props.dbRows} foundReports={foundReports} />
        )}
        {reportPage === "data" && (
          <DataTab
            foundReports={foundReports}
            uniqueChannels={props.uniqueChannels}
            dbRows={props.dbRows}
            fileName={props.fileName}
            onSwitchToExplorer={() => props.setActiveTab("explorer")}
          />
        )}
        {reportPage === "issues" && (
          <IssuesTab
            missingCodes={props.missingCodes}
            uniqueDbCodes={props.uniqueDbCodes}
            rawPastedCodes={props.rawPastedCodes}
            foundReports={foundReports}
            onApplyCorrections={props.onApplyCorrections}
          />
        )}

        <footer
          id="saas-footer"
          className="text-[10px] text-[#a1a1a1] font-mono py-4 border-t border-[#e5e5e5] mt-auto flex items-center justify-between px-6 max-w-6xl mx-auto w-full"
        >
          <span>FreshPrep Campaign Intelligence · {new Date().getFullYear()}</span>
          <span>All analysis runs client-side. No data leaves your browser.</span>
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/features/report/PrintPreview.tsx`**

```tsx
import React from "react";
import { AnalyzedCodeReport, KPIReportSummary } from "../../types";

interface PrintPreviewProps {
  foundReports: AnalyzedCodeReport[];
  missingCodes: string[];
  summary: KPIReportSummary;
  fileName: string | null;
  isPrintPreview: boolean;
  onClose: () => void;
}

export function PrintPreview({ foundReports, missingCodes, summary, fileName, isPrintPreview, onClose }: PrintPreviewProps): React.ReactElement | null {
  if (foundReports.length === 0) return null;

  // MOVE the entire id="printable-pdf-executive-summary" block
  // from App.tsx lines 1330–1543 here.
  // Replace setIsPrintPreview(false) with onClose().
  return (
    <div
      id="printable-pdf-executive-summary"
      className={isPrintPreview
        ? "fixed inset-0 z-50 bg-slate-100 overflow-y-auto p-4 md:p-8 flex flex-col items-center animate-fade-in"
        : "hidden"
      }
    >
      {/* print content */}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/report/ReportDashboard.tsx src/features/report/PrintPreview.tsx
git commit -m "feat: extract ReportDashboard and PrintPreview components"
```

---

## Task 10: Simplify App.tsx to composition shell

**Files:**
- Modify: `src/App.tsx`

At this point all JSX branches have been extracted. Replace the entire `src/App.tsx` with the composition shell below.

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Upload, FileSpreadsheet, FileText, Download } from "lucide-react";
import { useFileUpload } from "./hooks/useFileUpload";
import { useAnalysis } from "./hooks/useAnalysis";
import { useReport } from "./hooks/useReport";
import { useCodeFormatting } from "./hooks/useCodeFormatting";
import { UploadFlow } from "./features/upload/UploadFlow";
import { WizardFlow } from "./features/wizard/WizardFlow";
import { ReportDashboard } from "./features/report/ReportDashboard";
import { PrintPreview } from "./features/report/PrintPreview";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App(): React.ReactElement {
  const fileUpload = useFileUpload();
  const formatting = useCodeFormatting();
  const analysis = useAnalysis(fileUpload.state.dbRows, fileUpload.state.uniqueDbCodes);
  const report = useReport({
    foundReports: analysis.state.reportResults.foundReports,
    missingCodes: analysis.state.reportResults.missingCodes,
    summary: analysis.state.reportResults.summary,
    hasReportGenerated: analysis.state.hasReportGenerated,
  });

  const { foundReports, missingCodes, summary, channelSummary } = analysis.state.reportResults;
  const { hasReportGenerated } = analysis.state;

  const handleResetWorkspace = (): void => {
    fileUpload.actions.reset();
    analysis.actions.reset();
    report.actions.reset();
  };

  return (
    <div
      id="saas-applet-root"
      className="flex flex-col h-screen w-full bg-[#f8f7f5] text-[#1a1a1a] overflow-hidden font-sans selection:bg-[#eef4f1] selection:text-[#2b5346]"
    >
      <header
        id="app-global-nav"
        className="h-14 bg-[#2b5346] flex items-center justify-between px-6 sm:px-8 shrink-0 z-40"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
            alt="FreshPrep"
            className="h-6 w-auto shrink-0"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <div className="hidden sm:block w-px h-4 bg-white/25 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xs font-medium text-white/80 tracking-widest uppercase font-mono leading-none">
              Campaign Intelligence
            </h1>
            {fileUpload.state.fileName && (
              <p className="text-xs text-white/50 font-mono leading-none mt-0.5 truncate max-w-[280px]">
                {fileUpload.state.fileName} · {fileUpload.state.dbRows.length.toLocaleString()} records
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fileUpload.state.dbRows.length > 0 && (
            <button
              onClick={handleResetWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
              style={{ transition: "background-color 150ms var(--ease-out)" }}
              title="Upload a different dataset"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">New Dataset</span>
            </button>
          )}
          {hasReportGenerated && foundReports.length > 0 && (
            <>
              <button
                onClick={report.actions.exportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-[#2b5346] hover:bg-white/90 cursor-pointer"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
              <button
                onClick={() => report.actions.setIsPrintPreview(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={report.actions.exportCsv}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>CSV</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0" id="analysis-main-viewport">
        {fileUpload.state.dbRows.length === 0 && (
          <UploadFlow state={fileUpload.state} actions={fileUpload.actions} />
        )}
        {fileUpload.state.dbRows.length > 0 && !hasReportGenerated && (
          <WizardFlow
            fileState={fileUpload.state}
            analysis={analysis}
            formatting={formatting}
            onReset={handleResetWorkspace}
          />
        )}
        {hasReportGenerated && foundReports.length > 0 && (
          <ErrorBoundary onReset={handleResetWorkspace}>
            <ReportDashboard
              reportPage={report.state.reportPage}
              setReportPage={report.actions.setReportPage}
              activeTab={report.state.activeTab}
              setActiveTab={report.actions.setActiveTab}
              foundReports={foundReports}
              summary={summary}
              channelSummary={channelSummary}
              dbRows={fileUpload.state.dbRows}
              fileName={fileUpload.state.fileName}
              uniqueDbCodes={fileUpload.state.uniqueDbCodes}
              rawPastedCodes={analysis.state.rawPastedCodes}
              missingCodes={missingCodes}
              uniqueChannels={analysis.state.uniqueChannels}
              portfolioHealth={analysis.state.portfolioHealth}
              onApplyCorrections={analysis.actions.applyCorrections}
              onReset={handleResetWorkspace}
            />
          </ErrorBoundary>
        )}
      </main>

      <PrintPreview
        foundReports={foundReports}
        missingCodes={missingCodes}
        summary={summary}
        fileName={fileUpload.state.fileName}
        isPrintPreview={report.state.isPrintPreview}
        onClose={() => report.actions.setIsPrintPreview(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run full end-to-end verification**

```bash
npm run dev
```

Walk through every flow:
1. Upload screen renders — drag-and-drop works, file picker works
2. Wizard: Paste mode → compile report
3. Wizard: Full Dataset mode → compile report
4. Wizard: Compare mode (select 2+ codes) → compile report
5. Report: all 6 pages (Overview, Performance, Revenue, Regional, Data, Issues) render
6. Export Excel, Export CSV, Print preview all work
7. "New Dataset" resets to upload screen

- [ ] **Step 3: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: simplify App.tsx to ~100-line composition shell"
```

---

## Task 11: Add ErrorBoundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`

(The import and usage in `App.tsx` is already included in Task 10's composition shell.)

- [ ] **Step 1: Create `src/components/ErrorBoundary.tsx`**

```tsx
import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("FreshPrep report error:", error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-8 max-w-md w-full shadow-sm text-center">
            <p className="text-sm font-semibold text-[#1a1a1a] mb-1">
              Something went wrong loading this report.
            </p>
            <p className="text-xs text-[#3d3d3d] mb-5">Try re-uploading your file.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset();
              }}
              className="px-4 py-2 bg-[#2b5346] text-white text-xs font-medium rounded-lg hover:bg-[#0d3a2f] cursor-pointer"
              style={{ transition: "background-color 150ms var(--ease-out)" }}
            >
              Start over
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ErrorBoundary.tsx
git commit -m "feat: add ErrorBoundary component for report crash recovery"
```

---

## Task 12: Enable TypeScript strict mode and eliminate `any`

**Files:**
- Modify: `tsconfig.json`
- Modify: `src/utils/fileParser.ts`

Note: `tsconfig.json` currently has no `strict` key — it defaults to `false`. Adding it will surface latent type errors.

- [ ] **Step 1: Add `"strict": true` to tsconfig.json**

Replace the current compilerOptions object with:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

- [ ] **Step 2: Run lint and collect errors**

```bash
npm run lint 2>&1 | grep "error TS" | head -40
```

Note which files have errors. Most will be in `fileParser.ts` due to `any` typed xlsx rows.

- [ ] **Step 3: Fix `any` types in `fileParser.ts`**

Add a type alias for xlsx row objects and update all three functions that use `any`:

```ts
// Add at top of file, after imports
type SheetRow = Record<string, unknown>;

// Replace: export function normalizeSheetRawData(rows: any[]): DiscountCodeData[]
// With:
export function normalizeSheetRawData(rows: SheetRow[]): DiscountCodeData[] {
```

Replace the `parseNumericValue` function signature:
```ts
// Replace: function parseNumericValue(value: any): number
// With:
function parseNumericValue(value: unknown): number {
```

Replace the catch block that used `err: any`:
```ts
// Already fixed in useFileUpload hook (err: unknown).
// In fileParser.ts, find any remaining catch(err: any) and change to catch(err: unknown).
```

For the dynamic field assignment in `normalizeSheetRawData`, replace the `(normalizedRow as any)[standardKey]` cast with an explicit switch:

```ts
// Replace:
(normalizedRow as any)[standardKey] = parseNumericValue(row[colName]);

// With:
const numVal = parseNumericValue(row[colName]);
switch (standardKey) {
  case "Signups": normalizedRow.Signups = numVal; break;
  case "Paying cx": normalizedRow["Paying cx"] = numVal; break;
  case "Conversion": normalizedRow.Conversion = numVal; break;
  case "total_discount_used": normalizedRow.total_discount_used = numVal; break;
  case "Sum LTV 3": normalizedRow["Sum LTV 3"] = numVal; break;
  case "Sum LTV 6": normalizedRow["Sum LTV 6"] = numVal; break;
  case "Sum LTV 12": normalizedRow["Sum LTV 12"] = numVal; break;
  case "Avg LTV 3": normalizedRow["Avg LTV 3"] = numVal; break;
  case "Avg LTV 6": normalizedRow["Avg LTV 6"] = numVal; break;
  case "Avg LTV 12": normalizedRow["Avg LTV 12"] = numVal; break;
}
```

- [ ] **Step 4: Fix remaining strict errors in other files**

Run lint again and fix any remaining issues (likely `strictNullChecks` or `noImplicitAny` in components):

```bash
npm run lint 2>&1 | grep "error TS"
```

Common patterns to fix:
- `ref.current` without null check → `ref.current?.method()`
- Implicit `any` parameters → add explicit types
- Missing return types on event handlers → add `: void`

- [ ] **Step 5: Run lint until clean**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json src/utils/fileParser.ts src/hooks/ src/features/ src/components/
git commit -m "chore: enable strict TypeScript, eliminate any types across codebase"
```

---

## Task 13: Add explicit return types to all exported utils functions

**Files:**
- Modify: `src/utils/fileParser.ts`
- Modify: `src/utils/fuzzy.ts`

- [ ] **Step 1: Add explicit return types to `fileParser.ts` exports**

```ts
export function normalizeSheetRawData(rows: SheetRow[]): DiscountCodeData[] { ... }

export function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetResult> { ... }

export function parsePastedCodes(text: string): string[] { ... }

export function calculatePerformanceRating(signups: number, conversionRate: number): PerformanceRating { ... }

export function calculatePerformanceGrade(conversionPercent: number): string { ... }

export function calculateOverallScore(conversionRate: number, efficiencyRatio: number, signups: number): number { ... }

export function toCanonicalCode(code: string): string { ... }

export function mergeRows(rows: DiscountCodeData[]): DiscountCodeData { ... }

export function generateAnalysisReport(
  uploadedData: DiscountCodeData[],
  targetCodes: string[]
): { foundReports: AnalyzedCodeReport[]; missingCodes: string[]; summary: KPIReportSummary; channelSummary: ChannelSummary[] } { ... }

export function exportToExcelFile(summary: KPIReportSummary, reports: AnalyzedCodeReport[], missing: string[]): void { ... }

export function exportToCSVFile(reports: AnalyzedCodeReport[]): void { ... }
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/fileParser.ts src/utils/fuzzy.ts
git commit -m "chore: add explicit return types to all exported util functions"
```

---

## Task 14: Add JSDoc to utility functions

**Files:**
- Modify: `src/utils/fileParser.ts`
- Modify: `src/utils/fuzzy.ts`

- [ ] **Step 1: Add JSDoc to the five main public functions in `fileParser.ts`**

Place each JSDoc block directly above the function signature:

```ts
/**
 * Parses a spreadsheet file (XLSX, XLS, CSV, TSV) into normalized discount code rows.
 * Returns rows plus a validation result describing which expected columns were found.
 */
export function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetResult> { ... }

/**
 * Splits freeform text into normalized, deduplicated, uppercase discount code tokens.
 * Accepts comma, newline, semicolon, and tab as delimiters.
 */
export function parsePastedCodes(text: string): string[] { ... }

/**
 * Computes per-code performance metrics (conversion rate, LTV efficiency ratio, grade)
 * and a portfolio-level KPI summary from the uploaded dataset and a list of target codes.
 * Codes not found in uploadedData are collected in missingCodes.
 */
export function generateAnalysisReport(
  uploadedData: DiscountCodeData[],
  targetCodes: string[]
): { foundReports: AnalyzedCodeReport[]; missingCodes: string[]; summary: KPIReportSummary; channelSummary: ChannelSummary[] } { ... }

/**
 * Exports the analysis results to an XLSX workbook and triggers a browser file download.
 */
export function exportToExcelFile(summary: KPIReportSummary, reports: AnalyzedCodeReport[], missing: string[]): void { ... }

/**
 * Exports the analyzed reports to a UTF-8 CSV file and triggers a browser file download.
 */
export function exportToCSVFile(reports: AnalyzedCodeReport[]): void { ... }
```

- [ ] **Step 2: Add JSDoc to the main fuzzy function in `fuzzy.ts`**

`editDistance` and `calculateConfidence` already have JSDoc. Add to the remaining two exports:

```ts
/**
 * Returns up to `maxCount` fuzzy match suggestions for a missing code,
 * sorted by confidence score descending. Confidence is computed via
 * Levenshtein distance relative to string length, with prefix/suffix bonuses.
 * Suggestions scoring below 30 are excluded.
 */
export function getFuzzySuggestionsWithConfidence(
  target: string,
  allCodes: string[],
  maxCount?: number
): FuzzySuggestionResult[] { ... }

/**
 * Simplified wrapper returning only the matched code strings (no scores).
 * Use getFuzzySuggestionsWithConfidence when confidence tiers are needed.
 */
export function getFuzzySuggestions(target: string, allCodes: string[], maxCount?: number): string[] { ... }
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/fileParser.ts src/utils/fuzzy.ts
git commit -m "docs: add JSDoc to fileParser and fuzzy utility functions"
```

---

## Task 15: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the `## Stack` section with a full tech stack table**

Find:
```markdown
## Stack

- React 19 + TypeScript
- Vite 6 + Tailwind v4
- DM Sans / DM Serif Text / DM Mono (Google Fonts)
- xlsx for spreadsheet parsing
- Deployed via GitHub Actions → GitHub Pages
```

Replace with:
```markdown
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
```

- [ ] **Step 2: Add an `## Architecture` section after `## What it does`**

```markdown
## Architecture

```
Upload → Wizard → Report
  ↓         ↓        ↓
useFileUpload  useAnalysis  useReport
```

State is managed in four custom hooks composed in `App.tsx`. UI is organized into feature folders under `src/features/`. Shared primitives live in `src/components/`.

| Folder                  | Purpose                                        |
|-------------------------|------------------------------------------------|
| `src/hooks/`            | State management — one hook per concern        |
| `src/features/upload/`  | Drag-and-drop file upload screen               |
| `src/features/wizard/`  | Code-entry flow (Paste / Full Dataset / Compare) |
| `src/features/report/`  | Multi-page report dashboard + tab components   |
| `src/components/`       | Shared UI primitives and design system         |
| `src/utils/`            | Parsing, analysis, scoring, fuzzy matching     |
| `src/types.ts`          | Shared TypeScript interfaces and type aliases  |
```

- [ ] **Step 3: Add a `## Developer Guide` section before `## Design`**

```markdown
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

**Optional columns (enable deeper analysis):** `channel`, `Province`, `total_discount_used`, `Sum LTV 12`, `Avg LTV 12`
```

- [ ] **Step 4: Verify README renders correctly**

```bash
cat README.md | head -80
```

Confirm the table and code blocks look right.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update README with tech stack table, architecture overview, developer guide"
```

---

## Verification Checklist

Run after all 15 tasks are complete:

- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — builds without error
- [ ] App.tsx is under 150 lines
- [ ] All five flows work in the browser: upload, paste, full, compare, print
- [ ] All six report pages render correctly
- [ ] Export Excel, Export CSV both download valid files
- [ ] "New Dataset" reset returns to upload screen cleanly
- [ ] ErrorBoundary "Start over" button works (test by temporarily throwing in a tab component)
