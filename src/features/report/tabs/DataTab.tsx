import React from "react";
import { AnalyzedCodeReport, DiscountCodeData } from "../../../types";
import DetailedTable from "../../../components/DetailedTable";
import DataExplorer from "../../../components/DataExplorer";

interface DataTabProps {
  foundReports: AnalyzedCodeReport[];
  uniqueChannels: string[];
  dbRows: DiscountCodeData[];
  fileName: string | null;
  onSwitchToExplorer: () => void;
}

export function DataTab({ foundReports, uniqueChannels, dbRows, fileName, onSwitchToExplorer }: DataTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-[#1a1a1a]">Data</h2>
          <span className="text-[10px] text-[#a1a1a1] font-mono">All {foundReports.length} codes</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onSwitchToExplorer} className="text-xs font-medium text-[#2b5346] hover:underline cursor-pointer">
            Raw explorer
          </button>
        </div>
      </div>
      <DetailedTable reports={foundReports} channels={uniqueChannels} />
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-4 shadow-3xs">
        <h3 className="text-xs font-semibold text-[#3d3d3d] mb-3 uppercase tracking-wide">Source explorer</h3>
        <DataExplorer dbRows={dbRows} fileName={fileName} />
      </div>
    </div>
  );
}
