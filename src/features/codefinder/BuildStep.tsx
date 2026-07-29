/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step 2 — turn fuzzy matches into a confirmed event↔codes mapping.
 *
 * The honest distinction this screen is built around:
 *
 *   • What a code IS FOR is a recorded fact when the BD wrap-up workbook names it.
 *     We can state that with certainty and say exactly where it came from.
 *   • Which event the USER MEANT is always a guess. That gets a confidence score and
 *     is never presented as fact.
 *
 * So candidates are tiered (strong / possible / long shot), each carries the reason
 * it surfaced, and anything we assumed rather than looked up is labelled as assumed.
 */
import React, { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, AlertCircle, X, Info, Plus, Trash2, Check,
  CalendarDays, Users, DollarSign, ShieldCheck, HelpCircle, Sparkles,
  ChevronDown, ChevronRight, Type, Hash,
} from "lucide-react";
import { EventSchedule } from "../../hooks/useEventSchedule";
import { EventNameQueryResult, EventNameGroup } from "../../utils/eventNameMatch";
import { EventGroup } from "../../utils/codeMetrics";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

// Calibrated against real queries: a genuine same-event-different-name match (e.g.
// "Calgary Reno Show" ↔ "Calgary Home and Reno Show") scores 98–100, while merely
// plausible neighbours ("Red Deer Home Show" ↔ "Red Deer Teachers Convention") land
// in the 60s–70s. 80 keeps the bulk-add action safe; everything below is a decision
// the user makes one at a time.
export const STRONG_SCORE = 80;
const POSSIBLE_SCORE = 50;

type Tier = "strong" | "possible" | "longshot";
function tierOf(score: number): Tier {
  if (score >= STRONG_SCORE) return "strong";
  if (score >= POSSIBLE_SCORE) return "possible";
  return "longshot";
}
const TIER_STYLE: Record<Tier, { label: string; color: string; bg: string; border: string }> = {
  strong:   { label: "Strong match",  color: "#2b5346", bg: "#eef4f1", border: "#cfe3db" },
  possible: { label: "Worth a check", color: "#8a6f00", bg: "#fdf8e1", border: "#f0dfa8" },
  longshot: { label: "Long shot",     color: "#8a8a84", bg: "#f5f5f3", border: "#e5e5e2" },
};

const VIA_TEXT: Record<EventNameGroup["matchedVia"], { icon: React.ReactNode; text: string }> = {
  name: { icon: <Type className="w-2.5 h-2.5" />, text: "matched the event name" },
  code: { icon: <Hash className="w-2.5 h-2.5" />, text: "matched keywords inside the code" },
  both: { icon: <Sparkles className="w-2.5 h-2.5" />, text: "name and code both match" },
};

/** Small ⓘ that reveals detail on hover/focus, so rows stay compact. */
function Hint({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-flex group/hint align-middle ${className}`}>
      <Info className="w-3 h-3 text-[#c0c0c0] group-hover/hint:text-[#2b5346] cursor-help transition-colors" tabIndex={0} />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1.5 w-60 -translate-x-1/2 rounded-lg bg-[#1c1c1c] px-3 py-2
                   text-[10px] leading-relaxed text-white/85 opacity-0 shadow-xl transition-opacity
                   group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function ConfidenceBadge({ score, via }: { score: number; via: EventNameGroup["matchedVia"] }) {
  const t = TIER_STYLE[tierOf(score)];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ color: t.color, backgroundColor: t.bg }}
      title={`${score}% confidence — ${VIA_TEXT[via].text}`}
    >
      {VIA_TEXT[via].icon}
      {t.label} · {score}%
    </span>
  );
}

interface BuildStepProps {
  groups: EventGroup[];
  results: EventNameQueryResult[];
  schedule: EventSchedule;
  unmatched: string[];
  undatedCodes: Set<string>;
  manualDates: Record<string, string>;
  onSetManualDate: (code: string, month: string) => void;
  onRemoveGroup: (id: string) => void;
  onRemoveCode: (groupId: string, code: string) => void;
  onAddCodeClick: (groupId: string) => void;
  onAddCodes: (groupId: string, codes: string[]) => void;
  /** code → the event that currently owns it. A code belongs to exactly one event. */
  claimedBy: Map<string, { id: string; name: string }>;
  onSwapAlternative: (groupId: string, alt: EventNameGroup) => void;
  onRename: (groupId: string, name: string) => void;
  onViewDetail: (code: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function BuildStep({
  groups, results, schedule, unmatched, undatedCodes, manualDates, onSetManualDate,
  onRemoveGroup, onRemoveCode, onAddCodeClick, onAddCodes, claimedBy, onSwapAlternative, onRename,
  onViewDetail, onContinue, onBack,
}: BuildStepProps): React.ReactElement {
  const [showLongshots, setShowLongshots] = useState<Record<string, boolean>>({});

  // Alternatives for a group = every candidate for that query except the adopted one.
  const altsByGroup = useMemo(() => {
    const map = new Map<string, EventNameGroup[]>();
    results.forEach((r, i) => map.set(`g${i}`, r.groups.slice(1)));
    return map;
  }, [results]);

  const totalCodes = groups.reduce((s, g) => s + g.codes.length, 0);

  // Every strong alternative not yet merged in — the "one click, done" path.
  // Anything already owned by another event is excluded: bulk-add should never
  // silently move codes between events. Those stay available as an explicit choice.
  const strongPending = useMemo(() => {
    const out: { groupId: string; alt: EventNameGroup }[] = [];
    for (const g of groups) {
      const inGroup = new Set(g.codes);
      for (const alt of altsByGroup.get(g.id) ?? []) {
        if (alt.score < STRONG_SCORE) continue;
        const addable = alt.codes.filter(c => !inGroup.has(c.code));
        if (addable.length === 0) continue;
        if (addable.some(c => claimedBy.has(c.code))) continue;
        out.push({ groupId: g.id, alt });
      }
    }
    return out;
  }, [groups, altsByGroup, claimedBy]);

  const addAllStrong = () => {
    for (const { groupId, alt } of strongPending) {
      onAddCodes(groupId, alt.codes.map(c => c.code));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-[#1a1a1a]">Confirm which codes belong to each event</h2>
          <p className="text-sm text-[#3d3d3d] leading-relaxed mt-1.5">
            We adopted the closest match for each name you typed. What a code is <em>for</em> is a recorded fact when the
            wrap-up workbook names it; which event <em>you meant</em> is our guess — so every candidate shows its
            confidence and why it surfaced.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#666] hover:text-[#1a1a1a] cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Edit list
          </button>
          <button
            onClick={onContinue}
            disabled={totalCodes === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2b5346] hover:bg-[#1a3d2f] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors"
          >
            Compare {groups.length} event{groups.length === 1 ? "" : "s"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk accept — the efficient path when the matcher got it right */}
      {strongPending.length > 0 && (
        <div className="rounded-xl border border-[#cfe3db] bg-[#eef4f1] px-4 py-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="w-4 h-4 text-[#2b5346] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-semibold text-[#2b5346]">
              {strongPending.length} more strong match{strongPending.length === 1 ? "" : "es"} available
            </p>
            <p className="text-[10px] font-mono text-[#2b5346]/70 mt-0.5">
              Scored {STRONG_SCORE}%+ — same event under a different name or year
            </p>
          </div>
          <button
            onClick={addAllStrong}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2b5346] hover:bg-[#1a3d2f] text-white font-semibold text-[11px] cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add all strong matches
          </button>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="rounded-xl border border-[#f0dfa8] bg-[#fdf8e1] px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="w-3.5 h-3.5 text-[#8a6f00] shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-[#8a6f00]">
              Nothing matched {unmatched.length} name{unmatched.length === 1 ? "" : "s"}
            </p>
            <p className="text-[10px] font-mono text-[#8a6f00]/80 mt-0.5">{unmatched.join(" · ")}</p>
            <p className="text-[10px] text-[#8a6f00]/80 mt-1">
              Try fewer words, or add the code by hand to any event below.
            </p>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e5e5] px-6 py-12 text-center">
          <p className="text-sm text-[#3d3d3d] font-semibold">No events assembled</p>
          <p className="text-xs text-[#a1a1a1] mt-1">Go back and try different or shorter event names.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(g => {
            const alts = altsByGroup.get(g.id) ?? [];
            const inGroup = new Set(g.codes);
            const shown = alts.filter(a => !a.codes.every(c => inGroup.has(c.code)));
            const strong = shown.filter(a => tierOf(a.score) === "strong");
            const possible = shown.filter(a => tierOf(a.score) === "possible");
            const longshots = shown.filter(a => tierOf(a.score) === "longshot");
            const openLong = showLongshots[g.id] ?? false;
            const assumedCount = g.codes.filter(c => !schedule[c]).length;

            return (
              <div key={g.id} className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm overflow-hidden">
                {/* Event header */}
                <div className="px-4 md:px-5 py-3 border-b border-[#f0f0ee] bg-[#fafafa] flex items-center gap-3">
                  <input
                    value={g.name}
                    onChange={e => onRename(g.id, e.target.value)}
                    className="flex-1 min-w-0 text-sm font-bold text-[#1a1a1a] bg-transparent outline-none focus:bg-white focus:px-2 focus:py-1 focus:rounded focus:border focus:border-[#2b5346] transition-all"
                    title="Rename this event"
                  />
                  {assumedCount > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#fdf8e1] text-[#8a6f00] shrink-0">
                      <HelpCircle className="w-2.5 h-2.5" />
                      {assumedCount} assumed
                      <Hint text="These codes aren't named in the BD wrap-up workbook, so nothing confirms which event they belong to. They were inferred from keywords in the code text — verify before relying on them." />
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-[#a1a1a1] shrink-0">
                    {g.codes.length} code{g.codes.length === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => onRemoveGroup(g.id)}
                    className="text-[#c0c0c0] hover:text-[#850b0b] cursor-pointer shrink-0"
                    title="Remove this event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Codes in this event */}
                <div className="divide-y divide-[#f7f7f6]">
                  {g.codes.map(code => {
                    const meta = schedule[code];
                    const confirmed = Boolean(meta);
                    return (
                      <div key={code} className="px-4 md:px-5 py-2.5 flex items-center gap-2.5 flex-wrap">
                        <span
                          className="shrink-0"
                          title={confirmed ? "Confirmed: named in the wrap-up workbook" : "Assumed: not in the workbook"}
                        >
                          {confirmed
                            ? <ShieldCheck className="w-3.5 h-3.5 text-[#2b5346]" />
                            : <HelpCircle className="w-3.5 h-3.5 text-[#c9a000]" />}
                        </span>
                        <span className="font-mono font-black text-[12px] text-[#0f0f0f] shrink-0">{code}</span>
                        {meta?.name && (
                          <span className="text-[10px] text-[#666] truncate max-w-[190px] shrink-0" title={meta.name}>
                            {meta.name}
                          </span>
                        )}
                        {meta?.province && (
                          <span
                            className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0"
                            style={{ color: provColor(meta.province), borderColor: provColor(meta.province) + "40", backgroundColor: provColor(meta.province) + "12" }}
                          >
                            {meta.province}
                          </span>
                        )}
                        {meta?.date && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-[#888] shrink-0">
                            <CalendarDays className="w-3 h-3" />{meta.date}
                          </span>
                        )}
                        {meta?.totalSpend != null && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-[#888] shrink-0">
                            <DollarSign className="w-3 h-3" />{meta.totalSpend.toLocaleString()}
                          </span>
                        )}
                        {!confirmed && (
                          <span className="flex items-center gap-1 text-[9px] font-mono text-[#c9a000] shrink-0">
                            assumed
                            <Hint text="This code isn't in the BD wrap-up workbook, so no record states what event it belongs to. It was matched on keywords in the code text alone." />
                          </span>
                        )}
                        {undatedCodes.has(code) && (
                          <label className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-mono text-[#c9a000] flex items-center gap-1">
                              set year
                              <Hint text="No usable date on file for this code, so it can't be placed on a year. Set one and it'll appear in the year-over-year comparison. Session only — nothing is written back." />
                            </span>
                            <input
                              type="month"
                              value={manualDates[code] ?? ""}
                              onChange={e => e.target.value && onSetManualDate(code, e.target.value)}
                              className="text-[10px] font-mono px-1.5 py-1 rounded border border-[#f0dfa8] bg-[#fdf8e1] text-[#1a1a1a] outline-none focus:border-[#2b5346] focus:bg-white w-[118px]"
                            />
                          </label>
                        )}
                        <div className="ml-auto flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onViewDetail(code)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[#a1a1a1] hover:text-[#2b5346] hover:bg-[#eef4f1] cursor-pointer transition-colors"
                            title="Everything known about this code, and where it came from"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveCode(g.id, code)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[#c8c8c8] hover:text-[#850b0b] hover:bg-[#fdf1ea] cursor-pointer transition-colors"
                            title="Remove from this event"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {g.codes.length === 0 && (
                    <p className="px-5 py-3 text-[11px] text-[#a1a1a1]">No codes — add one below, or remove this event.</p>
                  )}
                </div>

                {/* Candidates */}
                <div className="border-t border-[#f0f0ee] bg-[#fcfcfb] px-4 md:px-5 py-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onAddCodeClick(g.id)}
                      className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#2b5346] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add a code by hand
                    </button>
                    {shown.length > 0 && (
                      <>
                        <div className="h-3 w-px bg-[#e5e5e5]" />
                        <span className="text-[9px] font-mono text-[#a1a1a1] flex items-center gap-1">
                          other candidates for “{results[Number(g.id.slice(1))]?.query ?? g.name}”
                          <Hint text="Other events whose name or code resembled what you typed. Strong ones are probably the same event under a different name or year; long shots are usually wrong but shown in case the naming is inconsistent." />
                        </span>
                      </>
                    )}
                  </div>

                  {[...strong, ...possible].map(alt => {
                    const t = TIER_STYLE[tierOf(alt.score)];
                    const owners = Array.from(new Set(
                      alt.codes
                        .filter(c => !inGroup.has(c.code) && claimedBy.get(c.code) && claimedBy.get(c.code)!.id !== g.id)
                        .map(c => claimedBy.get(c.code)!.name),
                    ));
                    return (
                      <div
                        key={alt.name}
                        className="flex items-center gap-2.5 flex-wrap rounded-lg border px-3 py-2"
                        style={{ borderColor: t.border, background: "#fff" }}
                      >
                        <ConfidenceBadge score={alt.score} via={alt.matchedVia} />
                        <span className="text-[11.5px] font-semibold text-[#1a1a1a] min-w-0 truncate">{alt.name}</span>
                        <span className="text-[9.5px] font-mono text-[#a1a1a1] shrink-0">
                          {alt.codes.length} code{alt.codes.length === 1 ? "" : "s"} · {alt.codes.slice(0, 2).map(c => c.code).join(", ")}{alt.codes.length > 2 ? "…" : ""}
                        </span>
                        {owners.length > 0 && (
                          <span className="flex items-center gap-1 text-[9px] font-mono text-[#c9a000] shrink-0">
                            already in {owners.map(o => `“${o}”`).join(", ")}
                            <Hint text="A code can only belong to one event, so totals never double-count. Merging these in moves them out of that event." />
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onAddCodes(g.id, alt.codes.map(c => c.code))}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition-colors"
                            style={{ color: t.color, borderColor: t.border, background: t.bg }}
                            title={owners.length > 0 ? `Move these codes here from ${owners.join(", ")}` : "Add these codes into this event"}
                          >
                            <Plus className="w-2.5 h-2.5" /> {owners.length > 0 ? "Move here" : "Merge in"}
                          </button>
                          <button
                            onClick={() => onSwapAlternative(g.id, alt)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#888] border border-[#e5e5e5] bg-white hover:text-[#1a1a1a] hover:border-[#c0c0c0] cursor-pointer transition-colors"
                            title="Replace this event with that one"
                          >
                            Use instead
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {longshots.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowLongshots(p => ({ ...p, [g.id]: !openLong }))}
                        className="flex items-center gap-1 text-[9.5px] font-mono text-[#a1a1a1] hover:text-[#666] cursor-pointer"
                      >
                        {openLong ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {longshots.length} long shot{longshots.length === 1 ? "" : "s"} — probably not, but worth a glance
                        <Hint text="These scored below 50%. Usually a different event that happens to share a word, but occasionally the right one when an event was renamed between years." />
                      </button>
                      {openLong && (
                        <div className="flex flex-col gap-1.5 mt-2">
                          {longshots.map(alt => (
                            <div key={alt.name} className="flex items-center gap-2.5 flex-wrap rounded-lg border border-[#eeeeec] bg-white px-3 py-1.5">
                              <ConfidenceBadge score={alt.score} via={alt.matchedVia} />
                              <span className="text-[11px] text-[#666] min-w-0 truncate">{alt.name}</span>
                              <span className="text-[9px] font-mono text-[#c0c0c0] shrink-0">{alt.codes.length} code{alt.codes.length === 1 ? "" : "s"}</span>
                              <button
                                onClick={() => onAddCodes(g.id, alt.codes.map(c => c.code))}
                                className="ml-auto shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-semibold text-[#888] border border-[#e5e5e5] hover:text-[#2b5346] hover:border-[#2b5346] cursor-pointer transition-colors"
                              >
                                <Plus className="w-2.5 h-2.5" /> Merge in
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[9.5px] font-mono text-[#a1a1a1] px-1">
        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-[#2b5346]" /> confirmed by the wrap-up workbook</span>
        <span className="flex items-center gap-1.5"><HelpCircle className="w-3 h-3 text-[#c9a000]" /> assumed from the code text</span>
        <span className="flex items-center gap-1.5"><Type className="w-3 h-3" /> name match</span>
        <span className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> code-keyword match</span>
        <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> both agree</span>
      </div>
    </div>
  );
}
