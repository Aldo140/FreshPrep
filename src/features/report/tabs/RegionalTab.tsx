import React, { useState } from "react";
import { AnalyzedCodeReport, AnalysisFlow, DiscountCodeData, UserPersona } from "../../../types";
import ProvinceIntelligence from "../components/ProvinceIntelligence";
import { ContextBanner } from "../components/ContextBanner";
import { TAB_RELEVANCE, PARTIAL_REASON } from "../../../config/flowRelevance";

interface RegionalTabProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
  selectedFlow: AnalysisFlow;
  userPersona: UserPersona;
}

export function RegionalTab({ dbRows, foundReports, selectedFlow, userPersona }: RegionalTabProps): React.ReactElement {
  const relevance = TAB_RELEVANCE.regional[selectedFlow];
  const reason = PARTIAL_REASON.regional;

  const allProvinces = Array.from(
    new Set(foundReports.map(r => r.Province ?? "ON"))
  ).sort();

  const [activeProvinces, setActiveProvinces] = useState<Set<string>>(
    () => new Set(allProvinces)
  );

  const toggleProvince = (p: string) => {
    setActiveProvinces(prev => {
      if (prev.size === 1 && prev.has(p)) return prev; // keep at least one
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const filteredReports = foundReports.filter(r => activeProvinces.has(r.Province ?? "ON"));

  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Regional breakdown</h2>
        <span className="text-[10px] text-[#a1a1a1] font-mono">Performance by province</span>
      </div>

      {relevance === "partial" && reason && (
        <ContextBanner
          title={`Showing ${foundReports.length} selected ${foundReports.length === 1 ? "code" : "codes"} only`}
          message={reason}
        />
      )}

      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-3xs">
        {allProvinces.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] shrink-0">Province</span>
            {allProvinces.map(p => (
              <button
                key={p}
                onClick={() => toggleProvince(p)}
                className={`px-3 py-1 rounded-full text-[10.5px] font-mono font-semibold cursor-pointer border transition-colors ${
                  activeProvinces.has(p)
                    ? "bg-[#2b5346] text-white border-[#2b5346]"
                    : "bg-white text-[#a1a1a1] border-[#e5e5e5] hover:border-[#2b5346]/40"
                }`}
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
    </div>
  );
}
