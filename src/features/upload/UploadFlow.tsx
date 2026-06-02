import React from "react";
import { FileSpreadsheet, ExternalLink } from "lucide-react";
import { FileUploadState, FileUploadActions } from "../../hooks/useFileUpload";

const LOOKER_URL = "https://datastudio.google.com/u/1/reporting/025f0337-0db3-4d63-8659-8b52ba3c4b6f/page/p_g8t621xt5c";

interface UploadFlowProps {
  state: FileUploadState;
  actions: FileUploadActions;
}

export function UploadFlow({ state, actions }: UploadFlowProps): React.ReactElement {
  const { isDragOver, fileValidation: _fileValidation, fileName: _fileName, fileInputRef } = state;
  const { handleDragOver, handleDragLeave, handleDrop, handleFileChange, triggerBrowsingInput } = actions;

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden" id="launch-screen">

      {/* Left brand panel */}
      <div
        className="hidden md:flex md:w-[40%] flex-col justify-between px-10 py-10 text-white relative overflow-hidden"
      >
        {/* Food photo background */}
        <img
          src="https://freshprep.imgix.net/landing/carousel/recipe_3.jpg?auto=compress,format&w=700"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(0.9) brightness(0.55)' }}
        />
        {/* Dark green tint overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(26,61,46,0.82) 0%, rgba(43,83,70,0.70) 60%, rgba(26,61,46,0.60) 100%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full">

          {/* Top: eyebrow */}
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-[0.18em]">
            Campaign Intelligence
          </p>

          {/* Middle: headline + feature lines */}
          <div>
            <h2 className="text-[2.4rem] font-display font-semibold leading-[1.15] text-white mb-8">
              Campaign code analysis, without the juggling.
            </h2>

            <div className="space-y-4">
              {[
                ['Match codes to LTV', 'Upload a CSV or XLSX — we do the rest.'],
                ['Province breakdowns', 'BC, AB, ON, QC segmented automatically.'],
                ['Export-ready reports', 'Excel, CSV, or print-ready PDF.'],
              ].map(([title, sub]) => (
                <div key={title} className="flex gap-3 items-start">
                  <span className="mt-[7px] w-5 h-px bg-[#e7bd27] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug">{title}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: subtle line */}
          <div className="h-px w-12 bg-white/20" />

        </div>
      </div>

      {/* Right upload panel */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-12 bg-[#f8f7f5]">
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

          {/* Step 1 — Looker Studios export instructions */}
          <div className="rounded-xl border border-[#2b5346]/20 bg-[#eef4f1] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2b5346] text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-xs font-semibold text-[#1a1a1a] uppercase tracking-wide">Export your data from Looker Studios</p>
            </div>
            <a
              href={LOOKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-semibold text-[#2b5346] hover:underline w-fit"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              Signup Flow Evaluation Dashboard
            </a>
            <ol className="space-y-1.5 text-xs text-[#3d3d3d] leading-relaxed list-none pl-1">
              <li className="flex items-start gap-2">
                <span className="text-[#2b5346] font-bold font-mono mt-px shrink-0">a.</span>
                <span>Open the dashboard using the link above</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2b5346] font-bold font-mono mt-px shrink-0">b.</span>
                <span>Select your date range — narrower ranges export faster</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2b5346] font-bold font-mono mt-px shrink-0">c.</span>
                <span>Navigate to the <strong className="font-semibold text-[#1a1a1a]">Client LTV</strong> section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2b5346] font-bold font-mono mt-px shrink-0">d.</span>
                <span>Export the table as <span className="font-mono font-semibold">CSV</span>, then upload it below</span>
              </li>
            </ol>
          </div>

          {/* Drag zone */}
          <div>
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
              <p className="text-xs mt-1 font-medium" style={{ color: '#2b5346' }}>or click to browse</p>
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
                  <span key={fmt} className="px-2.5 py-1 text-xs font-mono font-semibold rounded border" style={{ backgroundColor: '#eef4f1', color: '#2b5346', borderColor: 'rgba(43,83,70,0.2)' }}>
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
                  <span className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#2b5346' }}>1</span>
                  <span>Export Client LTV CSV from Looker Studios (see above)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#2b5346' }}>2</span>
                  <span>Drop the file above — columns are validated automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#2b5346' }}>3</span>
                  <span>Filter, compare, and export results instantly</span>
                </li>
              </ol>
            </div>
          </div>

          {/* FreshPrep logo — below the steps, not duplicating the header */}
          <div className="pt-4 border-t border-[#e5e5e5] flex items-center gap-2">
            <img
              src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
              alt="FreshPrep"
              className="h-5 w-auto opacity-40"
              style={{ filter: 'brightness(0)' }}
            />
            <span className="text-[10px] text-[#a1a1a1] font-mono uppercase tracking-widest">Campaign Intelligence</span>
          </div>

        </div>
      </div>
    </div>
  );
}
