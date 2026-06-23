import React from "react";
import { AnalyzedCodeReport, AnalysisFlow, KPIReportSummary, ReportPage, UserPersona } from "../../../types";
import { TAB_RELEVANCE } from "../../../config/flowRelevance";
import { PortfolioHealth } from "../../../hooks/useAnalysis";
import KeyFindingsSection from "../components/KeyFindingsSection";
import { ArrowRight, BarChart3, DollarSign, MapPin, Table2 } from "lucide-react";

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

function conversionGrade(r: number): { label: string; color: string; bg: string } {
  if (r >= 50) return { label: "A+", color: "#166534", bg: "#dcfce7" };
  if (r >= 40) return { label: "A",  color: "#2b5346", bg: "#eef4f1" };
  if (r >= 30) return { label: "B",  color: "#3b6e2a", bg: "#f0fdf4" };
  if (r >= 20) return { label: "C",  color: "#8a6f00", bg: "#fdf8e1" };
  if (r >= 10) return { label: "D",  color: "#9b4a1c", bg: "#fff0e8" };
  return                { label: "F",  color: "#850b0b", bg: "#ffd0d0" };
}

export function OverviewTab({ foundReports, summary, fileName, dbRowCount, portfolioHealth, selectedFlow, userPersona, businessDevelopmentCodes, eventName, eventDate, onNavigate }: OverviewTabProps): React.ReactElement {
  const formattedEventDate = eventDate
    ? new Date(eventDate + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const n = foundReports.length;
  const codeLabel = n === 1 ? "code" : "codes";
  const eventCodeCount = foundReports.filter(r =>
    r.discount_code.trim().toUpperCase().startsWith("EV")
  ).length;
  const verifiedBusinessDevelopmentSet = new Set(
    businessDevelopmentCodes.map(code => code.trim().toUpperCase()),
  );
  const businessDevelopmentCodeCount = foundReports.filter(r => {
    const code = r.discount_code.trim().toUpperCase();
    return !code.startsWith("EV") && verifiedBusinessDevelopmentSet.has(code);
  }).length;
  const grade = conversionGrade(summary.blendedConversionRate);

  const uniqueProvinceList = Array.from(
    new Set(
      foundReports.flatMap(r => (r.Province ?? "ON").split("+").map(p => p.trim()))
    )
  ).filter(Boolean).sort();
  const uniqueProvinces = uniqueProvinceList.length;

  const pressMd = (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; };
  const pressUp = (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; };

  return (
    <div className="p-5 flex flex-col gap-4 max-w-6xl mx-auto w-full">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden flex shadow-md" style={{ minHeight: 220 }}>
        {/* Left brand panel */}
        <div className="flex-1 bg-[#2b5346] relative flex flex-col justify-between px-8 py-7"
          style={{ background: "linear-gradient(135deg, #1a3d31 0%, #2b5346 50%, #3a6b58 100%)" }}
        >
          {/* Subtle texture grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 32px)"
            }}
          />

          <div className="relative">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/40 font-mono uppercase tracking-[0.2em] mb-2">
                  FreshPrep · Campaign Performance Report
                </p>
                <h2 className="text-3xl font-display font-semibold text-white leading-tight tracking-tight">
                  {eventName || (selectedFlow === "paste" ? `${n} event ${codeLabel}` : "Campaign Portfolio")}
                </h2>
                <p className="text-xs text-white/50 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {<span>{n} {codeLabel}</span>}
                  {formattedEventDate && <><span className="text-white/20">·</span><span>{formattedEventDate}</span></>}
                  {fileName && <><span className="text-white/20">·</span><span className="font-mono">{fileName}</span></>}
                  <span className="text-white/20">·</span>
                  <span>{dbRowCount.toLocaleString()} records</span>
                </p>
                {userPersona === "bd-lead" && uniqueProvinceList.length > 0 && (
                  <p className="text-xs text-[#2b5346] bg-[#eef4f1] border border-[#2b5346]/20 rounded-lg px-3 py-2 font-mono mt-2">
                    {eventCodeCount > 0 && (
                      <span>
                        {eventCodeCount.toLocaleString()} {eventCodeCount === 1 ? "Event" : "Events"}
                      </span>
                    )}
                    {eventCodeCount > 0 && businessDevelopmentCodeCount > 0 && (
                      <span> · </span>
                    )}
                    {businessDevelopmentCodeCount > 0 && (
                      <span>
                        {businessDevelopmentCodeCount.toLocaleString()} Business Development {businessDevelopmentCodeCount === 1 ? "code" : "codes"}
                      </span>
                    )}
                    <span> · {uniqueProvinceList.join(", ")}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* KPI numbers */}
          <div className="relative grid grid-cols-3 gap-px mt-6 pt-6 border-t border-white/10">
            {/* Conversion — includes grade tag */}
            <div>
              <p className="text-4xl font-bold font-mono text-white leading-none tracking-tight">
                {summary.blendedConversionRate.toFixed(1)}%
              </p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[9px] text-white/45 uppercase tracking-widest font-mono">Conversion rate</p>
                <span
                  className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: grade.bg, color: grade.color }}
                  title={`${grade.label} — ${summary.blendedConversionRate.toFixed(1)}% blended conversion`}
                >
                  {grade.label}
                </span>
              </div>
            </div>
            {[
              { label: "Avg LTV 12M",   value: `$${Math.round(summary.averageLTV12).toLocaleString()}` },
              { label: "Total signups", value: summary.totalSignups.toLocaleString() },
            ].map(k => (
              <div key={k.label}>
                <p className="text-4xl font-bold font-mono text-white leading-none tracking-tight">{k.value}</p>
                <p className="text-[9px] text-white/45 uppercase tracking-widest font-mono mt-2">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: food photo */}
        <div className="hidden sm:block w-[34%] shrink-0 relative">
          <img
            src="https://freshprep.imgix.net/landing/carousel/recipe_1.jpg?auto=compress,format&w=600"
            alt="FreshPrep meal"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.85) saturate(1.15)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, #1a3d31 0%, rgba(43,83,70,0.5) 40%, transparent 70%)" }}
          />
        </div>
      </div>

      {/* Code health — multi-code only */}
      {n > 1 && portfolioHealth && portfolioHealth.total > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm">
          {/* Header + bar stay clipped for rounded top corners */}
          <div className="overflow-hidden rounded-t-xl">
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#f2f2f2]">
              <p className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-widest font-mono">Code health</p>
              <span className="text-[9px] font-mono text-[#c0c0c0]">{portfolioHealth.total} codes · hover each tier to learn more</span>
            </div>
            <div className="flex h-1.5" style={{ background: "#f5f5f5" }}>
              {portfolioHealth.strong  > 0 && <div style={{ flex: portfolioHealth.strong  }} className="bg-[#2b5346]" />}
              {portfolioHealth.average > 0 && <div style={{ flex: portfolioHealth.average }} className="bg-[#e7bd27]" />}
              {portfolioHealth.weak    > 0 && <div style={{ flex: portfolioHealth.weak    }} className="bg-[#e07a45]" />}
            </div>
          </div>

          {/* Columns — no overflow constraint so tooltips can escape upward */}
          <div className="grid grid-cols-3 divide-x divide-[#f2f2f2] rounded-b-xl">
            {[
              { count: portfolioHealth.strong,  label: "Strong",  threshold: "≥ 40% conversion", action: "Replicate — these are your best performers.",       color: "#2b5346", bg: "#f6fbf8", dot: "#2b5346" },
              { count: portfolioHealth.average, label: "Average", threshold: "20–39% conversion", action: "Monitor — optimize the offer or targeting.",         color: "#8a6f00", bg: "#fdfbf0", dot: "#e7bd27" },
              { count: portfolioHealth.weak,    label: "Weak",    threshold: "< 20% conversion",  action: "Review — consider retiring or reworking the code.",  color: "#9b4a1c", bg: "#fdf7f4", dot: "#e07a45" },
            ].map((tier, i) => (
              <div
                key={tier.label}
                className="group relative px-6 py-5 cursor-default"
                style={{
                  backgroundColor: tier.bg,
                  borderBottomLeftRadius: i === 0 ? "0.75rem" : undefined,
                  borderBottomRightRadius: i === 2 ? "0.75rem" : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
                  <p className="text-[9px] font-semibold uppercase tracking-widest font-mono" style={{ color: tier.color }}>{tier.label}</p>
                </div>
                <p className="text-3xl font-bold font-mono leading-none" style={{ color: tier.color }}>{tier.count}</p>
                <p className="text-[9px] text-[#b8b8b8] font-mono mt-2">{tier.threshold}</p>

                {/* Tooltip — escapes upward, z-50 to clear siblings */}
                <div
                  className="absolute bottom-full left-1/2 mb-2.5 w-56 pointer-events-none z-50"
                  style={{
                    transform: "translateX(-50%) translateY(6px)",
                    opacity: 0,
                    transition: "opacity 140ms ease, transform 140ms ease",
                  }}
                  ref={el => {
                    if (!el) return;
                    const p = el.parentElement!;
                    const show = () => { el.style.opacity = "1"; el.style.transform = "translateX(-50%) translateY(0)"; };
                    const hide = () => { el.style.opacity = "0"; el.style.transform = "translateX(-50%) translateY(6px)"; };
                    p.addEventListener("mouseenter", show);
                    p.addEventListener("mouseleave", hide);
                  }}
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
        </div>
      )}

      {/* ── Key findings ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-[#f2f2f2] flex items-center justify-between">
          <p className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-widest font-mono">Key findings</p>
          <span className="text-[9px] font-mono text-[#c0c0c0]">{n} {codeLabel} analyzed</span>
        </div>
        <div className="p-5">
          <KeyFindingsSection reports={foundReports} summary={summary} eventDate={eventDate} userPersona={userPersona} />
        </div>
      </div>

      {/* ── Navigation cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
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
            page: "revenue" as const,
            label: "Revenue",
            sub: "LTV · portfolio value",
            icon: <DollarSign className="w-4 h-4" />,
            preview: `$${Math.round(summary.averageLTV12).toLocaleString()} avg LTV`,
            previewColor: "#8a6f00",
            hoverBorder: "#e7bd27",
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
        ].filter(() => true).map(item => {
          const isPartial = TAB_RELEVANCE[item.page][selectedFlow] === "partial";
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className="group text-left bg-white rounded-xl border border-[#e8e8e8] p-5 cursor-pointer flex flex-col gap-4 shadow-sm hover:shadow-md"
              style={{ transition: "box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out), transform 100ms var(--ease-out)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = item.hoverBorder + "55"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8e8e8"; pressUp(e); }}
              onMouseDown={pressMd}
              onMouseUp={pressUp}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#2b5346]">{item.icon}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#d0d0d0] group-hover:text-[#a1a1a1]" style={{ transition: "color 150ms var(--ease-out), transform 150ms var(--ease-out)" }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1a1a1a]">{item.label}</p>
                <p className="text-[10px] text-[#b0b0b0] mt-0.5">
                  {item.sub}{isPartial ? " — partial view" : ""}
                </p>
              </div>
              <p className="text-[11px] font-semibold font-mono" style={{ color: item.previewColor }}>
                {item.preview}
              </p>
            </button>
          );
        })}
      </div>

    </div>
  );
}
