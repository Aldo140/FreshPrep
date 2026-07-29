/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Code Finder — turns "which events should we go back to next year?" into an
 * answerable question.
 *
 * The BD team books events (trade shows, marathons, expos) a year ahead, and each
 * event issues a discount code. The codes are cryptic (EVIBYYCMARATHON6) while the
 * team thinks in event names ("Calgary Marathon"), and a recurring event gets a new
 * code every year — so the year-over-year history that should drive the rebooking
 * decision is scattered across codes nobody can recall. This tool goes name →
 * codes → assembled multi-year history → printable comparison.
 *
 * Three steps, because the middle one is where the real work is: fuzzy matching
 * gets close but is never perfectly right, so the user confirms and repairs the
 * event↔codes mapping before any numbers get presented as fact.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Search, CalendarDays, MapPin, Users, DollarSign,
  AlertCircle, X, Info, Plus, Trash2, Check, RefreshCw, Sparkles, TrendingUp,
} from "lucide-react";
import { useEventSchedule } from "../../hooks/useEventSchedule";
import { useStaticSignups } from "../../hooks/useStaticSignups";
import { useLookerCodeTotals } from "../../hooks/useLookerCodeTotals";
import { deriveEventStatsForCodes } from "../../hooks/useCustomerData";
import { matchEventNames, EventNameQueryResult, EventNameGroup } from "../../utils/eventNameMatch";
import { EventGroup } from "../../utils/codeMetrics";
import { parseSpreadsheetFile } from "../../utils/fileParser";
import {
  loadPayingSnapshot, savePayingSnapshot, buildPayingSnapshot, clearPayingSnapshot,
  PayingDataSnapshot,
} from "../../utils/payingDataBridge";
import {
  loadLtvSnapshot, saveLtvSnapshot, buildLtvSnapshot, clearLtvSnapshot, LtvSnapshot,
} from "../../utils/ltvDataBridge";
import { generateCodeFinderPrintHtml } from "../../utils/codeFinderPrint";
import { CodeDetailModal } from "./CodeDetailModal";
import { AddCodeDialog, buildCodeUniverse } from "./AddCodeDialog";
import { ComparisonReport, buildGroupReports } from "./ComparisonReport";
import { BuildStep } from "./BuildStep";

const FP_LOGO = "https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

const PLACEHOLDER = `Calgary Reno Show
Edmonton Spring Show
National Womens Expo
Calgary Marathon`;

type Step = "find" | "build" | "report";

/** Shared styles for the SVG charts rendered via dangerouslySetInnerHTML. */
const CHART_CSS = `
.cf-svg-wrap svg { display:block; width:100%; height:auto; }
.cf-legend { display:flex; gap:14px; flex-wrap:wrap; padding-top:4px; }
.cf-legend-item { display:inline-flex; align-items:center; gap:5px; font-size:9px;
  font-family:'DM Mono',monospace; color:#8a8a84; }
.cf-swatch { width:9px; height:9px; border-radius:2px; display:inline-block; flex-shrink:0; }
`;

// ── Step indicator ───────────────────────────────────────────────────────────

function StepNav({ step, canBuild, canReport, onGo }: {
  step: Step;
  canBuild: boolean;
  canReport: boolean;
  onGo: (s: Step) => void;
}) {
  const items: { id: Step; label: string; enabled: boolean }[] = [
    { id: "find", label: "Find", enabled: true },
    { id: "build", label: "Build events", enabled: canBuild },
    { id: "report", label: "Compare", enabled: canReport },
  ];
  const activeIdx = items.findIndex(i => i.id === step);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((it, i) => {
        const isActive = it.id === step;
        const isDone = i < activeIdx;
        return (
          <React.Fragment key={it.id}>
            {i > 0 && <div className="w-5 h-px bg-[#e0e0dc]" />}
            <button
              onClick={() => it.enabled && onGo(it.id)}
              disabled={!it.enabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                it.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-40"
              }`}
              style={
                isActive
                  ? { backgroundColor: "#2b5346", color: "#fff" }
                  : isDone
                    ? { backgroundColor: "#eef4f1", color: "#2b5346" }
                    : { backgroundColor: "#f5f5f3", color: "#a1a1a1" }
              }
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                style={{ backgroundColor: isActive ? "rgba(255,255,255,0.2)" : isDone ? "#2b5346" : "#e0e0dc", color: isDone ? "#fff" : undefined }}
              >
                {isDone ? <Check className="w-2.5 h-2.5" /> : i + 1}
              </span>
              {it.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Step 1: Find ─────────────────────────────────────────────────────────────

function FindStep({ input, setInput, onFind, scheduleSize, hasResults, onContinue }: {
  input: string;
  setInput: (v: string) => void;
  onFind: () => void;
  scheduleSize: number;
  hasResults: boolean;
  onContinue: () => void;
}) {
  const lines = input.split("\n").map(l => l.trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Which events are you looking at?</h2>
        <p className="text-sm text-[#3d3d3d] leading-relaxed mt-1.5 max-w-2xl">
          List them one per line — event names, not codes, and spelling doesn't need to be exact.
          We'll match each one to its discount codes across every year it ran, so you can see how
          it's trending before you rebook.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm p-4 md:p-5 flex flex-col gap-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={7}
          className="w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm font-mono text-[#1a1a1a] outline-none focus:border-[#2b5346] focus:bg-white resize-y"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-mono text-[#a1a1a1]">
            {lines.length} event{lines.length === 1 ? "" : "s"} · searching {scheduleSize.toLocaleString()} known events
          </p>
          <div className="flex items-center gap-2">
            {hasResults && (
              <button
                onClick={onContinue}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#d0e8e2] bg-white text-[#2b5346] font-semibold text-xs cursor-pointer hover:bg-[#eef4f1] transition-colors"
              >
                Keep current results
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onFind}
              disabled={scheduleSize === 0 || lines.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2b5346] hover:bg-[#1a3d2f] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Find matching codes
            </button>
          </div>
        </div>
        {scheduleSize === 0 && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#c9a000]">
            <AlertCircle className="w-3 h-3 shrink-0" /> Loading event schedule…
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CodeFinderPage(): React.ReactElement {
  const schedule = useEventSchedule();
  const staticSignups = useStaticSignups();
  const bundledTotals = useLookerCodeTotals();

  const [step, setStep] = useState<Step>("find");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<EventNameQueryResult[]>([]);
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [addCodeFor, setAddCodeFor] = useState<string | null>(null);
  // Codes whose wrap-up date cell is missing or unparseable — the user can supply a
  // month so the code lands on the right year instead of an "unknown" bucket.
  // Session-only; never written back to any data file.
  const [manualDates, setManualDates] = useState<Record<string, string>>({});
  // Confirmed Paying Customers from a Looker paying-side export. Picked up from the
  // main app's upload if one happened in this browser, or loaded here directly.
  const [payingSnapshot, setPayingSnapshot] = useState<PayingDataSnapshot | null>(null);
  const [payingLoadError, setPayingLoadError] = useState<string | null>(null);
  // LTV has no bundled source — the current Looker exports carry only counts and the
  // wrap-up workbook's LTV columns aren't trusted. A Client LTV export fills it in.
  const [ltvSnapshot, setLtvSnapshot] = useState<LtvSnapshot | null>(null);
  const [ltvLoadError, setLtvLoadError] = useState<string | null>(null);

  useEffect(() => { staticSignups.load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPayingSnapshot(loadPayingSnapshot()); setLtvSnapshot(loadLtvSnapshot()); }, []);

  const handleLtvFile = async (file: File) => {
    setLtvLoadError(null);
    try {
      const result = await parseSpreadsheetFile(file);
      const snap = buildLtvSnapshot(result.dbRows, file.name);
      if (snap.codeCount === 0) {
        setLtvLoadError(
          "No LTV values found for BD or Events codes in that file. A Client LTV export has " +
          "Avg/Sum LTV 3, 6 and 12 columns — the newer Code Level Reports don't carry LTV at all.",
        );
        return;
      }
      saveLtvSnapshot(snap);
      setLtvSnapshot(snap);
    } catch (err) {
      setLtvLoadError(err instanceof Error ? err.message : "Could not read that file.");
    }
  };

  const handlePayingFile = async (file: File) => {
    setPayingLoadError(null);
    try {
      const result = await parseSpreadsheetFile(file);
      if (result.validation.reportKind !== "paying") {
        setPayingLoadError(
          `That looks like a ${result.validation.reportKind === "signup" ? "signup-side" : "Client LTV / wrap-up"} file. ` +
          `Load the Code Level Report from the "Paying Customer By Channel" section (it has a code_used column).`,
        );
        return;
      }
      const snap = buildPayingSnapshot(result.dbRows, file.name);
      if (snap.codeCount === 0) {
        setPayingLoadError("No BD or Events codes with paying customers were found in that file.");
        return;
      }
      savePayingSnapshot(snap);
      setPayingSnapshot(snap);
    } catch (err) {
      setPayingLoadError(err instanceof Error ? err.message : "Could not read that file.");
    }
  };

  const scheduleSize = Object.keys(schedule).length;

  const dbBdCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of staticSignups.rows) {
      const c = r.discount_code?.trim().toUpperCase();
      if (!c) continue;
      const ch = r.channel?.replace(/[\s_-]/g, "").toLowerCase() ?? "";
      if (c.startsWith("EV") || c.startsWith("BD") || ch === "businessdevelopment") set.add(c);
    }
    return Array.from(set);
  }, [staticSignups.rows]);

  const universe = useMemo(() => buildCodeUniverse(schedule, dbBdCodes), [schedule, dbBdCodes]);

  const handleFind = () => {
    const queries = input.split("\n").map(l => l.trim()).filter(Boolean);
    if (queries.length === 0) return;
    const res = matchEventNames(queries, schedule);
    setResults(res);
    // Auto-adopt the top match per query — the user refines rather than assembles.
    // A code belongs to exactly one event: two queries can resolve to overlapping
    // code sets (searching both "Calgary Marathon" and "Servus" hits EVSERVUS), and
    // double-counting a code would inflate every total downstream. First claim wins.
    const claimed = new Set<string>();
    setGroups(
      res
        .map((r, i): EventGroup | null => {
          const best = r.groups[0];
          if (!best) return null;
          const codes = best.codes.map(c => c.code).filter(c => !claimed.has(c));
          codes.forEach(c => claimed.add(c));
          return { id: `g${i}`, name: best.name, codes };
        })
        .filter((g): g is EventGroup => g !== null),
    );
    setStep("build");
  };

  /**
   * Adds codes to one event and strips them from every other — the single place
   * membership changes, so exclusivity can't be bypassed. Moving a code is treated
   * as the user's intent rather than an error.
   */
  const addCodesExclusive = (groupId: string, codes: string[]) => {
    const incoming = new Set(codes);
    setGroups(gs => gs.map(g =>
      g.id === groupId
        ? { ...g, codes: Array.from(new Set([...g.codes, ...codes])) }
        : { ...g, codes: g.codes.filter(c => !incoming.has(c)) },
    ));
  };

  const unmatched = useMemo(
    () => results.filter(r => r.groups.length === 0).map(r => r.query),
    [results],
  );

  const allSelectedCodes = useMemo(
    () => Array.from(new Set(groups.flatMap(g => g.codes))),
    [groups],
  );

  /** code → the event that currently owns it. Drives the "already in X" warnings. */
  const claimedBy = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const g of groups) {
      for (const c of g.codes) if (!m.has(c)) m.set(c, { id: g.id, name: g.name });
    }
    return m;
  }, [groups]);

  const dbStats = useMemo(
    () => deriveEventStatsForCodes(staticSignups.rows, new Set(allSelectedCodes)),
    [staticSignups.rows, allSelectedCodes],
  );

  // Bundled Looker paying data is the baseline; a user's own upload is fresher, so
  // it layers on top and wins per-code.
  const effectiveTotals = useMemo(() => {
    const out: Record<string, { signups?: number | null; paying?: number | null }> =
      { ...(bundledTotals.data?.byCode ?? {}) };
    // A user's own paying-side upload is fresher, so it overrides paying per code
    // while leaving the bundled signup denominator intact.
    for (const [code, paying] of Object.entries(payingSnapshot?.byCode ?? {})) {
      out[code] = { ...(out[code] ?? {}), paying };
    }
    return out;
  }, [bundledTotals.data, payingSnapshot]);

  const reports = useMemo(
    () => buildGroupReports(groups, schedule, dbStats, manualDates, effectiveTotals, ltvSnapshot?.byCode ?? {}),
    [groups, schedule, dbStats, manualDates, effectiveTotals, ltvSnapshot],
  );

  // Which selected codes still have no year after every source (and any manual
  // entry) is applied — these are the ones BuildStep offers a date input for.
  const undatedCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of reports) {
      for (const e of r.entries) if (e.year == null) set.add(e.code);
    }
    return set;
  }, [reports]);

  const detailDbStat = useMemo(() => {
    if (!detailCode) return null;
    return deriveEventStatsForCodes(staticSignups.rows, new Set([detailCode]))[0] ?? null;
  }, [detailCode, staticSignups.rows]);

  const handlePrint = () => {
    const html = generateCodeFinderPrintHtml(reports, "BD Event Comparison", "");
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch { /* popup closed or blocked */ } }, 1100);
  };

  const backHref = import.meta.env.BASE_URL || "/";
  const activeGroup = groups.find(g => g.id === addCodeFor) ?? null;

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <style>{CHART_CSS}</style>

      {/* Branded header */}
      <header className="bg-white border-b border-[#e5e5e5] px-4 md:px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <a
            href={backHref}
            className="shrink-0 flex items-center gap-1.5 text-xs text-[#666] font-medium hover:text-[#1a1a1a] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </a>
          <div className="h-4 w-px bg-[#e5e5e5]" />
          <img src={FP_LOGO} alt="FreshPrep" className="h-4 w-auto opacity-80 shrink-0" style={{ filter: "brightness(0)" }} />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-[#1a1a1a]">Code Finder</span>
            <span className="hidden sm:inline text-[8.5px] font-mono uppercase tracking-[0.18em] text-[#a1a1a1]">
              Event history &amp; rebooking
            </span>
          </div>
          <div className="ml-auto">
            <StepNav
              step={step}
              canBuild={groups.length > 0 || results.length > 0}
              canReport={allSelectedCodes.length > 0}
              onGo={setStep}
            />
          </div>
        </div>
      </header>

      {/* Paying-data source bar — makes it obvious whether numbers are the real
          Looker Customers figure or the DB's high-reading funnel-step fallback. */}
      {(() => {
        const codeCount = Object.keys(effectiveTotals).length;
        const hasAny = codeCount > 0;
        return (
          <div className={`border-b px-4 md:px-6 py-2 ${hasAny ? "bg-[#eef4f1] border-[#cfe3db]" : "bg-[#fdf8e1] border-[#f0dfa8]"}`}>
            <div className="max-w-6xl mx-auto flex items-center gap-2.5 flex-wrap">
              {hasAny ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2b5346] shrink-0" />
                  <span className="text-[10.5px] font-semibold text-[#2b5346]">
                    Confirmed Paying Customers (revenue &gt; $49)
                  </span>
                  <span className="text-[9.5px] font-mono text-[#2b5346]/60">
                    {payingSnapshot
                      ? `your upload · ${payingSnapshot.fileName}`
                      : `built in · ${bundledTotals.data?.payingSource ?? "Looker export"}`}
                    {" · "}{codeCount.toLocaleString()} codes
                  </span>
                  <div className="ml-auto flex items-center gap-3 shrink-0">
                    {payingSnapshot && (
                      <button
                        onClick={() => { clearPayingSnapshot(); setPayingSnapshot(null); }}
                        className="text-[9.5px] font-mono text-[#2b5346]/60 hover:text-[#850b0b] cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> use built-in
                      </button>
                    )}
                    <label className="flex items-center gap-1.5 text-[9.5px] font-mono text-[#2b5346]/70 hover:text-[#2b5346] cursor-pointer">
                      <Plus className="w-3 h-3" /> load newer export
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.tsv"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePayingFile(f); e.target.value = ""; }}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-[#8a6f00] shrink-0" />
                  <span className="text-[10.5px] font-semibold text-[#8a6f00]">
                    {bundledTotals.loading ? "Loading Looker totals…" : "No Looker data available"}
                  </span>
                  <span className="text-[9.5px] font-mono text-[#8a6f00]/75">
                    Conversion falls back to the signup DB's funnel-step count, which reads high (marked ≈)
                  </span>
                  <label className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border bg-white text-[#8a6f00] border-[#f0dfa8] hover:bg-[#fdf4d4] transition-colors">
                    <Plus className="w-3 h-3" />
                    Load paying-side CSV
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.tsv"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePayingFile(f); e.target.value = ""; }}
                    />
                  </label>
                </>
              )}
            </div>
            {payingLoadError && (
              <p className="max-w-6xl mx-auto text-[9.5px] font-mono text-[#850b0b] mt-1.5">{payingLoadError}</p>
            )}

            {/* LTV — no bundled source exists, so it's always opt-in */}
            <div className="max-w-6xl mx-auto flex items-center gap-2.5 flex-wrap mt-1.5 pt-1.5 border-t border-black/5">
              {ltvSnapshot ? (
                <>
                  <Check className="w-3 h-3 text-[#2b5346] shrink-0" />
                  <span className="text-[10px] font-semibold text-[#2b5346]">LTV loaded</span>
                  <span className="text-[9.5px] font-mono text-[#2b5346]/60">
                    {ltvSnapshot.fileName} · {ltvSnapshot.codeCount.toLocaleString()} codes
                  </span>
                  <button
                    onClick={() => { clearLtvSnapshot(); setLtvSnapshot(null); }}
                    className="ml-auto text-[9.5px] font-mono text-[#2b5346]/60 hover:text-[#850b0b] cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <X className="w-3 h-3" /> clear LTV
                  </button>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3 text-[#8a8a84] shrink-0" />
                  <span className="text-[10px] font-semibold text-[#6a6a64]">No LTV data</span>
                  <span className="text-[9.5px] font-mono text-[#a1a1a1]">
                    Current Looker exports carry no LTV, and the wrap-up sheet's columns aren't used — load a Client LTV export to add it
                  </span>
                  <label className="ml-auto shrink-0 flex items-center gap-1.5 text-[9.5px] font-mono text-[#2b5346] hover:underline cursor-pointer">
                    <Plus className="w-3 h-3" /> Load Client LTV export
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.tsv"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLtvFile(f); e.target.value = ""; }}
                    />
                  </label>
                </>
              )}
            </div>
            {ltvLoadError && (
              <p className="max-w-6xl mx-auto text-[9.5px] font-mono text-[#850b0b] mt-1.5">{ltvLoadError}</p>
            )}
          </div>
        );
      })()}

      <main className="flex-1 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          {step === "find" && (
            <FindStep
              input={input}
              setInput={setInput}
              onFind={handleFind}
              scheduleSize={scheduleSize}
              hasResults={groups.length > 0}
              onContinue={() => setStep("build")}
            />
          )}

          {step === "build" && (
            <BuildStep
              groups={groups}
              results={results}
              schedule={schedule}
              unmatched={unmatched}
              undatedCodes={undatedCodes}
              manualDates={manualDates}
              onSetManualDate={(code, month) => setManualDates(prev => ({ ...prev, [code]: month }))}
              onRemoveGroup={id => setGroups(gs => gs.filter(g => g.id !== id))}
              onRemoveCode={(gid, code) =>
                setGroups(gs => gs.map(g => g.id === gid ? { ...g, codes: g.codes.filter(c => c !== code) } : g))
              }
              onAddCodeClick={setAddCodeFor}
              onAddCodes={addCodesExclusive}
              claimedBy={claimedBy}
              onSwapAlternative={(gid, alt) => {
                const incoming = new Set(alt.codes.map(c => c.code));
                setGroups(gs => gs.map(g =>
                  g.id === gid
                    ? { ...g, name: alt.name, codes: alt.codes.map(c => c.code) }
                    : { ...g, codes: g.codes.filter(c => !incoming.has(c)) },
                ));
              }}
              onRename={(gid, name) => setGroups(gs => gs.map(g => g.id === gid ? { ...g, name } : g))}
              onViewDetail={setDetailCode}
              onContinue={() => setStep("report")}
              onBack={() => setStep("find")}
            />
          )}

          {step === "report" && (
            <ComparisonReport
              reports={reports}
              onBack={() => setStep("build")}
              onPrint={handlePrint}
              onViewDetail={setDetailCode}
              loading={staticSignups.loading}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-[#e5e5e5] px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2">
          <MapPin className="w-3 h-3 text-[#c0c0c0]" />
          <span className="text-[10px] text-[#a1a1a1] font-mono">
            Matches the bundled BD event wrap-up schedule · runs entirely in your browser
          </span>
        </div>
      </footer>

      {detailCode && (
        <CodeDetailModal
          code={detailCode}
          schedule={schedule}
          dbStat={detailDbStat}
          dbLoading={staticSignups.loading}
          ltv={ltvSnapshot?.byCode[detailCode] ?? null}
          payingFromLooker={effectiveTotals[detailCode]?.paying ?? null}
          onClose={() => setDetailCode(null)}
        />
      )}

      {activeGroup && (
        <AddCodeDialog
          eventName={activeGroup.name}
          universe={universe}
          alreadyInEvent={new Set(activeGroup.codes)}
          claimedBy={claimedBy}
          onAdd={code => addCodesExclusive(activeGroup.id, [code])}
          onClose={() => setAddCodeFor(null)}
        />
      )}
    </div>
  );
}
