import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import DashboardMetrics, { GRADE_BANDS, GradeBand, gradeBand } from "../components/DashboardMetrics";
import PerformanceChart from "../components/PerformanceChart";
import { MetricInfo } from "../../../components/MetricInfo";

interface PerformanceTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
}

interface SpectrumPoint {
  key: string;
  report: AnalyzedCodeReport;
  x: number;
  lane: number;
  size: number;
  band: GradeBand;
}

const MAX_LANES = 7;
const LANE_HEIGHT = 20;

export function PerformanceTab({ foundReports, summary, channelSummary }: PerformanceTabProps): React.ReactElement {
  const [rosterOpen, setRosterOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const totalSignups = summary.totalSignups;
  const totalPaying = summary.totalPayingCustomers;
  const notConverted = Math.max(0, totalSignups - totalPaying);
  const rate = summary.blendedConversionRate;
  const cohortBand = gradeBand(rate);
  const ratio = totalPaying > 0 ? totalSignups / totalPaying : null;

  /* ── Conversion spectrum layout ────────────────────────────────────────
     Every code plotted on one 0→max conversion axis. Dots are packed into
     lanes so overlapping codes stay readable; dot area encodes signups.    */
  const spectrum = useMemo(() => {
    const maxConv = foundReports.reduce((m, r) => Math.max(m, r.calculatedConversion), 0);
    // Floor at 60 so the A+ band always reads as part of the scale, even when
    // no code reaches it — the spectrum should show the whole grading range.
    const axisMax = Math.max(60, Math.ceil((maxConv + 5) / 10) * 10);
    const maxSignups = foundReports.reduce((m, r) => Math.max(m, r.Signups), 1);
    const gap = axisMax * 0.035;
    const laneCursor: number[] = [];

    const points: SpectrumPoint[] = [...foundReports]
      .map((report, i) => ({
        key: `${report.discount_code}-${report.Province ?? ""}-${i}`,
        report,
        x: report.calculatedConversion,
      }))
      .sort((a, b) => a.x - b.x)
      .map(p => {
        let lane = 0;
        while (laneCursor[lane] !== undefined && p.x - laneCursor[lane] < gap) lane++;
        laneCursor[lane] = p.x;
        return {
          ...p,
          lane: lane % MAX_LANES,
          size: 9 + 11 * Math.sqrt(p.report.Signups / maxSignups),
          band: gradeBand(p.x),
        };
      });

    const laneCount = Math.max(1, Math.min(MAX_LANES, laneCursor.length));
    const ticks = Array.from({ length: Math.floor(axisMax / 10) + 1 }, (_, i) => i * 10);
    return { points, axisMax, laneCount, ticks };
  }, [foundReports]);

  const fallbackPoint = useMemo(
    () =>
      spectrum.points.reduce<SpectrumPoint | null>(
        (best, p) => (best === null || p.report.overallScore > best.report.overallScore ? p : best),
        null,
      ),
    [spectrum.points],
  );
  const active = spectrum.points.find(p => p.key === activeKey) ?? fallbackPoint;

  /* ── Channel comparison, blended per channel ───────────────────────── */
  const channelRows = useMemo(
    () =>
      channelSummary
        .map(c => {
          const conv = c.totalSignups > 0 ? (c.totalPayingCustomers / c.totalSignups) * 100 : 0;
          return { ...c, conv, band: gradeBand(conv) };
        })
        .sort((a, b) => b.conv - a.conv),
    [channelSummary],
  );

  const waffle = Array.from({ length: 100 }, (_, i) => i < Math.round(rate));

  /* ── Empty state ───────────────────────────────────────────────────── */
  if (foundReports.length === 0) {
    return (
      <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 md:gap-5 max-w-6xl mx-auto w-full">
        <Header hasLtvData={summary.hasLtvData} codeCount={0} />
        <div className="bg-white rounded-2xl border border-dashed border-[#e0e0e0] shadow-sm px-6 py-12 text-center">
          <p className="text-sm font-semibold text-[#1a1a1a]">Nothing to grade yet</p>
          <p className="text-xs text-[#a1a1a1] mt-1.5 max-w-sm mx-auto leading-relaxed">
            None of the codes you entered matched a row in the upload. Check the Issues tab for close
            spellings, or upload an export that covers these events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 md:gap-5 max-w-6xl mx-auto w-full">
      <Header hasLtvData={summary.hasLtvData} codeCount={foundReports.length} />

      {/* ── Hero: the conversion ledger ───────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden shadow-md relative animate-slide-up-in"
        style={{ background: "linear-gradient(135deg, #1a3d31 0%, #2b5346 55%, #3a6b58 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.045] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 32px)",
          }}
        />

        <div className="relative px-5 md:px-7 pt-5 md:pt-6 pb-5 md:pb-6 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-white/40 font-mono uppercase tracking-[0.2em]">
              Conversion ledger · {foundReports.length} {foundReports.length === 1 ? "code" : "codes"}
            </p>

            {ratio ? (
              <h3 className="font-display text-[26px] md:text-[34px] leading-[1.15] text-white mt-2.5 tracking-tight">
                1 in{" "}
                <span className="font-mono font-bold text-[#e7bd27]">{ratio.toFixed(1)}</span>{" "}
                signups became a paying customer
              </h3>
            ) : (
              <h3 className="font-display text-[26px] md:text-[34px] leading-[1.15] text-white mt-2.5 tracking-tight">
                No signups converted to paying customers yet
              </h3>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <span className="text-[11px] font-mono text-white/55">
                {rate.toFixed(1)}% blended conversion
              </span>
              <span
                className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md"
                style={{ backgroundColor: cohortBand.tint, color: cohortBand.ink }}
                title={`Grade ${cohortBand.grade} — ${cohortBand.note} conversion`}
              >
                {cohortBand.grade}
              </span>
              <MetricInfo
                side="bottom"
                className="opacity-60 hover:opacity-100"
                text="Blended conversion pools every signup across every code, so codes that drove more registrations weigh more heavily than small ones."
              />
            </div>
          </div>

          {/* Waffle: 100 squares, one per percent of signups */}
          <div className="w-[132px] sm:w-[150px] shrink-0">
            <div className="grid grid-cols-10 gap-[3px]">
              {waffle.map((on, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[2px]"
                  style={{ backgroundColor: on ? "#e7bd27" : "rgba(255,255,255,0.13)" }}
                />
              ))}
            </div>
            <p className="text-[8.5px] font-mono text-white/40 mt-2 leading-snug">
              Each square is 1% of signups. Gold squares paid.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 border-t border-white/10 px-5 md:px-7 py-4">
          {[
            { label: "Signups", value: totalSignups, tone: "text-white", tip: "Everyone who registered with one of these codes, whether or not they went on to pay." },
            { label: "Paying", value: totalPaying, tone: "text-[#e7bd27]", tip: "Signups that started a paid subscription. This is the acquisition number the cohort is judged on." },
            { label: "Didn't convert", value: notConverted, tone: "text-white/65", tip: "Registered but never started paying — the pool a follow-up campaign could still reach." },
          ].map(k => (
            <div key={k.label}>
              <p className={`text-xl md:text-3xl font-bold font-mono leading-none tracking-tight animate-num-rise ${k.tone}`}>
                {k.value.toLocaleString()}
              </p>
              <p className="text-[8.5px] md:text-[9px] text-white/40 uppercase tracking-widest font-mono mt-2 flex items-center gap-1">
                <span className="truncate">{k.label}</span>
                <MetricInfo text={k.tip} className="opacity-60 hover:opacity-100" />
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grade distribution + callouts ─────────────────────────────── */}
      <DashboardMetrics summary={summary} reports={foundReports} />

      {/* ── Signature: the conversion spectrum ────────────────────────── */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 md:px-5 py-3 border-b border-[#f2f2f2]">
          <p className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-widest font-mono flex items-center gap-1.5">
            Conversion spectrum
            <MetricInfo
              side="bottom"
              text="Every matched code sits on one conversion axis. Bigger dots drove more signups. Bands behind the dots are the letter grades."
            />
          </p>
          <p className="text-[9px] font-mono text-[#c0c0c0]">
            Dot size = signups · tap a dot to read it
          </p>
        </div>

        <div className="px-4 md:px-5 pt-4 pb-3">
          {/* Grade band letters */}
          <div className="relative h-4 mb-1">
            {bandSegments(spectrum.axisMax).map(seg => (
              <span
                key={seg.band.grade}
                className="absolute text-[9px] font-black font-mono top-0"
                style={{ left: `${seg.left}%`, width: `${seg.width}%`, color: seg.band.color, opacity: 0.5 }}
              >
                <span className="pl-1">{seg.band.grade}</span>
              </span>
            ))}
          </div>

          {/* Plot */}
          <div
            className="relative rounded-lg overflow-hidden border border-[#f0f0f0]"
            style={{ height: spectrum.laneCount * LANE_HEIGHT + 26 }}
          >
            {bandSegments(spectrum.axisMax).map(seg => (
              <div
                key={seg.band.grade}
                className="absolute inset-y-0"
                style={{ left: `${seg.left}%`, width: `${seg.width}%`, backgroundColor: seg.band.tint }}
              />
            ))}

            {/* Cohort marker */}
            <div
              className="absolute inset-y-0 w-px pointer-events-none"
              style={{
                left: `${Math.min(100, (rate / spectrum.axisMax) * 100)}%`,
                backgroundImage: "repeating-linear-gradient(180deg,#1a1a1a 0 3px,transparent 3px 7px)",
                opacity: 0.35,
              }}
            />

            {spectrum.points.map(p => {
              const isActive = active?.key === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-label={`${p.report.discount_code}, ${p.x.toFixed(1)} percent conversion, ${p.report.Signups} signups`}
                  onMouseEnter={() => setActiveKey(p.key)}
                  onFocus={() => setActiveKey(p.key)}
                  onClick={() => setActiveKey(p.key)}
                  className="absolute rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a]"
                  style={{
                    left: `${Math.min(100, (p.x / spectrum.axisMax) * 100)}%`,
                    bottom: 14 + p.lane * LANE_HEIGHT,
                    width: p.size,
                    height: p.size,
                    transform: `translate(-50%, 50%) scale(${isActive ? 1.25 : 1})`,
                    backgroundColor: p.band.color,
                    opacity: isActive ? 1 : 0.82,
                    boxShadow: isActive ? "0 0 0 3px rgba(255,255,255,0.95), 0 2px 8px rgba(0,0,0,0.25)" : "0 0 0 1.5px rgba(255,255,255,0.85)",
                    transition: "transform 140ms cubic-bezier(0.23,1,0.32,1), opacity 140ms ease",
                    zIndex: isActive ? 20 : 10,
                  }}
                />
              );
            })}
          </div>

          {/* Axis */}
          <div className="relative h-4 mt-1">
            {spectrum.ticks.map(t => (
              <span
                key={t}
                className="absolute text-[8.5px] font-mono text-[#c0c0c0] -translate-x-1/2"
                style={{ left: `${(t / spectrum.axisMax) * 100}%` }}
              >
                {t}%
              </span>
            ))}
          </div>
        </div>

        {/* Readout */}
        {active && (
          <div className="border-t border-[#f2f2f2] bg-[#fbfbfa] px-4 md:px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded shrink-0"
                style={{ backgroundColor: active.band.tint, color: active.band.ink }}
              >
                {active.band.grade}
              </span>
              <span className="font-mono text-[13px] font-bold text-[#1a1a1a] truncate">
                {active.report.discount_code}
              </span>
              <span className="text-[9.5px] text-[#a1a1a1] font-mono truncate">
                {active.report.channel}
                {active.report.Province ? ` · ${active.report.Province}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 ml-auto text-[10px] font-mono">
              <span className="text-[#a1a1a1]">
                {active.report.Signups.toLocaleString()} signups
              </span>
              <span className="text-[#2b5346] font-bold">
                {active.report["Paying cx"].toLocaleString()} paying
              </span>
              <span className="font-bold" style={{ color: active.band.ink }}>
                {active.x.toFixed(1)}%
              </span>
              <span className="text-[#a1a1a1]">
                score {active.report.overallScore}/100 · {active.report.overallScoreBadge}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Channel comparison ────────────────────────────────────────── */}
      {channelRows.length > 0 && (
        <div className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 md:px-5 py-3 border-b border-[#f2f2f2]">
            <p className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-widest font-mono flex items-center gap-1.5">
              Channel comparison
              <MetricInfo
                side="bottom"
                text="Each channel's own blended rate: its paying customers divided by its signups. The dashed line is the cohort rate, so anything past it is pulling the average up."
              />
            </p>
            <p className="text-[9px] font-mono text-[#c0c0c0]">
              Dashed line = cohort {rate.toFixed(1)}%
            </p>
          </div>

          <div className="divide-y divide-[#f4f4f4]">
            {channelRows.map(c => (
              <div key={c.channel} className="px-4 md:px-5 py-3 hover:bg-[#fbfbfa] transition-colors">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="text-xs font-semibold text-[#1a1a1a] truncate">
                    {c.channel}
                    <span className="text-[9px] font-mono text-[#b8b8b8] ml-2">
                      {c.codeCount} {c.codeCount === 1 ? "code" : "codes"}
                    </span>
                  </p>
                  <p className="text-xs font-bold font-mono shrink-0" style={{ color: c.band.ink }}>
                    {c.conv.toFixed(1)}%
                  </p>
                </div>

                <div className="relative h-2.5 rounded-full bg-[#f2f2f2] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (c.conv / spectrum.axisMax) * 100)}%`,
                      backgroundColor: c.band.color,
                      transition: "width 600ms cubic-bezier(0.23,1,0.32,1)",
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-px"
                    style={{
                      left: `${Math.min(100, (rate / spectrum.axisMax) * 100)}%`,
                      backgroundImage: "repeating-linear-gradient(180deg,#1a1a1a 0 2px,transparent 2px 5px)",
                      opacity: 0.45,
                    }}
                  />
                </div>

                <p className="text-[9px] font-mono text-[#b0b0b0] mt-1.5">
                  {c.totalSignups.toLocaleString()} signups · {c.totalPayingCustomers.toLocaleString()} paying
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Code roster ───────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => setRosterOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#e8e8e8] bg-white hover:bg-[#f8f8f8] transition-colors text-left shadow-sm tap-scale cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#2b5346] shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Code roster</p>
              <p className="text-[10px] text-[#a1a1a1] font-mono">
                Every code ranked · volume and conversion side by side
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[#a1a1a1] font-mono hidden sm:block">
              {rosterOpen ? "Hide" : `Show ${foundReports.length}`}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#a1a1a1] transition-transform duration-200 ${rosterOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {rosterOpen && (
          <div className="mt-2 animate-slide-up-in">
            <PerformanceChart reports={foundReports} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function Header({ hasLtvData, codeCount }: { hasLtvData: boolean; codeCount: number }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <h2 className="text-base font-semibold text-[#1a1a1a]">Performance</h2>
      <span className="text-[10px] text-[#a1a1a1] font-mono">
        {codeCount > 0 ? "How each code and channel converted" : "Conversion grading"}
      </span>
      {!hasLtvData && (
        <span className="text-[9px] font-mono text-[#8a6f00] bg-[#fdf8e1] border border-[#e7bd27]/40 rounded-md px-2 py-0.5 flex items-center gap-1">
          Conversion-only upload
          <MetricInfo
            side="bottom"
            text="This export carries signups, paying customers and channel — no revenue. Scores are built from conversion rate and signup volume instead, so nothing here is understated by missing dollars."
          />
        </span>
      )}
    </div>
  );
}

/** Grade bands clipped to the visible axis, as left/width percentages. */
function bandSegments(axisMax: number): { band: GradeBand; left: number; width: number }[] {
  return GRADE_BANDS.map(band => {
    const lo = Math.min(band.min, axisMax);
    const hi = Math.min(band.max === Infinity ? axisMax : band.max, axisMax);
    return { band, left: (lo / axisMax) * 100, width: ((hi - lo) / axisMax) * 100 };
  }).filter(s => s.width > 0);
}
