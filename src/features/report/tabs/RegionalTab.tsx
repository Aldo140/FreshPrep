import React, { useMemo, useState } from "react";
import { AnalyzedCodeReport, AnalysisFlow, DiscountCodeData, UserPersona } from "../../../types";
import ProvinceIntelligence from "../components/ProvinceIntelligence";
import { ContextBanner } from "../components/ContextBanner";
import { TAB_RELEVANCE, PARTIAL_REASON } from "../../../config/flowRelevance";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
  NS: "#5a5a5a", NB: "#888",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#2b5346";

interface RegionalTabProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
  selectedFlow: AnalysisFlow;
  userPersona: UserPersona;
}

export function RegionalTab({ dbRows, foundReports, selectedFlow, userPersona }: RegionalTabProps): React.ReactElement {
  const relevance = TAB_RELEVANCE.regional[selectedFlow];
  const reason = PARTIAL_REASON.regional;

  // Province field can be compound: "AB + BC + ON" — split into individual codes
  const allProvinces = useMemo(() =>
    Array.from(
      new Set(
        foundReports.flatMap(r =>
          (r.Province ?? "ON").split("+").map(p => p.trim()).filter(Boolean)
        )
      )
    ).sort(),
    [foundReports],
  );

  const [activeProvinces, setActiveProvinces] = useState<Set<string>>(
    () => new Set(allProvinces),
  );

  const toggleProvince = (p: string) => {
    setActiveProvinces(prev => {
      if (prev.size === 1 && prev.has(p)) return prev;
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  // Include a code if ANY of its provinces is active
  const filteredReports = useMemo(() =>
    foundReports.filter(r => {
      const provs = (r.Province ?? "ON").split("+").map(p => p.trim()).filter(Boolean);
      return provs.some(p => activeProvinces.has(p));
    }),
    [foundReports, activeProvinces],
  );

  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Regional</p>
          <h2 className="text-[20px] font-black text-[#0f0f0f]">Province breakdown</h2>
          <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">
            Performance by market region across {allProvinces.length} province{allProvinces.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black font-mono text-[#2b5346]">{filteredReports.length}</p>
          <p className="text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wide">codes in view</p>
        </div>
      </div>

      {relevance === "partial" && reason && (
        <ContextBanner
          title={`Showing ${foundReports.length} selected ${foundReports.length === 1 ? "code" : "codes"} only`}
          message={reason}
        />
      )}

      {/* Province filter pills */}
      {allProvinces.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] shrink-0">Province</span>
          {allProvinces.map(p => (
            <button
              key={p}
              onClick={() => toggleProvince(p)}
              className="px-3 py-1 rounded-full text-[10.5px] font-mono font-semibold cursor-pointer border transition-all"
              style={
                activeProvinces.has(p)
                  ? { backgroundColor: provColor(p), color: "#fff", borderColor: provColor(p) }
                  : { backgroundColor: "white", color: "#a1a1a1", borderColor: "#e5e5e5" }
              }
            >
              {p}
            </button>
          ))}
          {activeProvinces.size < allProvinces.length && (
            <button
              onClick={() => setActiveProvinces(new Set(allProvinces))}
              className="text-[10px] font-mono text-[#2b5346] hover:underline cursor-pointer"
            >
              Show all
            </button>
          )}
        </div>
      )}

      <ProvinceIntelligence dbRows={dbRows} foundReports={filteredReports} />
    </div>
  );
}
