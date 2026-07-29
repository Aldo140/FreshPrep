import React, { useState } from "react";
import {
  FileSpreadsheet, ExternalLink, ChevronDown, ChevronUp,
  ArrowRight, ArrowLeft, Database, AlertCircle, BookOpen,
  CheckCircle2, XCircle,
} from "lucide-react";
import { FileUploadState, FileUploadActions } from "../../hooks/useFileUpload";
import { BUILTIN_DB, BUILTIN_DB_RANGE_LABEL } from "../../config/builtinDb";

const LOOKER_URL =
  "https://datastudio.google.com/u/1/reporting/025f0337-0db3-4d63-8659-8b52ba3c4b6f/page/p_g8t621xt5c";

interface UploadFlowProps {
  state: FileUploadState;
  actions: FileUploadActions;
  onBdOnly: () => void;
  autoOpenLooker?: boolean;
}

function Yes({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-[#2b5346] shrink-0 mt-px" />
      <span className="text-xs text-[#3d3d3d] leading-relaxed">{children}</span>
    </li>
  );
}

function No({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <XCircle className="w-3.5 h-3.5 text-[#cacaca] shrink-0 mt-px" />
      <span className="text-xs text-[#999] leading-relaxed">{children}</span>
    </li>
  );
}

const COMPARISON_ROWS: [string, boolean, boolean][] = [
  ["Calendar heatmap (province × month)", true, true],
  ["Fiscal year comparison (FY2025 / FY2026)", true, true],
  ["Regional province breakdown", true, true],
  [`Code lookup & browse all ${BUILTIN_DB.codeCount} codes`, true, true],
  ["Compare two event editions", true, true],
  ["Conversion rate (signups → paying)", true, true],
  [`Data after ${BUILTIN_DB.endLabel}`, false, true],
  ["LTV at 3 / 6 / 12 months", false, true],
  ["Discount spend & efficiency ratio", false, true],
  ["Performance grade (A+ → F)", false, true],
  ["Export Excel / CSV / Print", false, true],
];

// ── Left brand panel ──────────────────────────────────────────
function BrandPanel() {
  return (
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
        style={{
          background:
            "linear-gradient(160deg, rgba(26,61,46,0.88) 0%, rgba(43,83,70,0.75) 60%, rgba(26,61,46,0.65) 100%)",
        }}
      />
      <div className="relative z-10 flex flex-col justify-between h-full">
        <p className="text-[11px] font-mono text-white/40 uppercase tracking-[0.18em]">
          BD Campaign Intelligence
        </p>
        <div>
          <h2 className="text-[2.2rem] font-display font-semibold leading-[1.15] text-white mb-8">
            BD event analysis,
            <br />
            built in.
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
  );
}

// ── Guide view ────────────────────────────────────────────────
function GuideView({
  onBdOnly,
  onUpload,
}: {
  onBdOnly: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#f3f2ef" }}>

      {/* ══════════════════════════════════════════════════════════
          MOBILE LAYOUT — native app feel, hidden on md+
      ══════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col min-h-full">

        {/* Hero — full-bleed food image with forest overlay */}
        <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
          <img
            src="https://freshprep.imgix.net/landing/carousel/recipe_3.jpg?auto=compress,format&w=700"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "saturate(0.8) brightness(0.4)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(165deg,rgba(10,42,30,0.95) 0%,rgba(43,83,70,0.87) 55%,rgba(43,83,70,0.65) 100%)" }}
          />
          <div className="relative z-10 flex flex-col justify-between px-6 py-7" style={{ minHeight: 280 }}>
            {/* Logo + eyebrow */}
            <div className="flex items-center gap-3">
              <img
                src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
                alt="FreshPrep"
                style={{ height: 20, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.88 }}
              />
              <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.22em" }}>
                Campaign Intelligence
              </span>
            </div>

            {/* Headline + stat chips */}
            <div>
              <h1
                className="font-display font-semibold text-white"
                style={{ fontSize: "clamp(26px,7vw,34px)", lineHeight: 1.12, marginBottom: 16 }}
              >
                BD event analysis,<br />built in.
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  [String(BUILTIN_DB.codeCount), "event codes"],
                  [BUILTIN_DB.fiscalYears, "fiscal years"],
                  ["4", "provinces"],
                ] as [string, string][]).map(([val, label]) => (
                  <div
                    key={val}
                    className="flex items-baseline gap-1.5"
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "4px 10px" }}
                  >
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "white" }}>{val}</span>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.5)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions section */}
        <div className="flex flex-col gap-3 px-4 pt-5 pb-8">

          {/* Primary CTA — Built-in DB card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#2b5346", boxShadow: "0 4px 20px rgba(43,83,70,0.28)" }}
          >
            <div className="px-5 pt-5 pb-5">
              {/* Header */}
              <div className="flex items-start gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.11)" }}
                >
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: "white" }}>
                      Built-in Database
                    </span>
                    <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#e7bd27", background: "rgba(231,189,39,0.15)", border: "1px solid rgba(231,189,39,0.3)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      recommended
                    </span>
                  </div>
                  <p style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                    {BUILTIN_DB.startMonthLabel} – {BUILTIN_DB.endMonthLabel} · {BUILTIN_DB.codeCount} codes
                  </p>
                </div>
              </div>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {["Province heatmap", "Fiscal year comparison", "Regional breakdown", "Browse all codes"].map(f => (
                  <span
                    key={f}
                    style={{ fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 500, color: "rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.07)", padding: "3px 10px", borderRadius: 99 }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* CTA button */}
              <button
                onClick={onBdOnly}
                className="w-full flex items-center justify-center gap-2 tap-press cursor-pointer"
                style={{ background: "white", color: "#2b5346", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, borderRadius: 14, minHeight: 54, boxShadow: "0 2px 16px rgba(0,0,0,0.14)", WebkitTapHighlightColor: "transparent" }}
              >
                Explore BD Events
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Secondary CTA — Upload */}
          <button
            onClick={onUpload}
            className="w-full flex items-center gap-3 tap-press cursor-pointer"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 18, padding: "14px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", WebkitTapHighlightColor: "transparent" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#f0efec" }}
            >
              <FileSpreadsheet className="w-5 h-5" style={{ color: "#8a9e99" }} />
            </div>
            <div className="flex-1 text-left">
              <p style={{ fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: "#0f1410" }}>
                Upload Looker File
              </p>
              <p style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "#a1a1a1", marginTop: 1 }}>
                Adds conversion · LTV · grades
              </p>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "#c8d0cc" }} />
          </button>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 pt-3">
            <img
              src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
              alt="FreshPrep"
              style={{ height: 12, width: "auto", filter: "brightness(0)", opacity: 0.2 }}
            />
            <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "#c0c0c0", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              All analysis runs client-side
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP LAYOUT — hidden on mobile
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col items-center min-h-full px-5 py-10" style={{ background: "#f8f7f5" }}>
        <div className="w-full max-w-2xl space-y-5">

          {/* Page header */}
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#2b5346] shrink-0" />
            <h2 className="text-xl font-semibold text-[#1a1a1a]">What can I check here?</h2>
            <span className="text-[8px] font-mono font-bold text-[#2b5346] bg-[#eef4f1] border border-[#2b5346]/20 px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider">
              user guide
            </span>
          </div>

          {/* Two-option card */}
          <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-[1fr_1px_1fr]">

              {/* ── Option A: Built-in ── */}
              <div className="border-t-[3px] border-[#e7bd27] bg-[#eef4f1] p-5 flex flex-col gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2b5346] flex items-center justify-center shrink-0 mt-0.5">
                    <Database className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#0f0f0f]">Built-in Database</p>
                      <span className="text-[7.5px] font-mono font-bold text-[#2b5346] bg-white/80 border border-[#2b5346]/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        recommended
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-[#2b5346]/70 mt-0.5">
                      {BUILTIN_DB_RANGE_LABEL} · {BUILTIN_DB.codeCount} codes · {BUILTIN_DB.fiscalYearCount} fiscal years
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[7.5px] font-mono font-bold uppercase tracking-[0.18em] text-[#2b5346] mb-2">
                    What you can check
                  </p>
                  <ul className="space-y-1.5">
                    <Yes>Province × month <strong>calendar heatmap</strong></Yes>
                    <Yes><strong>Fiscal year comparison</strong> — FY2025 vs FY2026</Yes>
                    <Yes>Browse &amp; search <strong>all {BUILTIN_DB.codeCount} event codes</strong></Yes>
                    <Yes><strong>Compare two event editions</strong> side-by-side</Yes>
                    <Yes>Regional signups by province</Yes>
                  </ul>
                </div>
                <div>
                  <p className="text-[7.5px] font-mono font-bold uppercase tracking-[0.18em] text-[#b5b5b5] mb-2">
                    Not included
                  </p>
                  <ul className="space-y-1">
                    <No>LTV &amp; revenue metrics</No>
                    <No>Performance grades (A+ → F)</No>
                    <No>Events after {BUILTIN_DB.endLabel}</No>
                  </ul>
                </div>
                <div className="mt-auto pt-1 space-y-2.5">
                  <div className="flex items-start gap-1.5 text-[8.5px] font-mono text-[#b08000] leading-relaxed">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-px" />
                    <span>Data ends {BUILTIN_DB.endShortLabel} — upload a Looker export anytime to get current data</span>
                  </div>
                  <button
                    onClick={onBdOnly}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer text-white transition-colors tap-scale"
                    style={{ backgroundColor: "#2b5346", minHeight: 48 }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1a3d2f")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#2b5346")}
                  >
                    Explore BD Events
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Gold vertical divider */}
              <div className="bg-[#e7bd27]/25" />

              {/* ── Option B: Upload ── */}
              <div className="bg-white p-5 flex flex-col gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#f2f2f0] flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#777]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0f0f0f]">Upload Your Looker File</p>
                    <p className="text-[9px] font-mono text-[#999] mt-0.5">
                      Current data · conversion · LTV · grades
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[7.5px] font-mono font-bold uppercase tracking-[0.18em] text-[#2b5346] mb-2">
                    Everything in Option A, plus
                  </p>
                  <ul className="space-y-1.5">
                    <Yes>Conversion rate — signups → paying customers</Yes>
                    <Yes>LTV at 3, 6, and 12 months</Yes>
                    <Yes>Performance grade per code (A+ → F)</Yes>
                    <Yes>Discount spend &amp; efficiency ratio</Yes>
                    <Yes>Export to Excel, CSV, or Print</Yes>
                    <Yes>Missing code flags (red badge)</Yes>
                  </ul>
                </div>
                <div>
                  <p className="text-[7.5px] font-mono font-bold uppercase tracking-[0.18em] text-[#b5b5b5] mb-2">
                    Use when you need
                  </p>
                  <ul className="space-y-1">
                    <No>Events not yet in the built-in database</No>
                    <No>Data after {BUILTIN_DB.endLabel}</No>
                    <No>Revenue &amp; grade analysis</No>
                  </ul>
                </div>
                <div className="mt-auto pt-1">
                  <button
                    onClick={onUpload}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer text-[#1a1a1a] border-2 border-[#dedede] hover:border-[#2b5346] hover:text-[#2b5346] transition-colors tap-scale"
                    style={{ minHeight: 48 }}
                  >
                    Upload Your File
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div>
            <p className="text-[7.5px] font-mono font-bold uppercase tracking-[0.18em] text-[#b5b5b5] mb-2.5">
              Feature comparison
            </p>
            <div className="overflow-x-auto rounded-xl border border-[#e5e5e5] bg-white">
              <table className="w-full text-[10px] font-mono border-collapse">
                <thead>
                  <tr className="bg-[#f5f5f3] border-b border-[#e5e5e5]">
                    <th className="text-left px-3 py-2 text-[#888] font-semibold">Feature</th>
                    <th className="text-center px-3 py-2 text-[#2b5346] font-semibold">Built-in</th>
                    <th className="text-center px-3 py-2 text-[#888] font-semibold">Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map(([feat, db, upload]) => (
                    <tr key={feat} className="border-b border-[#f0f0ee] last:border-0">
                      <td className="px-3 py-1.5 text-[#3d3d3d]">{feat}</td>
                      <td className="px-3 py-1.5 text-center">{db ? <span className="text-[#2b5346] font-bold">✓</span> : <span className="text-[#d5d5d5]">—</span>}</td>
                      <td className="px-3 py-1.5 text-center">{upload ? <span className="text-[#2b5346] font-bold">✓</span> : <span className="text-[#d5d5d5]">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 pt-1 pb-2">
            <img
              src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
              alt="FreshPrep"
              className="h-4 w-auto opacity-30"
              style={{ filter: "brightness(0)" }}
            />
            <span className="text-[9.5px] text-[#c0c0c0] font-mono uppercase tracking-widest">
              Campaign Intelligence · All analysis runs client-side
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Upload view ───────────────────────────────────────────────
function UploadView({
  state,
  actions,
  onBack,
}: {
  state: FileUploadState;
  actions: FileUploadActions;
  onBack: () => void;
}) {
  const [showAllSteps, setShowAllSteps] = useState(false);
  const { isDragOver, fileInputRef } = state;
  const { handleDragOver, handleDragLeave, handleDrop, handleFileChange, triggerBrowsingInput } =
    actions;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f7f5]">
      <div className="flex flex-col items-center min-h-full px-5 py-10">
        <div className="w-full max-w-lg space-y-5">

          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-[#666] font-medium hover:text-[#1a1a1a] cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to guide
          </button>

          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f2f2f0] flex items-center justify-center shrink-0 mt-0.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-[#777]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1a1a1a]">Upload Your Looker Export</h2>
              <p className="text-xs text-[#888] mt-0.5 leading-relaxed">
                Export both <strong className="text-[#555]">Code Level Report</strong> tables from Looker
                Studio, then drop them both below together. Accepted: CSV, XLSX, XLS, TSV.
              </p>
            </div>
          </div>

          {/* LTV notice */}
          <div className="flex items-start gap-2 rounded-xl border border-[#e0c46a]/40 bg-[#fdf8ea] px-3.5 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#b08000] shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-[#7a5c00] leading-relaxed">
              FreshPrep's dashboard replaced the old <strong>Client LTV</strong> table with two
              separate count tables in 2026. They don't carry LTV or revenue data, so
              conversion rate and grades still work, but <strong>LTV and efficiency ratio
              will show as $0</strong> until Finance restores an LTV source. If your org
              still has the old Client LTV table available, you can upload that single
              file instead — it works the same way it always did.
            </p>
          </div>

          {/* How-to card */}
          <div className="rounded-2xl border border-[#2b5346]/15 bg-[#eef4f1] overflow-hidden">
            <div className="px-5 py-4 space-y-4">

              <div className="flex items-center justify-between">
                <p className="text-[7.5px] font-mono font-bold uppercase tracking-[0.18em] text-[#2b5346]">
                  How to export from Looker Studio
                </p>
                <a
                  href={LOOKER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[9px] font-mono font-semibold text-[#2b5346] hover:underline"
                >
                  Open Looker
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* 4-step summary */}
              <ol className="space-y-3 list-none">
                {(
                  [
                    [
                      "1",
                      <>
                        Open the{" "}
                        <strong>Signup Flow Evaluation Dashboard</strong> and sign
                        in with your Fresh Prep Google account
                      </>,
                    ],
                    [
                      "2",
                      <>
                        Set the date range — start <strong>before</strong> the
                        event began and extend the end far enough to capture late
                        conversions
                      </>,
                    ],
                    [
                      "3",
                      <>
                        Find the two tables named <strong>Code Level Report</strong> — one
                        under "Signup by Channel" (has <code>signup_code</code>), one under
                        "Paying Customer By Channel" (has <code>code_used</code>)
                      </>,
                    ],
                    [
                      "4",
                      <>
                        Hover each one, click <strong>⋮ → Export → CSV</strong>, then drop
                        both downloaded files into the box below <strong>at the same time</strong>
                      </>,
                    ],
                  ] as [string, React.ReactNode][]
                ).map(([num, text]) => (
                  <li key={num} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#2b5346] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {num}
                    </span>
                    <span className="text-xs text-[#3d3d3d] leading-relaxed">{text}</span>
                  </li>
                ))}
              </ol>

              {/* Toggle for verbose steps */}
              <button
                onClick={() => setShowAllSteps(v => !v)}
                className="flex items-center gap-1 text-[9px] font-mono text-[#2b5346]/60 hover:text-[#2b5346] cursor-pointer transition-colors"
              >
                {showAllSteps ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {showAllSteps ? "Hide full instructions" : "Show full step-by-step"}
              </button>

              {showAllSteps && (
                <div className="pt-3 border-t border-[#2b5346]/10 space-y-2">
                  {(
                    [
                      [
                        "a.",
                        <>
                          Open the <strong>Signup Flow Evaluation Dashboard</strong> using the
                          link above and sign in with your Fresh Prep Google account
                        </>,
                      ],
                      [
                        "b.",
                        <>
                          Set the date filter. Start before the event began and extend the end
                          date far enough to include later conversions — customers often pay
                          weeks after signing up
                        </>,
                      ],
                      [
                        "c.",
                        <>
                          Scroll to the <strong>Signup by Channel</strong> section and find its
                          <strong> Code Level Report</strong> table (columns include{" "}
                          <code>signup_code</code>, <code>channel_updated</code>,{" "}
                          <code>province</code>, <code>new_signup</code>)
                        </>,
                      ],
                      [
                        "d.",
                        <>
                          Hover it, click the <strong>three-dot menu (⋮)</strong>, then{" "}
                          <strong>Export → CSV</strong> — this is your signup-side file
                        </>,
                      ],
                      [
                        "e.",
                        <>
                          Scroll to the <strong>Paying Customer By Channel</strong> section and
                          find its own <strong>Code Level Report</strong> table (columns include{" "}
                          <code>code_used</code>, <code>channel_updated</code>,{" "}
                          <code>client_id</code>)
                        </>,
                      ],
                      [
                        "f.",
                        <>
                          Export that one the same way — this is your paying-side file. Export
                          the tables themselves, not the whole dashboard or a PDF
                        </>,
                      ],
                      [
                        "g.",
                        <>
                          Both files land in your <strong>Downloads</strong> folder. Return
                          here and drag <strong>both</strong> into the upload box below at
                          once (or click to browse and select both) — the app matches them up
                          by discount code automatically
                        </>,
                      ],
                      [
                        "h.",
                        <>
                          Have the old <strong>Client LTV</strong> table instead? Drop that
                          single file in on its own — it's still supported and includes LTV
                          data the new tables don't have
                        </>,
                      ],
                    ] as [string, React.ReactNode][]
                  ).map(([label, text]) => (
                    <div key={String(label)} className="flex items-start gap-2">
                      <span className="text-[#c9a000] font-bold font-mono text-[9.5px] shrink-0 mt-px">
                        {label}
                      </span>
                      <span className="text-[9.5px] font-mono text-[#3d3d3d] leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drop zone */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv,.tsv"
              multiple
              className="hidden"
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerBrowsingInput}
              className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer flex flex-col items-center justify-center min-h-[160px] transition-colors"
              style={{
                borderColor: isDragOver ? "#2b5346" : "#e5e5e5",
                backgroundColor: isDragOver ? "#eef4f1" : "#fafafa",
              }}
            >
              <FileSpreadsheet
                className="w-9 h-9 mb-3"
                style={{ color: isDragOver ? "#2b5346" : "#c0c0c0" }}
              />
              <p className="text-sm font-semibold text-[#1a1a1a]">Drop your data file(s) here</p>
              <p className="text-xs mt-1 font-medium text-[#2b5346]">or click to browse — select both files together</p>
              <p className="text-[10px] text-[#b5b5b5] mt-2 font-mono">CSV · XLSX · XLS · TSV</p>
            </div>
            <p className="text-[9px] text-[#b5b5b5] font-mono mt-2 text-center leading-relaxed">
              Column headers are auto-detected · your file never leaves the browser
            </p>
            {(state.loadedParts.signup || state.loadedParts.paying) && (
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {state.loadedParts.signup
                    ? <CheckCircle2 className="w-3 h-3 text-[#2b5346] shrink-0" />
                    : <XCircle className="w-3 h-3 text-[#cacaca] shrink-0" />}
                  <span className={state.loadedParts.signup ? "text-[#2b5346]" : "text-[#999]"}>
                    Signup-side Code Level Report{state.loadedParts.signup ? ` — ${state.loadedParts.signup}` : " — not loaded yet"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {state.loadedParts.paying
                    ? <CheckCircle2 className="w-3 h-3 text-[#2b5346] shrink-0" />
                    : <XCircle className="w-3 h-3 text-[#cacaca] shrink-0" />}
                  <span className={state.loadedParts.paying ? "text-[#2b5346]" : "text-[#999]"}>
                    Paying-side Code Level Report{state.loadedParts.paying ? ` — ${state.loadedParts.paying}` : " — not loaded yet"}
                  </span>
                </div>
                {!(state.loadedParts.signup && state.loadedParts.paying) && (
                  <p className="text-[9.5px] text-[#b08000] font-mono mt-0.5">
                    Drop the other file too — conversion needs both sides to be accurate.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 pt-1 pb-2">
            <img
              src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
              alt="FreshPrep"
              className="h-4 w-auto opacity-30"
              style={{ filter: "brightness(0)" }}
            />
            <span className="text-[9.5px] text-[#c0c0c0] font-mono uppercase tracking-widest">
              Campaign Intelligence · All analysis runs client-side
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function UploadFlow({
  state,
  actions,
  onBdOnly,
  autoOpenLooker = false,
}: UploadFlowProps): React.ReactElement {
  const [view, setView] = useState<"guide" | "upload">(
    autoOpenLooker ? "upload" : "guide"
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden" id="launch-screen">
      <BrandPanel />
      {view === "guide" ? (
        <GuideView onBdOnly={onBdOnly} onUpload={() => setView("upload")} />
      ) : (
        <UploadView state={state} actions={actions} onBack={() => setView("guide")} />
      )}
    </div>
  );
}
