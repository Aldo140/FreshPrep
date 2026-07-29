/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { AnalyzedCodeReport, AnalysisFlow, KPIReportSummary, ReportPage, UserPersona } from "../../../types";
import { TAB_RELEVANCE } from "../../../config/flowRelevance";
import { PortfolioHealth } from "../../../hooks/useAnalysis";
import KeyFindingsSection from "../components/KeyFindingsSection";
import { AlertTriangle, ArrowRight, BarChart3, DollarSign, FileText, MapPin, Table2 } from "lucide-react";
import { MetricInfo } from "../../../components/MetricInfo";

interface OverviewTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  fileName: string | null;
  dbRowCount: number;
  portfolioHealth: PortfolioHealth | null;
  selectedFlow: AnalysisFlow;
  userPersona: UserPersona;
  businessDevelopmentCodes: string[];
  eventName: string;
  eventDate: string;
  onNavigate: (page: ReportPage) => void;
}

/* ── Design tokens ─────────────────────────────────────────────────
   One mark language across three scales: portfolio (hero), code
   (spine), segment (mix). Every track is "length = volume, fill =
   conversion, tick = the 40% target". Colour only ever means tier.  */

const TARGET = 40;

const TIER = {
  strong:  { fill: "#2b5346", ink: "#2b5346", wash: "#f6fbf8" },
  average: { fill: "#e7bd27", ink: "#8a6f00", wash: "#fdfbf0" },
  weak:    { fill: "#e07a45", ink: "#9b4a1c", wash: "#fdf7f4" },
} as const;

type TierKey = keyof typeof TIER;

const tierOf = (conv: number): TierKey => (conv >= 40 ? "strong" : conv >= 20 ? "average" : "weak");

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};

const CHANNEL_PALETTE = ["#2b5346", "#c9a000", "#4d8970", "#9b4a1c", "#6b8e9f", "#8a6f00", "#a6a7a5"];

function conversionGrade(r: number): { label: string; color: string; bg: string } {
  if (r >= 50) return { label: "A+", color: "#166534", bg: "#dcfce7" };
  if (r >= 40) return { label: "A",  color: "#2b5346", bg: "#eef4f1" };
  if (r >= 30) return { label: "B",  color: "#3b6e2a", bg: "#f0fdf4" };
  if (r >= 20) return { label: "C",  color: "#8a6f00", bg: "#fdf8e1" };
  if (r >= 10) return { label: "D",  color: "#9b4a1c", bg: "#fff0e8" };
  return                { label: "F", color: "#850b0b", bg: "#ffd0d0" };
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

/* ── Segment mix (channel / province) ──────────────────────────── */

interface MixRow {
  key: string;
  label: string;
  color: string;
  signups: number;
  paying: number;
  conv: number;
  codes: number;
}

function MixCard({ eyebrow, title, note, rows, tip, stagger }: {
  eyebrow: string;
  title: string;
  note: string;
  rows: MixRow[];
  tip: string;
  stagger: number;
}) {
  const total = rows.reduce((s, r) => s + r.signups, 0);
  if (rows.length === 0 || total === 0) return null;
  const top = rows.slice(0, 5);
  const rest = rows.slice(5);
  const restSignups = rest.reduce((s, r) => s + r.signups, 0);

  return (
    <section
      className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden animate-slide-up-in"
      data-stagger={stagger}
    >
      <div className="px-5 pt-4 pb-3">
        <p className="text-[8px] font-mono uppercase tracking-[0.28em] text-[#b8b8b8]">{eyebrow}</p>
        <h3 className="text-sm font-black text-[#0f0f0f] mt-1 flex items-center gap-1.5">
          {title}
          <MetricInfo text={tip} />
        </h3>

        {/* Share-of-signups strip */}
        <div className="flex w-full h-2.5 rounded-full overflow-hidden mt-3" style={{ gap: 2 }} role="img" aria-label={`${title} share of signups`}>
          {rows.map(r => (
            <div
              key={r.key}
              style={{ flexGrow: r.signups, flexBasis: 0, backgroundColor: r.color }}
              title={`${r.label} · ${r.signups.toLocaleString()} signups · ${r.conv.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      <ul className="divide-y divide-[#f4f4f2] border-t border-[#f4f4f2]">
        {top.map(r => {
          const share = total > 0 ? (r.signups / total) * 100 : 0;
          return (
            <li key={r.key} className="px-5 py-2.5 flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[#1a1a1a] truncate">{r.label}</p>
                <p className="text-[9px] font-mono text-[#b0b0b0] mt-0.5">
                  {r.codes} {r.codes === 1 ? "code" : "codes"} · {share.toFixed(0)}% of signups
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold font-mono tabular-nums leading-none" style={{ color: TIER[tierOf(r.conv)].ink }}>
                  {r.conv.toFixed(1)}%
                </p>
                <p className="text-[9px] font-mono text-[#b0b0b0] mt-1 tabular-nums">
                  {r.signups.toLocaleString()} → {r.paying.toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
        {rest.length > 0 && (
          <li className="px-5 py-2 text-[9px] font-mono text-[#b8b8b8]">
            + {rest.length} more · {restSignups.toLocaleString()} signups
          </li>
        )}
      </ul>

      <p className="px-5 py-2.5 text-[9px] font-mono text-[#c0c0c0] bg-[#fafafa] border-t border-[#f4f4f2]">{note}</p>
    </section>
  );
}

/* ── Component ─────────────────────────────────────────────────── */

export function OverviewTab({
  foundReports, summary, fileName, dbRowCount, portfolioHealth,
  selectedFlow, userPersona, businessDevelopmentCodes, eventName, eventDate, onNavigate,
}: OverviewTabProps): React.ReactElement {
  const [spineSort, setSpineSort] = useState<"volume" | "rate">("volume");
  const [spineExpanded, setSpineExpanded] = useState(false);

  const n = foundReports.length;
  const codeLabel = n === 1 ? "code" : "codes";
  const hasLtv = summary.hasLtvData;
  const grade = conversionGrade(summary.blendedConversionRate);
  const blended = clampPct(summary.blendedConversionRate);

  const formattedEventDate = eventDate
    ? new Date(eventDate + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : null;

  /* Code provenance — event codes vs verified BD codes */
  const eventCodeCount = foundReports.filter(r => r.discount_code.trim().toUpperCase().startsWith("EV")).length;
  const verifiedBdSet = useMemo(
    () => new Set(businessDevelopmentCodes.map(c => c.trim().toUpperCase())),
    [businessDevelopmentCodes],
  );
  const businessDevelopmentCodeCount = foundReports.filter(r => {
    const code = r.discount_code.trim().toUpperCase();
    return !code.startsWith("EV") && verifiedBdSet.has(code);
  }).length;

  const provincesOf = (r: AnalyzedCodeReport) =>
    (r.Province ?? "ON").split("+").map(p => p.trim()).filter(Boolean);

  const uniqueProvinceList = useMemo(
    () => Array.from(new Set(foundReports.flatMap(provincesOf))).sort(),
    [foundReports],
  );
  const uniqueProvinces = uniqueProvinceList.length;

  /* Spine — every code as a track: length = signup share, fill = conversion */
  const spine = useMemo(() => {
    const maxSignups = foundReports.reduce((m, r) => Math.max(m, r.Signups), 0);
    const rows = foundReports.map(r => ({
      code: r.discount_code,
      signups: r.Signups,
      paying: r["Paying cx"],
      conv: clampPct(r.calculatedConversion),
      grade: r.performanceGrade,
      share: maxSignups > 0 ? Math.max(6, (r.Signups / maxSignups) * 100) : 6,
      tier: tierOf(r.calculatedConversion),
      province: provincesOf(r).join(" · "),
    }));
    return spineSort === "volume"
      ? rows.sort((a, b) => b.signups - a.signups || b.conv - a.conv)
      : rows.sort((a, b) => b.conv - a.conv || b.signups - a.signups);
  }, [foundReports, spineSort]);

  const spineVisible = spineExpanded ? spine : spine.slice(0, 8);

  /* Concentration — how much of the volume sits in the top codes */
  const concentration = useMemo(() => {
    if (n < 3 || summary.totalSignups <= 0) return null;
    const byVolume = [...foundReports].sort((a, b) => b.Signups - a.Signups);
    const topCount = Math.min(3, n);
    const topSignups = byVolume.slice(0, topCount).reduce((s, r) => s + r.Signups, 0);
    return { topCount, pct: (topSignups / summary.totalSignups) * 100 };
  }, [foundReports, n, summary.totalSignups]);

  /* Segment mixes */
  const buildMix = (keyOf: (r: AnalyzedCodeReport) => string[], colorOf: (k: string, i: number) => string): MixRow[] => {
    const acc = new Map<string, { signups: number; paying: number; codes: number }>();
    foundReports.forEach(r => {
      keyOf(r).forEach(k => {
        const cur = acc.get(k) ?? { signups: 0, paying: 0, codes: 0 };
        cur.signups += r.Signups;
        cur.paying += r["Paying cx"];
        cur.codes += 1;
        acc.set(k, cur);
      });
    });
    return Array.from(acc.entries())
      .sort((a, b) => b[1].signups - a[1].signups)
      .map(([key, v], i) => ({
        key,
        label: key,
        color: colorOf(key, i),
        signups: v.signups,
        paying: v.paying,
        codes: v.codes,
        conv: v.signups > 0 ? (v.paying / v.signups) * 100 : 0,
      }));
  };

  const channelMix = useMemo(
    () => buildMix(
      r => [r.channel?.trim() || "Unattributed"],
      (_k, i) => CHANNEL_PALETTE[i % CHANNEL_PALETTE.length],
    ),
    [foundReports],
  );

  const provinceMix = useMemo(
    () => buildMix(
      provincesOf,
      (k, i) => PROV_COLOR[k] ?? CHANNEL_PALETTE[i % CHANNEL_PALETTE.length],
    ),
    [foundReports],
  );

  const showChannelMix = channelMix.length > 1;
  const showProvinceMix = provinceMix.length > 1 && selectedFlow !== "paste";

  /* Fourth nav slot — LTV only when the upload actually carries it */
  const fourthCard = hasLtv
    ? {
        page: "revenue" as const,
        label: "Revenue",
        sub: "LTV · portfolio value",
        icon: <DollarSign className="w-4 h-4" />,
        preview: `$${Math.round(summary.averageLTV12).toLocaleString()} avg LTV`,
        previewColor: "#8a6f00",
        hoverBorder: "#e7bd27",
      }
    : summary.numCodesMissing > 0
      ? {
          page: "issues" as const,
          label: "Unmatched",
          sub: "Codes with no rows",
          icon: <AlertTriangle className="w-4 h-4" />,
          preview: `${summary.numCodesMissing} not found`,
          previewColor: "#9b4a1c",
          hoverBorder: "#e07a45",
        }
      : {
          page: "report" as const,
          label: "Report",
          sub: "Build a shareable summary",
          icon: <FileText className="w-4 h-4" />,
          preview: "Export recap",
          previewColor: "#3d3d3d",
          hoverBorder: "#2b5346",
        };

  const navCards = [
    {
      page: "performance" as const,
      label: "Performance",
      sub: "Conversion rates · KPI chart",
      icon: <BarChart3 className="w-4 h-4" />,
      preview: `${summary.blendedConversionRate.toFixed(1)}% conv`,
      previewColor: grade.color,
      hoverBorder: "#2b5346",
    },
    {
      page: "regional" as const,
      label: "Regional",
      sub: "Province breakdown",
      icon: <MapPin className="w-4 h-4" />,
      preview: uniqueProvinces > 0 ? `${uniqueProvinces} province${uniqueProvinces !== 1 ? "s" : ""}` : "Province data",
      previewColor: "#3d3d3d",
      hoverBorder: "#3d3d3d",
    },
    {
      page: "data" as const,
      label: "Data",
      sub: "Full sortable table",
      icon: <Table2 className="w-4 h-4" />,
      preview: `${n} ${codeLabel}`,
      previewColor: "#3d3d3d",
      hoverBorder: "#3d3d3d",
    },
    fourthCard,
  ].filter(item => !(selectedFlow === "paste" && item.page === "regional"));

  const single = n === 1 ? foundReports[0] : null;

  return (
    <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 max-w-6xl mx-auto w-full">

      {/* ── Hero ─────────────────────────────────────────────────────
          Thesis: the funnel is the whole story. One track carries the
          rate, both raw counts, and the 40% target in a single mark. */}
      <div className="rounded-xl md:rounded-2xl overflow-hidden flex shadow-md animate-slide-up-in" style={{ minHeight: "clamp(190px, 30vw, 270px)" }}>
        <div
          className="flex-1 min-w-0 relative flex flex-col justify-between px-5 md:px-8 py-5 md:py-7"
          style={{ background: "linear-gradient(135deg, #1a3d31 0%, #2b5346 52%, #3a6b58 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 32px)",
            }}
          />

          <div className="relative min-w-0">
            <p className="text-[8px] text-white/40 font-mono uppercase tracking-[0.28em] mb-2">
              FreshPrep · Campaign Performance Report
            </p>
            <h2 className="text-2xl md:text-3xl font-display font-semibold text-white leading-tight tracking-tight">
              {eventName || (selectedFlow === "paste" ? `${n} event ${codeLabel}` : "Campaign Portfolio")}
            </h2>
            <p className="text-[10px] md:text-xs text-white/45 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
              <span>{n} {codeLabel}</span>
              {formattedEventDate && <><span className="text-white/20">·</span><span>{formattedEventDate}</span></>}
              {fileName && <><span className="text-white/20">·</span><span className="truncate max-w-[16rem]">{fileName}</span></>}
              <span className="text-white/20">·</span>
              <span>{dbRowCount.toLocaleString()} records</span>
            </p>
            {userPersona === "bd-lead" && uniqueProvinceList.length > 0 && (
              <p className="text-[10px] font-mono text-white/70 mt-2.5 inline-flex flex-wrap items-center gap-x-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5">
                {eventCodeCount > 0 && <span>{eventCodeCount.toLocaleString()} {eventCodeCount === 1 ? "event" : "events"}</span>}
                {eventCodeCount > 0 && businessDevelopmentCodeCount > 0 && <span className="text-white/25">·</span>}
                {businessDevelopmentCodeCount > 0 && (
                  <span>{businessDevelopmentCodeCount.toLocaleString()} BD {businessDevelopmentCodeCount === 1 ? "code" : "codes"}</span>
                )}
                <span className="text-white/25">·</span>
                <span>{uniqueProvinceList.join(", ")}</span>
              </p>
            )}
          </div>

          {/* Headline rate + funnel track */}
          <div className="relative mt-5 md:mt-7 pt-4 md:pt-5 border-t border-white/10">
            <div className="flex items-end gap-3 flex-wrap">
              <p className="text-[2.6rem] md:text-[3.5rem] font-black font-mono text-white leading-[0.85] tracking-tight tabular-nums animate-num-rise">
                {summary.blendedConversionRate.toFixed(1)}%
              </p>
              <span
                className="text-[10px] font-bold font-mono px-2 py-1 rounded-md mb-1"
                style={{ backgroundColor: grade.bg, color: grade.color }}
                title={`${grade.label} — ${summary.blendedConversionRate.toFixed(1)}% blended conversion`}
              >
                {grade.label}
              </span>
              <p className="text-[9px] text-white/45 uppercase tracking-[0.2em] font-mono mb-1.5 flex items-center gap-1">
                Blended conversion
                <MetricInfo text="Total paying customers ÷ total signups across every code in this report. High-volume codes move it more than small ones." className="opacity-60 hover:opacity-100" />
              </p>
            </div>

            {/* Signature mark: length = signups, fill = paying, tick = 40% target */}
            <div className="mt-4">
              <div className="relative h-3 mb-1">
                <span
                  className="absolute -translate-x-1/2 text-[8px] font-mono uppercase tracking-[0.15em] text-white/40 whitespace-nowrap"
                  style={{ left: `${TARGET}%` }}
                >
                  {TARGET}% target
                </span>
              </div>
              <div className="relative">
                <div className="h-3 md:h-3.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <div
                    className="h-full rounded-full bar-grow"
                    style={{ width: `${blended}%`, background: "linear-gradient(90deg,#8fc7ae 0%,#e7bd27 100%)" }}
                  />
                </div>
                <div
                  className="absolute -top-1 -bottom-1 w-px pointer-events-none"
                  style={{ left: `${TARGET}%`, background: "rgba(255,255,255,0.5)" }}
                />
              </div>
              <div className="flex items-baseline justify-between gap-3 mt-2.5">
                <p className="text-sm md:text-base font-bold font-mono text-white tabular-nums leading-none">
                  {summary.totalSignups.toLocaleString()}
                  <span className="text-[9px] font-normal text-white/40 uppercase tracking-[0.18em] ml-1.5">signups</span>
                </p>
                <p className="text-sm md:text-base font-bold font-mono tabular-nums leading-none" style={{ color: "#e7bd27" }}>
                  {summary.totalPayingCustomers.toLocaleString()}
                  <span className="text-[9px] font-normal text-white/40 uppercase tracking-[0.18em] ml-1.5">paying</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block w-[28%] shrink-0 relative">
          <img
            src="https://freshprep.imgix.net/landing/carousel/recipe_1.jpg?auto=compress,format&w=600"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.85) saturate(1.15)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, #1a3d31 0%, rgba(43,83,70,0.5) 45%, transparent 78%)" }}
          />
        </div>
      </div>

      {/* ── Single-code detail strip ─────────────────────────────── */}
      {single && (
        <section className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm px-5 py-4 animate-slide-up-in" data-stagger="1">
          <p className="text-[8px] font-mono uppercase tracking-[0.28em] text-[#b8b8b8]">Code detail</p>
          <div className="flex items-center justify-between gap-4 flex-wrap mt-1.5">
            <h3 className="text-base font-black font-mono text-[#0f0f0f] truncate">{single.discount_code}</h3>
            <div className="flex items-center gap-5">
              {[
                { label: "Grade", value: single.performanceGrade },
                { label: "Score", value: `${Math.round(single.overallScore)}` },
                { label: "Rating", value: single.performanceRating },
              ].map(x => (
                <div key={x.label} className="text-right">
                  <p className="text-[13px] font-bold font-mono text-[#1a1a1a] leading-none tabular-nums">{x.value}</p>
                  <p className="text-[8px] font-mono uppercase tracking-[0.18em] text-[#b8b8b8] mt-1">{x.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-mono text-[#a1a1a1] mt-2.5">
            {(single.channel?.trim() || "Unattributed")} · {provincesOf(single).join(" · ") || "—"} · {single.overallScoreBadge}
          </p>
        </section>
      )}

      {/* ── Code health tiers ────────────────────────────────────── */}
      {n > 1 && portfolioHealth && portfolioHealth.total > 0 && (
        <section className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm animate-slide-up-in" data-stagger="1">
          <div className="overflow-hidden rounded-t-xl md:rounded-t-2xl">
            <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-3 border-b border-[#f2f2f2]">
              <p className="text-[8px] font-semibold text-[#a1a1a1] uppercase tracking-[0.28em] font-mono flex items-center gap-1.5">
                Code health
                <MetricInfo
                  text={hasLtv
                    ? "Codes grouped by conversion rate. Strong ≥ 40%, Average 20–39%, Weak < 20%."
                    : "Codes grouped by conversion rate. Strong ≥ 40%, Average 20–39%, Weak < 20%. This export has no LTV, so overall scores weight conversion 65% and signup volume 35%."}
                  side="bottom"
                />
              </p>
              <span className="text-[9px] font-mono text-[#c0c0c0] text-right">{portfolioHealth.total} codes · hover a tier</span>
            </div>
            <div className="flex h-1.5" style={{ background: "#f5f5f5" }}>
              {portfolioHealth.strong  > 0 && <div style={{ flex: portfolioHealth.strong  }} className="bg-[#2b5346]" />}
              {portfolioHealth.average > 0 && <div style={{ flex: portfolioHealth.average }} className="bg-[#e7bd27]" />}
              {portfolioHealth.weak    > 0 && <div style={{ flex: portfolioHealth.weak    }} className="bg-[#e07a45]" />}
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[#f2f2f2]">
            {([
              { count: portfolioHealth.strong,  label: "Strong",  threshold: "≥ 40% conversion",  action: "Replicate these — book the same events again.", t: TIER.strong },
              { count: portfolioHealth.average, label: "Average", threshold: "20–39% conversion", action: "Monitor — tune the offer or the booth targeting.", t: TIER.average },
              { count: portfolioHealth.weak,    label: "Weak",    threshold: "< 20% conversion",  action: "Review — rework the code or drop the event.",    t: TIER.weak },
            ] as const).map((tier, i) => (
              <div
                key={tier.label}
                className="group relative px-4 md:px-6 py-4 md:py-5 cursor-default"
                style={{
                  backgroundColor: tier.t.wash,
                  borderBottomLeftRadius: i === 0 ? "0.75rem" : undefined,
                  borderBottomRightRadius: i === 2 ? "0.75rem" : undefined,
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tier.t.fill }} />
                  <p className="text-[8px] font-semibold uppercase tracking-[0.22em] font-mono" style={{ color: tier.t.ink }}>{tier.label}</p>
                </div>
                <p className="text-2xl md:text-3xl font-black font-mono leading-none tabular-nums" style={{ color: tier.t.ink }}>{tier.count}</p>
                <p className="text-[9px] text-[#b8b8b8] font-mono mt-2">{tier.threshold}</p>

                <div
                  className="absolute bottom-full left-1/2 mb-2.5 w-56 pointer-events-none z-50 opacity-0 group-hover:opacity-100"
                  style={{ transform: "translateX(-50%)", transition: "opacity 140ms ease" }}
                >
                  <div className="bg-[#1c1c1c] rounded-xl px-3.5 py-3 shadow-xl text-[11px] leading-relaxed">
                    <p className="font-semibold text-white">{tier.label} — {tier.threshold}</p>
                    <p className="text-white/55 mt-1">{tier.action}</p>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1c1c1c" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Conversion spine ─────────────────────────────────────────
          Same mark as the hero, once per code. Bar length carries the
          volume that LTV used to carry — a wide, empty bar is the
          expensive miss; a short, full one is a small win.            */}
      {n > 1 && (
        <section className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden animate-slide-up-in" data-stagger="2">
          <div className="px-5 md:px-6 pt-4 pb-3 border-b border-[#f2f2f2] flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[8px] font-mono uppercase tracking-[0.28em] text-[#b8b8b8]">Every code</p>
              <h3 className="text-sm font-black text-[#0f0f0f] mt-1">Volume against conversion</h3>
              <p className="text-[9px] font-mono text-[#b0b0b0] mt-1 leading-relaxed">
                Bar length = signups · fill = paying · tick = {TARGET}% target
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-[#f4f4f2] p-0.5 shrink-0" role="group" aria-label="Sort codes">
              {(["volume", "rate"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSpineSort(mode)}
                  aria-pressed={spineSort === mode}
                  className="px-2.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-[0.14em] cursor-pointer tap-scale"
                  style={{
                    background: spineSort === mode ? "#ffffff" : "transparent",
                    color: spineSort === mode ? "#2b5346" : "#a1a1a1",
                    boxShadow: spineSort === mode ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                    fontWeight: spineSort === mode ? 700 : 400,
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-[#f6f6f4]">
            {spineVisible.map(row => {
              const t = TIER[row.tier];
              return (
                <li key={row.code} className="px-5 md:px-6 py-3 hover:bg-[#fafafa]" style={{ transition: "background-color 120ms var(--ease-out)" }}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-[11px] font-bold font-mono text-[#1a1a1a] truncate">{row.code}</span>
                    <span className="text-[9px] font-mono text-[#b8b8b8] shrink-0 tabular-nums">
                      {row.signups.toLocaleString()} → {row.paying.toLocaleString()}
                      {row.province && <span className="hidden sm:inline"> · {row.province}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="relative" style={{ width: `${row.share}%` }}>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f0f0ee" }}>
                          <div className="h-full rounded-full bar-grow" style={{ width: `${row.conv}%`, background: t.fill }} />
                        </div>
                        <div
                          className="absolute -top-0.5 -bottom-0.5 w-px pointer-events-none"
                          style={{ left: `${TARGET}%`, background: "rgba(26,26,26,0.18)" }}
                        />
                      </div>
                    </div>
                    <span className="w-14 shrink-0 text-right text-[11px] font-bold font-mono tabular-nums" style={{ color: t.ink }}>
                      {row.conv.toFixed(1)}%
                    </span>
                    <span className="w-6 shrink-0 text-right text-[9px] font-mono text-[#c0c0c0]">{row.grade}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          {spine.length > 8 && (
            <button
              type="button"
              onClick={() => setSpineExpanded(v => !v)}
              className="w-full px-5 py-3 text-[10px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] hover:text-[#2b5346] bg-[#fafafa] border-t border-[#f2f2f2] cursor-pointer tap-scale"
              style={{ transition: "color 140ms var(--ease-out)" }}
            >
              {spineExpanded ? "Show top 8" : `Show all ${spine.length} codes`}
            </button>
          )}

          {concentration && (
            <p className="px-5 md:px-6 py-2.5 text-[9px] font-mono text-[#b0b0b0] bg-[#fafafa] border-t border-[#f2f2f2]">
              Top {concentration.topCount} codes carry {concentration.pct.toFixed(0)}% of all signups.
            </p>
          )}
        </section>
      )}

      {/* ── Segment mix ──────────────────────────────────────────── */}
      {(showChannelMix || showProvinceMix) && (
        <div className={`grid gap-4 ${showChannelMix && showProvinceMix ? "md:grid-cols-2" : "grid-cols-1"}`}>
          {showChannelMix && (
            <MixCard
              eyebrow="Where they came from"
              title="Channel mix"
              note="Conversion is paying ÷ signups within each channel."
              rows={channelMix}
              tip="Signups and paying customers grouped by the channel recorded on each code. Codes with no channel show as Unattributed."
              stagger={3}
            />
          )}
          {showProvinceMix && (
            <MixCard
              eyebrow="Where they signed up"
              title="Province spread"
              note="Codes that span provinces count in each one, so shares can overlap."
              rows={provinceMix}
              tip="Signups and paying customers grouped by province. A code tagged BC+AB contributes its full volume to both."
              stagger={4}
            />
          )}
        </div>
      )}

      {/* ── Lifetime value — bonus band, only with real LTV ───────── */}
      {hasLtv && (
        <section className="rounded-xl md:rounded-2xl border border-[#f0e2ac] shadow-sm overflow-hidden animate-slide-up-in" style={{ background: "#fffdf5" }} data-stagger="4">
          <div className="px-5 md:px-6 py-3 border-b border-[#f5ecc9] flex items-center justify-between gap-3">
            <p className="text-[8px] font-mono uppercase tracking-[0.28em] text-[#b09a3a]">Bonus · from your LTV export</p>
            <button
              type="button"
              onClick={() => onNavigate("revenue")}
              className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#8a6f00] hover:text-[#5c4900] cursor-pointer tap-scale flex items-center gap-1"
            >
              Revenue tab <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#f5ecc9]">
            {[
              { label: "Avg LTV 12M", value: `$${Math.round(summary.averageLTV12).toLocaleString()}`, tip: "Average estimated revenue per paying customer over their first 12 months." },
              { label: "Total LTV 12M", value: `$${Math.round(summary.totalLTV12).toLocaleString()}`, tip: "Sum of 12-month lifetime value across every paying customer in this report." },
              { label: "Per signup", value: summary.totalSignups > 0 ? `$${Math.round(summary.totalLTV12 / summary.totalSignups).toLocaleString()}` : "—", tip: "Total 12-month LTV divided by every signup, paying or not — what an average signup is worth." },
            ].map(x => (
              <div key={x.label} className="px-4 md:px-6 py-4">
                <p className="text-lg md:text-2xl font-black font-mono text-[#5c4900] leading-none tabular-nums">{x.value}</p>
                <p className="text-[8px] font-mono uppercase tracking-[0.18em] text-[#b09a3a] mt-2 flex items-center gap-1">
                  {x.label} <MetricInfo text={x.tip} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Key findings ─────────────────────────────────────────── */}
      <section className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden animate-slide-up-in" data-stagger="5">
        <div className="px-5 md:px-6 py-3.5 border-b border-[#f2f2f2] flex items-center justify-between gap-3">
          <p className="text-[8px] font-semibold text-[#a1a1a1] uppercase tracking-[0.28em] font-mono">Key findings</p>
          <span className="text-[9px] font-mono text-[#c0c0c0]">{n} {codeLabel} analyzed</span>
        </div>
        <div className="p-4 md:p-5">
          <KeyFindingsSection reports={foundReports} summary={summary} eventDate={eventDate} userPersona={userPersona} />
        </div>
      </section>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {navCards.map(item => {
          const isPartial = TAB_RELEVANCE[item.page][selectedFlow] === "partial";
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className="group text-left bg-white rounded-xl border border-[#e8e8e8] p-4 md:p-5 cursor-pointer flex flex-col gap-3 md:gap-4 shadow-sm hover:shadow-md tap-scale"
              style={{ transition: "box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out), transform 120ms var(--ease-out)", minHeight: 80 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = item.hoverBorder + "55"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e8e8"; }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#2b5346]">{item.icon}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#d0d0d0] group-hover:text-[#a1a1a1]" style={{ transition: "color 150ms var(--ease-out)" }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1a1a1a]">{item.label}</p>
                <p className="text-[10px] text-[#b0b0b0] mt-0.5">{item.sub}{isPartial ? " — partial view" : ""}</p>
              </div>
              <p className="text-[11px] font-semibold font-mono" style={{ color: item.previewColor }}>{item.preview}</p>
            </button>
          );
        })}
      </div>

    </div>
  );
}
