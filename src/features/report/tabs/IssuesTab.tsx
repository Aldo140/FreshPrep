import React from "react";
import { AnalyzedCodeReport } from "../../../types";
import MissingCodesSection from "../components/MissingCodesSection";
import { CheckCircle2 } from "lucide-react";

interface IssuesTabProps {
  missingCodes: string[];
  uniqueDbCodes: string[];
  rawPastedCodes: string[];
  foundReports: AnalyzedCodeReport[];
  onApplyCorrections: (corrections: Record<string, string>) => void;
}

export function IssuesTab({ missingCodes, uniqueDbCodes, rawPastedCodes, foundReports, onApplyCorrections }: IssuesTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Issues</h2>
        {missingCodes.length > 0 && (
          <span className="px-2 py-0.5 bg-[#fef3ed] text-[#9b4a1c] text-[10px] font-mono font-bold rounded border border-[#e78a58]/30">
            {missingCodes.length} unmatched
          </span>
        )}
      </div>

      {missingCodes.length > 0 ? (
        <MissingCodesSection
          missingCodes={missingCodes}
          allDbCodes={uniqueDbCodes}
          rawPastedCodes={rawPastedCodes}
          foundReports={foundReports}
          onApplyCorrections={onApplyCorrections}
        />
      ) : (
        <div className="bg-[#eef4f1] border border-[#2b5346]/20 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-[#2b5346] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#2b5346]">No issues detected</p>
          <p className="text-xs text-[#3d3d3d] mt-1">All codes matched. Multi-province duplicates are combined automatically.</p>
        </div>
      )}
    </div>
  );
}
