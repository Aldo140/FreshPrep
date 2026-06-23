import React, { useState } from "react";
import { FileSpreadsheet, ExternalLink, ChevronDown, ChevronUp, ArrowRight, Database, AlertCircle } from "lucide-react";
import { FileUploadState, FileUploadActions } from "../../hooks/useFileUpload";

const LOOKER_URL = "https://datastudio.google.com/u/1/reporting/025f0337-0db3-4d63-8659-8b52ba3c4b6f/page/p_g8t621xt5c";

interface UploadFlowProps {
  state: FileUploadState;
  actions: FileUploadActions;
  onBdOnly: () => void;
  autoOpenLooker?: boolean;
}

export function UploadFlow({ state, actions, onBdOnly, autoOpenLooker = false }: UploadFlowProps): React.ReactElement {
  const { isDragOver, fileInputRef } = state;
  const { handleDragOver, handleDragLeave, handleDrop, handleFileChange, triggerBrowsingInput } = actions;
  const [showLooker, setShowLooker] = useState(true);

  // Scroll the Looker section into view when auto-opened
  const lookerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (autoOpenLooker && lookerRef.current) {
      setTimeout(() => lookerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden" id="launch-screen">

      {/* Left brand panel */}
      <div className="hidden md:flex md:w-[38%] flex-col justify-between px-10 py-10 text-white relative overflow-hidden">
        <img
          src="https://freshprep.imgix.net/landing/carousel/recipe_3.jpg?auto=compress,format&w=700"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "saturate(0.9) brightness(0.5)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(26,61,46,0.88) 0%, rgba(43,83,70,0.75) 60%, rgba(26,61,46,0.65) 100%)" }}
        />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-[0.18em]">BD Campaign Intelligence</p>
          <div>
            <h2 className="text-[2.2rem] font-display font-semibold leading-[1.15] text-white mb-8">
              BD event analysis,<br />built in.
            </h2>
            <div className="space-y-4">
              {[
                ["Province × month heatmap", "See where and when every BD event lands."],
                ["Fiscal year comparison", "FY2025 vs FY2026 — event codes, signups, province split."],
                ["Looker integration", "Upload your Client LTV export to add conversion and revenue."],
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
          <div className="h-px w-12 bg-white/20" />
        </div>
      </div>

      {/* Right panel — two paths */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-10 bg-[#f8f7f5]">
        <div className="w-full max-w-lg space-y-4">

          {/* Mobile eyebrow */}
          <div className="md:hidden text-center mb-2">
            <p className="text-[11px] font-mono text-[#a1a1a1] uppercase tracking-widest">BD Campaign Intelligence</p>
            <h2 className="text-2xl font-display font-semibold text-[#1a1a1a] mt-1">Choose how to start</h2>
          </div>

          {/* Desktop heading */}
          <div className="hidden md:block mb-1">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">BD Campaign Intelligence</p>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mt-0.5">Choose how to start</h2>
          </div>

          {/* ── Path A: Built-in BD database ── */}
          <div
            className="bg-white rounded-2xl border-2 border-[#2b5346] shadow-sm overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#eef4f1] flex items-center justify-center shrink-0 mt-0.5">
                  <Database className="w-4 h-4 text-[#2b5346]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[#0f0f0f]">Use Built-in BD Events Database</p>
                    <span className="text-[8.5px] font-mono text-[#2b5346] bg-[#eef4f1] px-2 py-0.5 rounded-full">recommended</span>
                  </div>
                  <p className="text-xs text-[#3d3d3d] mt-1 leading-relaxed">
                    Checking historical events before Jun 19, 2026? Use this. Calendar heatmap, fiscal year breakdown, and province analysis are pre-loaded — no upload needed. Browse all events, or filter to specific codes.
                  </p>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="text-[9px] font-mono text-[#3d3d3d] bg-[#f5f5f3] border border-[#e8e8e8] px-2 py-1 rounded-lg">Jul 2024 – Jun 2026</span>
                    <span className="text-[9px] font-mono text-[#3d3d3d] bg-[#f5f5f3] border border-[#e8e8e8] px-2 py-1 rounded-lg">580+ event codes</span>
                    <span className="text-[9px] font-mono text-[#3d3d3d] bg-[#f5f5f3] border border-[#e8e8e8] px-2 py-1 rounded-lg">2 fiscal years</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[9px] font-mono text-[#c9a000]">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Data ends Jun 19, 2026 — upload a newer export anytime to get current data</span>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={onBdOnly}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white"
                style={{ backgroundColor: "#2b5346", transition: "background-color 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1a3d2f")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#2b5346")}
              >
                Explore BD Events
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e5e5e5]" />
            <span className="text-[10px] font-mono text-[#a1a1a1] shrink-0">checking a new event or need data after Jun 19?</span>
            <div className="flex-1 h-px bg-[#e5e5e5]" />
          </div>

          {/* ── Path B: Looker upload ── */}
          <div ref={lookerRef} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${autoOpenLooker ? "border-[#2b5346]" : "border-[#e5e5e5]"}`}>
            <button
              onClick={() => setShowLooker(v => !v)}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
            >
              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-[#f5f5f3] flex items-center justify-center shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#888]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">Upload Your Own Data File</p>
                  <p className="text-xs text-[#888] mt-0.5">
                    For new events or data after Jun 19, 2026 — export from Looker and upload below
                  </p>
                </div>
              </div>
              {showLooker
                ? <ChevronUp className="w-4 h-4 text-[#a1a1a1] shrink-0" />
                : <ChevronDown className="w-4 h-4 text-[#a1a1a1] shrink-0" />}
            </button>

            {showLooker && (
              <div className="border-t border-[#f0f0ee] px-5 pb-5 pt-4 space-y-4">

                {/* Looker instructions */}
                <div className="rounded-xl border border-[#2b5346]/15 bg-[#eef4f1] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2b5346] text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <p className="text-xs font-semibold text-[#1a1a1a] uppercase tracking-wide">Export from Looker Studios</p>
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
                    {[
                      ["a.", "Open the dashboard using the link above"],
                      ["b.", "Select your date range — narrower ranges export faster"],
                      ["c.", <>Navigate to the <strong className="font-semibold text-[#1a1a1a]">Client LTV</strong> section</>],
                      ["d.", <>Export the table as <span className="font-mono font-semibold">CSV</span>, then upload below</>],
                    ].map(([label, text]) => (
                      <li key={String(label)} className="flex items-start gap-2">
                        <span className="text-[#2b5346] font-bold font-mono mt-px shrink-0">{label}</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Drop zone */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv,.tsv"
                    className="hidden"
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerBrowsingInput}
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center min-h-[130px] transition-colors"
                    style={{
                      borderColor: isDragOver ? "#2b5346" : "#e5e5e5",
                      backgroundColor: isDragOver ? "#eef4f1" : "#fafafa",
                    }}
                  >
                    <FileSpreadsheet
                      className="w-8 h-8 mb-2.5"
                      style={{ color: isDragOver ? "#2b5346" : "#c0c0c0" }}
                    />
                    <p className="text-sm font-medium text-[#1a1a1a]">Drop your data file here</p>
                    <p className="text-xs mt-1 font-medium text-[#2b5346]">or click to browse</p>
                    <p className="text-[10px] text-[#a1a1a1] mt-1.5 font-mono">CSV · XLSX · XLS · TSV</p>
                  </div>
                </div>

                <p className="text-[9.5px] text-[#a1a1a1] font-mono leading-relaxed">
                  Column headers are auto-detected. Promo code, signups, LTV, and channel columns are mapped automatically. All data stays in your browser.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 pt-1">
            <img
              src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
              alt="FreshPrep"
              className="h-4 w-auto opacity-30"
              style={{ filter: "brightness(0)" }}
            />
            <span className="text-[9.5px] text-[#c0c0c0] font-mono uppercase tracking-widest">Campaign Intelligence · All analysis runs client-side</span>
          </div>

        </div>
      </div>
    </div>
  );
}
