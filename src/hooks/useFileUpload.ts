import React, { useState, useRef, useMemo, useCallback, RefObject } from "react";
import { DiscountCodeData } from "../types";
import { parseSpreadsheetFile, FileValidationResult, CodeLevelReportKind, MonthlyCodeStat } from "../utils/fileParser";
import { buildPayingSnapshot, savePayingSnapshot } from "../utils/payingDataBridge";

export interface FileUploadState {
  dbRows: DiscountCodeData[];
  fileName: string | null;
  fileValidation: FileValidationResult | null;
  isDragOver: boolean;
  uniqueDbCodes: string[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  // Which parts of the new two-table Looker export have been loaded so far.
  // Both null = either nothing uploaded yet, or a legacy single-file (Client LTV /
  // province wrap-up sheet) upload is in effect instead.
  loadedParts: { signup: string | null; paying: string | null };
  // (code, month) breakdown from the two Code Level Report uploads — lets Calendar/
  // Fiscal place newly-uploaded codes on the right month cell, something the flattened
  // per-code totals in `dbRows` can't do. Empty for legacy single-file uploads.
  monthlySignupStats: MonthlyCodeStat[];
  monthlyPayingStats: MonthlyCodeStat[];
}

export interface FileUploadActions {
  processUploadedFile: (file: File) => Promise<void>;
  processUploadedFiles: (files: File[]) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  triggerBrowsingInput: () => void;
  reset: () => void;
}

function mergeCodeMap(map: Map<string, DiscountCodeData>, rows: DiscountCodeData[]): Map<string, DiscountCodeData> {
  const next = new Map(map);
  rows.forEach(r => next.set(r.discount_code, r));
  return next;
}

const ALL_REQUIRED = ["discount_code", "Signups", "Paying cx", "Conversion"];
const ALL_OPTIONAL = ["channel", "Province"];

export function useFileUpload(): { state: FileUploadState; actions: FileUploadActions } {
  // Legacy path: a single "full" file (old Client LTV export, or a province wrap-up
  // sheet) where every row already has Signups + Paying cx + LTV together.
  const [fullRows, setFullRows] = useState<DiscountCodeData[] | null>(null);
  const [fullFileName, setFullFileName] = useState<string | null>(null);
  const [fullValidation, setFullValidation] = useState<FileValidationResult | null>(null);

  // New path: the two 2026 Looker "Code Level Report" exports, uploaded separately
  // (or together, dropped at once) and joined here by discount code.
  const [signupPartial, setSignupPartial] = useState<Map<string, DiscountCodeData> | null>(null);
  const [payingPartial, setPayingPartial] = useState<Map<string, DiscountCodeData> | null>(null);
  const [signupFileName, setSignupFileName] = useState<string | null>(null);
  const [payingFileName, setPayingFileName] = useState<string | null>(null);
  const [signupValidation, setSignupValidation] = useState<FileValidationResult | null>(null);
  const [payingValidation, setPayingValidation] = useState<FileValidationResult | null>(null);
  const [monthlySignupStats, setMonthlySignupStats] = useState<MonthlyCodeStat[]>([]);
  const [monthlyPayingStats, setMonthlyPayingStats] = useState<MonthlyCodeStat[]>([]);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dbRows = useMemo<DiscountCodeData[]>(() => {
    if (fullRows) return fullRows;
    if (!signupPartial && !payingPartial) return [];

    const codes = new Set<string>([
      ...(signupPartial ? Array.from(signupPartial.keys()) : []),
      ...(payingPartial ? Array.from(payingPartial.keys()) : []),
    ]);

    return Array.from(codes).map((code): DiscountCodeData => {
      const s = signupPartial?.get(code);
      const p = payingPartial?.get(code);
      return {
        discount_code: code,
        channel: s?.channel ?? p?.channel ?? "Direct / Unknown",
        Province: s?.Province,
        Signups: s?.Signups ?? 0,
        "Paying cx": p?.["Paying cx"] ?? 0,
        total_discount_used: 0,
        "Sum LTV 3": 0,
        "Sum LTV 6": 0,
        "Sum LTV 12": 0,
        "Avg LTV 3": 0,
        "Avg LTV 6": 0,
        "Avg LTV 12": 0,
      };
    });
  }, [fullRows, signupPartial, payingPartial]);

  const fileName = useMemo<string | null>(() => {
    if (fullFileName) return fullFileName;
    const parts = [signupFileName, payingFileName].filter(Boolean);
    return parts.length > 0 ? parts.join(" + ") : null;
  }, [fullFileName, signupFileName, payingFileName]);

  const loadedParts = useMemo(() => ({ signup: signupFileName, paying: payingFileName }), [signupFileName, payingFileName]);

  // Once both the signup-side and paying-side Code Level Reports are in, the pair
  // together covers everything the old single-file "full" validation used to check
  // (discount_code, Signups, Paying cx, Conversion) — so synthesize an equivalent
  // combined validation here rather than showing whichever file was uploaded last.
  const fileValidation = useMemo<FileValidationResult | null>(() => {
    if (fullValidation) return fullValidation;
    if (!signupValidation && !payingValidation) return null;

    const requiredFound = new Set<string>();
    if (signupPartial) { requiredFound.add("discount_code"); requiredFound.add("Signups"); }
    if (payingPartial) { requiredFound.add("discount_code"); requiredFound.add("Paying cx"); }
    if (signupPartial && payingPartial) requiredFound.add("Conversion");

    const optionalFound = new Set<string>();
    const columnsDetected = new Set<string>();
    [signupValidation, payingValidation].forEach(v => {
      v?.optionalFound.forEach(f => optionalFound.add(f));
      v?.columnsDetected.forEach(c => columnsDetected.add(c));
    });

    // Only "bdEventsOnly" if every part that's actually loaded says so — a signup-side
    // file that's already BD/Events-filtered doesn't tell us anything about the
    // paying-side file's scope until that one's loaded too.
    const parts = [signupValidation, payingValidation].filter((v): v is FileValidationResult => v !== null);
    const channelScope: FileValidationResult["channelScope"] = parts.length > 0 && parts.every(v => v.channelScope === "bdEventsOnly")
      ? "bdEventsOnly"
      : "mixed";

    return {
      // Deliberately strict: true only once both the signup-side and paying-side
      // reports are in. A signup-only or paying-only partial has real rows (so
      // dbRows is non-empty and the app proceeds), but conversion would be 0/wrong
      // for every code until its counterpart is uploaded too — isValid=false here
      // is what drives WizardFlow's "this file is missing X" banner to prompt for it.
      isValid: ALL_REQUIRED.every(f => requiredFound.has(f)),
      rowsLoaded: dbRows.length,
      columnsDetected: Array.from(columnsDetected),
      requiredFound: Array.from(requiredFound),
      requiredMissing: ALL_REQUIRED.filter(f => !requiredFound.has(f)),
      optionalFound: Array.from(optionalFound),
      optionalMissing: ALL_OPTIONAL.filter(f => !optionalFound.has(f)),
      reportKind: signupPartial && payingPartial ? "full" : (signupPartial ? "signup" : "paying"),
      channelScope,
    };
  }, [fullValidation, signupValidation, payingValidation, signupPartial, payingPartial, dbRows.length]);

  const uniqueDbCodes = useMemo(() =>
    dbRows.length === 0
      ? []
      : Array.from(new Set(dbRows.map(r => r.discount_code.trim().toUpperCase()))).filter(Boolean).sort(),
    [dbRows]
  );

  const applyParsedFile = useCallback((file: File, rows: DiscountCodeData[], validation: FileValidationResult, kind: CodeLevelReportKind | "full", monthly?: MonthlyCodeStat[]) => {
    if (kind === "full") {
      // A legacy single-file upload always wins outright — it's self-contained and
      // shouldn't be silently merged with partial Code Level Report uploads.
      setFullRows(rows);
      setFullFileName(file.name);
      setFullValidation(validation);
      setSignupPartial(null);
      setPayingPartial(null);
      setSignupFileName(null);
      setPayingFileName(null);
      setSignupValidation(null);
      setPayingValidation(null);
      setMonthlySignupStats([]);
      setMonthlyPayingStats([]);
      return;
    }

    setFullRows(null);
    setFullFileName(null);
    setFullValidation(null);
    if (kind === "signup") {
      setSignupPartial(prev => mergeCodeMap(prev ?? new Map(), rows));
      setSignupFileName(file.name);
      setSignupValidation(validation);
      setMonthlySignupStats(monthly ?? []);
    } else {
      setPayingPartial(prev => mergeCodeMap(prev ?? new Map(), rows));
      setPayingFileName(file.name);
      setPayingValidation(validation);
      setMonthlyPayingStats(monthly ?? []);
      // Hand the authoritative paying counts to /codefinder, which is a separate
      // route and can't reach this state directly. See payingDataBridge.ts.
      savePayingSnapshot(buildPayingSnapshot(rows, file.name));
    }
  }, []);

  const processUploadedFiles = useCallback(async (files: File[]): Promise<void> => {
    // Parse every file in parallel first, THEN apply all results together in one
    // synchronous pass. If these were applied one at a time as each file finished,
    // dropping both the signup-side and paying-side files at once could let dbRows
    // go non-empty after just the first file — and App.tsx navigates away from this
    // screen as soon as dbRows is non-empty, before the second file ever lands.
    const outcomes = await Promise.allSettled(
      files.map(async file => ({ file, result: await parseSpreadsheetFile(file) }))
    );

    outcomes.forEach((outcome, i) => {
      if (outcome.status === "fulfilled") {
        const { file, result } = outcome.value;
        applyParsedFile(file, result.dbRows, result.validation, result.validation.reportKind, result.monthly);
      } else {
        const file = files[i];
        const msg = outcome.reason instanceof Error ? outcome.reason.message : "Verify document format (XLSX, XLS, CSV, TSV) and retry.";
        alert(`Error reading ${file.name}: ${msg}`);
      }
    });
  }, [applyParsedFile]);

  const processUploadedFile = useCallback(async (file: File): Promise<void> => {
    await processUploadedFiles([file]);
  }, [processUploadedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((): void => setIsDragOver(false), []);

  const handleDrop = useCallback(async (e: React.DragEvent): Promise<void> => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) await processUploadedFiles(files);
  }, [processUploadedFiles]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) await processUploadedFiles(files);
  }, [processUploadedFiles]);

  const triggerBrowsingInput = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const reset = useCallback((): void => {
    setFullRows(null);
    setFullFileName(null);
    setFullValidation(null);
    setSignupPartial(null);
    setPayingPartial(null);
    setSignupFileName(null);
    setPayingFileName(null);
    setSignupValidation(null);
    setPayingValidation(null);
    setMonthlySignupStats([]);
    setMonthlyPayingStats([]);
    setIsDragOver(false);
  }, []);

  return {
    state: { dbRows, fileName, fileValidation, isDragOver, uniqueDbCodes, fileInputRef, loadedParts, monthlySignupStats, monthlyPayingStats },
    actions: { processUploadedFile, processUploadedFiles, handleDragOver, handleDragLeave, handleDrop, handleFileChange, triggerBrowsingInput, reset },
  };
}
