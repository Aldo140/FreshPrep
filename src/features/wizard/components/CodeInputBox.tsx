/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Upload, Clipboard, RefreshCw, Trash2, FileSpreadsheet, FileText } from "lucide-react";
import { parsePastedCodes } from "../../../utils/fileParser";

interface CodeInputBoxProps {
  onFileLoaded: (data: any[], fileName: string) => void;
  onCodesNormalized: (codes: string[]) => void;
  onGenerateReport: () => void;
  onResetToSample: () => void;
  loadedFileName: string | null;
  loadedDataCount: number;
  initialRawCodes: string;
}

export default function CodeInputBox({
  onFileLoaded,
  onCodesNormalized,
  onGenerateReport,
  onResetToSample,
  loadedFileName,
  loadedDataCount,
  initialRawCodes
}: CodeInputBoxProps) {
  const [inputText, setInputText] = useState(initialRawCodes);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse raw text whenever it changes to provide interactive count badge
  const normalizedCodes = parsePastedCodes(inputText);

  // Sync parent with cleaned state on inputs
  useEffect(() => {
    onCodesNormalized(normalizedCodes);
  }, [inputText]);

  // Handle manual code cleanup click
  const handleFormatClick = () => {
    const formatted = normalizedCodes.join("\n");
    setInputText(formatted);
  };

  // Process selected file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    const { parseSpreadsheetFile } = await import("../utils/fileParser");
    try {
      const result = await parseSpreadsheetFile(file);
      onFileLoaded(result.dbRows, file.name);
    } catch (err: any) {
      alert(`Error reading file: ${err?.message || "Verify document format (XLSX, XLS, CSV) and retry"}`);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearCodes = () => {
    setInputText("");
  };

  return (
    <div id="code-input-panel" className="flex flex-col gap-4 bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs font-sans">
      
      {/* STEP 1: Upload Database File */}
      <div className="flex flex-col gap-2" id="step-1-upload">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          1. Upload Data Export
        </label>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          className="hidden"
          id="excel-file-uploader"
        />

        <div
          id="drag-drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleAreaClick}
          className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer flex flex-col items-center justify-center min-h-[105px] transition-colors duration-200 ${
            isDragOver
              ? "border-[#2b5346] bg-[#eef4f1]/30"
              : loadedFileName
              ? "border-[#2b5346] bg-[#eef4f1]/15"
              : "border-slate-200 hover:border-[#2b5346] bg-slate-50/40"
          }`}
        >
          {loadedFileName ? (
            <div className="space-y-1 animate-fade-in" id="file-loaded-view">
              <div className="w-8 h-8 rounded-lg bg-[#eef4f1] text-[#2b5346] flex items-center justify-center mx-auto shadow-2xs border border-[#2b5346]/20">
                <FileSpreadsheet className="w-4.5 h-4.5 text-[#2b5346]" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold text-slate-800 truncate max-w-[170px] mx-auto">
                  {loadedFileName}
                </p>
                <p className="text-[9px] text-slate-450 font-mono font-semibold">
                  {loadedDataCount.toLocaleString()} catalog rows active
                </p>
                {loadedFileName === "Corporate_Default_FY26.xlsx" && (
                  <p className="text-[8.5px] text-[#2b5346] bg-[#eef4f1] px-1.5 py-0.5 rounded font-black border border-[#2b5346]/20 inline-block mt-1 font-sans leading-none">
                    Target Range: Jun 25 - Jun 26
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1" id="file-unloaded-view">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-medium text-slate-600">
                Drop file here or <span className="text-[#2b5346] underline font-extrabold hover:text-[#0d3a2f]">browse</span>
              </p>
              <p className="text-[8.5px] text-slate-400 font-medium">
                Accepts XLSX, XLS, and CSV exports
              </p>
            </div>
          )}
        </div>

        {/* Loaded dataset stats footer / action link */}
        <div className="text-[10px] flex items-center justify-between mt-0.5">
          {loadedFileName ? (
            <button
              onClick={() => onResetToSample()}
              className="text-[#2b5346] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Reload Demo Dataset
            </button>
          ) : (
            <span className="text-slate-400">Database offline</span>
          )}
        </div>
      </div>

      {/* STEP 2: Paste Target Promo Codes */}
      <div className="flex flex-col gap-2" id="step-2-paste">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
            2. Enter Target Codes
          </label>
          <span className="text-[9.5px] bg-[#eef4f1] text-[#2b5346] px-2 py-0.5 rounded font-mono font-bold border border-[#2b5346]/20">
            {normalizedCodes.length} code{normalizedCodes.length === 1 ? "" : "s"} detected
          </span>
        </div>

        <div className="relative">
          <textarea
            id="event-codes-textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste multiple codes here (separated by spaces, commas, or carriage returns)..."
            className="w-full h-[110px] font-mono text-[11px] p-2.5 rounded-lg border border-slate-205 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2b5346] focus:border-[#2b5346] resize-none leading-normal"
          />
          {inputText && (
            <div className="absolute right-2 bottom-2 flex gap-1.5">
              <button
                id="format-codes-btn"
                onClick={handleFormatClick}
                title="Normalize spacing"
                className="p-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-205 shadow-2xs transition-colors cursor-pointer font-bold"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>
              <button
                id="clear-codes-btn"
                onClick={handleClearCodes}
                title="Clear contents"
                className="p-1 rounded bg-white hover:bg-slate-50 text-[#850b0b] border border-slate-205 shadow-2xs transition-colors cursor-pointer font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Report Button / Trigger */}
      <div className="pt-2 border-t border-slate-100">
        <button
          id="generate-report-btn"
          onClick={() => onGenerateReport()}
          disabled={normalizedCodes.length === 0}
          className={`w-full py-2 rounded-lg font-bold text-xs tracking-wide shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            normalizedCodes.length > 0
              ? "bg-[#2b5346] hover:bg-[#0d3a2f] text-white shadow-[#2b5346]/20"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Generate Report
        </button>
      </div>

    </div>
  );
}
