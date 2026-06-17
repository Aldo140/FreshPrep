import React from "react";
import { AnalyzedCodeReport, AnalysisFlow, DiscountCodeData } from "../../../types";
import ProvinceIntelligence from "../components/ProvinceIntelligence";
import { ContextBanner } from "../components/ContextBanner";
import { TAB_RELEVANCE, PARTIAL_REASON } from "../../../config/flowRelevance";

interface RegionalTabProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
  selectedFlow: AnalysisFlow;
}

export function RegionalTab({ dbRows, foundReports, selectedFlow }: RegionalTabProps): React.ReactElement {
  const relevance = TAB_RELEVANCE.regional[selectedFlow];
  const reason = PARTIAL_REASON.regional;

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
        <ProvinceIntelligence dbRows={dbRows} foundReports={foundReports} />
      </div>
    </div>
  );
}
