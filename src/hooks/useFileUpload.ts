import React, { useState, useRef, useMemo, useCallback, RefObject } from "react";
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
    setIsDragOver(false);
  }, []);

  return {
    state: { dbRows, fileName, fileValidation, isDragOver, uniqueDbCodes, fileInputRef },
    actions: { processUploadedFile, handleDragOver, handleDragLeave, handleDrop, handleFileChange, triggerBrowsingInput, reset },
  };
}
