/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Next-move briefing (rendered inside the Channel Intelligence tab).
 *
 * Sorts every matched code into one of four decisions using two data-derived
 * dividers — the portfolio's blended conversion and the median event size — then
 * says plainly what to do with each group. No LTV, no revenue, no invented
 * benchmarks: every number on screen comes from the codes in the upload.
 */

import React, { useMemo, useState } from "react";
import { KPIReportSummary, AnalyzedCodeReport, ChannelSummary } from "../../../types";
import { ArrowUpRight, ClipboardList, Droplets, Scissors, Ticket } from "lucide-react";

interface PortfolioSummaryWidgetProps {
  summary: KPIReportSummary;
  reports: AnalyzedCodeReport[];
  channels: ChannelSummary[];
}

type SegmentId = "scale" | "leaky" | "underbooked" | "review";

const SEGMENT_STYLE: Record<SegmentId, { ink: string; wash: string; edge: string }> = {
  scale:       { ink: "#2b5346", wash: "#eef4f1", edge: "rgba(43,83,70,0.22)" },
  leaky:       { ink: "#c87a3c", wash: "#fbf3ec", edge: "rgba(200,122,60,0.24)" },
  underbooked: { ink: "#8a6f00", wash: "#fdf8e1", edge: "rgba(231,189,39,0.34)" },
  review:      { ink: "#7a7a7a", wash: "#f5f5f3", edge: "rgba(122,122,122,0.20)" },
};

function prettyChannel(name: string): string {
  return (name || "Direct / Unknown").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function PortfolioSummaryWidget({ summary, reports, channels }: PortfolioSummaryWidgetProps) {
  const [selected, setSelected] = useState<"portfolio" | SegmentId>("portfolio");

  const model = useMemo(() => {
    if (reports.length === 0) return null;

    const convLine = summary.blendedConversionRate;
    const volLine  = median(reports.map(r => r.Signups));

    const buckets: Record<SegmentId, AnalyzedCodeReport[]> = { scale: [], leaky: [], underbooked: [], review: [] };
    for (const r of reports) {
      const hiConv = r.calculatedConversion >= convLine;
      const hiVol  = r.Signups >= volLine;
      if (hiConv && hiVol) buckets.scale.push(r);
      else if (!hiConv && hiVol) buckets.leaky.push(r);
      else if (hiConv && !hiVol) buckets.underbooked.push(r);
      else buckets.review.push(r);
    }
    buckets.scale.sort((a, b) => b["Paying cx"] - a["Paying cx"]);
    buckets.leaky.sort((a, b) => b.Signups - a.Signups);
    buckets.underbooked.sort((a, b) => b.calculatedConversion - a.calculatedConversion);
    buckets.review.sort((a, b) => a.calculatedConversion - b.calculatedConversion);

    // Channel spread: how far apart the best and worst closers are, ignoring tiny channels.
    const totalSignups = channels.reduce((s, c) => s + c.totalSignups, 0) || summary.totalSignups;
    const ranked = channels
      .filter(c => c.totalSignups >= Math.max(20, totalSignups * 0.05))
      .map(c => ({ channel: c.channel, yield: c.totalSignups > 0 ? (c.totalPayingCustomers / c.totalSignups) * 100 : 0, signups: c.totalSignups }))
      .sort((a, b) => b.yield - a.yield);

    // Concentration: how much of the result rides on the three biggest codes.
    const byPaying = [...reports].sort((a, b) => b["Paying cx"] - a["Paying cx"]);
    const top3 = byPaying.slice(0, 3).reduce((s, r) => s + r["Paying cx"], 0);
    const top3Share = summary.totalPayingCustomers > 0 ? (top3 / summary.totalPayingCustomers) * 100 : 0;

    // Signups sitting in codes that convert below blended — the recoverable pool.
    const leakySignups = [...buckets.leaky, ...buckets.review].reduce((s, r) => s + r.Signups, 0);
    const recoverable = Math.round(leakySignups * (convLine / 100)
      - [...buckets.leaky, ...buckets.review].reduce((s, r) => s + r["Paying cx"], 0));

    return {
      convLine, volLine, buckets, ranked,
      best: ranked[0] ?? null,
      worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
      top3Share,
      recoverable: Math.max(recoverable, 0),
    };
  }, [reports, channels, summary]);

  if (!model) {
    return (
      <div className="p-6 rounded-xl md:rounded-2xl border border-dashed border-[#d8ddda] bg-white text-center">
        <p className="text-sm font-semibold text-[#1a1a1a]">Nothing to brief yet</p>
        <p className="text-[12px] text-[#a1a1a1] mt-1.5 max-w-[320px] mx-auto leading-relaxed">
          Match at least one promo code against the active database to see which events to rebook and which to fix.
        </p>
      </div>
    );
  }

  const { convLine, volLine, buckets, best, worst, top3Share, recoverable } = model;

  const tabs = [
    { id: "portfolio"   as const, label: "Portfolio",  icon: ClipboardList, count: reports.length },
    { id: "scale"       as const, label: "Scale",      icon: ArrowUpRight,  count: buckets.scale.length },
    { id: "leaky"       as const, label: "Fix funnel", icon: Droplets,      count: buckets.leaky.length },
    { id: "underbooked" as const, label: "Under-booked", icon: Ticket,      count: buckets.underbooked.length },
    { id: "review"      as const, label: "Review",     icon: Scissors,      count: buckets.review.length },
  ];

  const COPY: Record<SegmentId, { headline: string; rule: string; action: string }> = {
    scale: {
      headline: "Proven at real volume",
      rule: `Converts at or above ${convLine.toFixed(1)}% and drew at least ${Math.round(volLine)} signups.`,
      action: "Rebook these first. They are the only group where a bigger booth pays for itself twice over.",
    },
    leaky: {
      headline: "Reach is fine, the close isn't",
      rule: `Drew at least ${Math.round(volLine)} signups but converts below ${convLine.toFixed(1)}%.`,
      action: "The venue is working, the follow-up isn't. Audit the offer and the first-week nudge before dropping the event.",
    },
    underbooked: {
      headline: "Closes well, too small a room",
      rule: `Converts at or above ${convLine.toFixed(1)}% on fewer than ${Math.round(volLine)} signups.`,
      action: "Cheapest upside on the board. Take a bigger footprint or add a second date at the same venue.",
    },
    review: {
      headline: "Below the line on both counts",
      rule: `Under ${Math.round(volLine)} signups and under ${convLine.toFixed(1)}% conversion.`,
      action: "Lowest return per hour staffed. Redesign the pitch or hand the slot to a waitlisted event.",
    },
  };

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-5 pt-4 pb-3 border-b border-[#f0f0f0]">
        <h3 className="text-[13px] font-bold text-[#1a1a1a] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2b5346] shrink-0" />
          Next-move briefing
        </h3>
        <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">
          Split at blended {convLine.toFixed(1)}% conversion · median {Math.round(volLine)} signups
        </p>
      </div>

      {/* Tab rail */}
      <div className="px-2 md:px-3 pt-2.5 pb-2.5 border-b border-[#f0f0f0] overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = selected === t.id;
            const ink = t.id === "portfolio" ? "#2b5346" : SEGMENT_STYLE[t.id].ink;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2b5346]/30"
                style={{
                  backgroundColor: active ? ink + "14" : "transparent",
                  color: active ? ink : "#9a9a9a",
                  border: `1px solid ${active ? ink + "33" : "transparent"}`,
                }}
              >
                <Icon className="w-3 h-3" style={{ color: active ? ink : "#c0c0c0" }} />
                {t.label}
                <span className="font-mono text-[9.5px] opacity-60">{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels */}
      <div className="p-4 md:p-5">
        {selected === "portfolio" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "Codes",     val: reports.length.toLocaleString() },
                { label: "Signups",   val: summary.totalSignups.toLocaleString() },
                { label: "Paying cx", val: summary.totalPayingCustomers.toLocaleString() },
                { label: "Blended",   val: `${summary.blendedConversionRate.toFixed(1)}%` },
              ].map(m => (
                <div key={m.label} className="rounded-lg border border-[#eeeeec] bg-[#fcfcfb] px-3 py-2.5">
                  <p className="text-[8.5px] font-mono uppercase tracking-widest text-[#b0b0b0] mb-1">{m.label}</p>
                  <p className="text-[15px] font-black font-mono text-[#1a1a1a] leading-none">{m.val}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 text-[12px] text-[#4a4a4a] leading-relaxed">
              {best && (
                <p>
                  <strong className="font-semibold text-[#1a1a1a]">{prettyChannel(best.channel)}</strong> is the strongest closer at
                  {" "}<strong className="font-mono text-[#2b5346]">{best.yield.toFixed(1)}%</strong> across {best.signups.toLocaleString()} signups
                  {worst && worst.channel !== best.channel && (
                    <> — {(best.yield - worst.yield).toFixed(1)} points ahead of {prettyChannel(worst.channel)} at <span className="font-mono">{worst.yield.toFixed(1)}%</span>.</>
                  )}
                  {(!worst || worst.channel === best.channel) && <> across the channels with enough volume to compare.</>}
                </p>
              )}
              <p>
                The three biggest codes carry <strong className="font-mono text-[#1a1a1a]">{top3Share.toFixed(0)}%</strong> of all paying customers
                {top3Share >= 60 ? " — the portfolio is leaning hard on a few events." : " — the result is spread across the calendar."}
              </p>
              {recoverable > 0 && (
                <p>
                  Lifting every below-average code up to the blended rate would add about
                  {" "}<strong className="font-mono text-[#2b5346]">{recoverable.toLocaleString()}</strong> more paying customers from signups already collected.
                </p>
              )}
            </div>

            <div className="flex gap-1.5 h-2 rounded-full overflow-hidden">
              {(["scale", "leaky", "underbooked", "review"] as SegmentId[]).map(id => {
                const pct = (buckets[id].length / reports.length) * 100;
                if (pct === 0) return null;
                return <div key={id} style={{ width: `${pct}%`, backgroundColor: SEGMENT_STYLE[id].ink }} className="rounded-full" />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 -mt-2">
              {(["scale", "leaky", "underbooked", "review"] as SegmentId[]).map(id => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className="flex items-center gap-1.5 text-[10px] font-mono cursor-pointer hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2b5346]/30 rounded"
                  style={{ color: SEGMENT_STYLE[id].ink }}
                >
                  <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: SEGMENT_STYLE[id].ink }} />
                  {tabs.find(t => t.id === id)?.label} {buckets[id].length}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected !== "portfolio" && (() => {
          const id = selected;
          const style = SEGMENT_STYLE[id];
          const copy = COPY[id];
          const list = buckets[id];
          const groupSignups = list.reduce((s, r) => s + r.Signups, 0);
          const groupPaying  = list.reduce((s, r) => s + r["Paying cx"], 0);
          const groupYield   = groupSignups > 0 ? (groupPaying / groupSignups) * 100 : 0;
          const maxSignups   = Math.max(...list.map(r => r.Signups), 1);

          if (list.length === 0) {
            return (
              <div className="rounded-lg border border-dashed border-[#e2e2e0] px-4 py-6 text-center">
                <p className="text-[12px] text-[#8a8a8a]">No codes landed in this group.</p>
                <p className="text-[11px] text-[#b8b8b8] mt-1">{copy.rule}</p>
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-3.5">
              <div className="rounded-xl px-4 py-3.5" style={{ backgroundColor: style.wash, border: `1px solid ${style.edge}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: style.ink }}>{copy.headline}</p>
                    <p className="text-[10.5px] font-mono mt-1" style={{ color: style.ink, opacity: 0.65 }}>{copy.rule}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[19px] font-black font-mono leading-none" style={{ color: style.ink }}>{list.length}</p>
                    <p className="text-[8.5px] font-mono uppercase tracking-widest mt-1" style={{ color: style.ink, opacity: 0.55 }}>codes</p>
                  </div>
                </div>
                <div className="flex gap-5 mt-3 pt-3" style={{ borderTop: `1px solid ${style.edge}` }}>
                  {[
                    { label: "Signups", val: groupSignups.toLocaleString() },
                    { label: "Paying",  val: groupPaying.toLocaleString() },
                    { label: "Yield",   val: `${groupYield.toFixed(1)}%` },
                  ].map(m => (
                    <div key={m.label}>
                      <p className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: style.ink, opacity: 0.5 }}>{m.label}</p>
                      <p className="text-[13px] font-bold font-mono leading-none" style={{ color: style.ink }}>{m.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col">
                {list.slice(0, 6).map((r, i) => (
                  <div key={`${r.discount_code}-${r.Province ?? ""}-${i}`} className="flex items-center gap-3 py-2 border-b border-[#f6f6f4] last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-bold text-[12px] text-[#1a1a1a] truncate">{r.discount_code}</p>
                      <p className="text-[9.5px] text-[#a8a8a8] truncate">
                        {prettyChannel(r.channel)}{r.Province ? ` · ${r.Province}` : ""}
                      </p>
                    </div>
                    <div className="hidden sm:block w-24 shrink-0">
                      <div className="h-2 rounded-[2px] bg-[#f3f3f1] overflow-hidden" style={{ width: `${Math.max((r.Signups / maxSignups) * 100, 6)}%` }}>
                        <div className="h-full" style={{ width: `${Math.min(r.calculatedConversion, 100)}%`, backgroundColor: style.ink }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-[92px]">
                      <p className="text-[12px] font-bold font-mono leading-none" style={{ color: style.ink }}>{r.calculatedConversion.toFixed(1)}%</p>
                      <p className="text-[9px] font-mono text-[#a8a8a8] mt-1">{r["Paying cx"].toLocaleString()} of {r.Signups.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {list.length > 6 && (
                  <p className="text-[10px] font-mono text-[#b8b8b8] pt-2">+{list.length - 6} more in this group</p>
                )}
              </div>

              <p className="text-[11.5px] leading-relaxed pt-3 border-t border-[#f0f0f0]" style={{ color: "#4a4a4a" }}>
                <span className="font-semibold" style={{ color: style.ink }}>Do next: </span>{copy.action}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
