import { useState, useCallback } from "react";
import { ReportPage, ActiveTab } from "../types";
import { AnalyzedCodeReport, KPIReportSummary } from "../types";
import { exportToExcelFile, exportToCSVFile } from "../utils/fileParser";

interface UseReportParams {
  foundReports: AnalyzedCodeReport[];
  missingCodes: string[];
  summary: KPIReportSummary;
  hasReportGenerated: boolean;
  eventName: string;
  eventDate: string;
}

export interface ReportState {
  activeTab: ActiveTab;
  isPrintPreview: boolean;
  reportPage: ReportPage;
}

export interface ReportActions {
  setActiveTab: (tab: ActiveTab) => void;
  setIsPrintPreview: (value: boolean) => void;
  setReportPage: (page: ReportPage) => void;
  exportExcel: () => void;
  exportCsv: () => void;
  reset: () => void;
}

export function useReport(params: UseReportParams): { state: ReportState; actions: ReportActions } {
  const [activeTab, setActiveTab] = useState<ActiveTab>("report");
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [reportPage, setReportPage] = useState<ReportPage>("overview");

  const exportExcel = useCallback((): void => {
    if (!params.hasReportGenerated || params.foundReports.length === 0) return;
    exportToExcelFile(params.summary, params.foundReports, params.missingCodes, params.eventName, params.eventDate);
  }, [params.hasReportGenerated, params.foundReports, params.summary, params.missingCodes, params.eventName, params.eventDate]);

  const exportCsv = useCallback((): void => {
    if (!params.hasReportGenerated || params.foundReports.length === 0) return;
    exportToCSVFile(params.foundReports);
  }, [params.hasReportGenerated, params.foundReports]);

  const reset = useCallback((): void => {
    setReportPage("overview");
    setIsPrintPreview(false);
    setActiveTab("report");
  }, []);

  return {
    state: { activeTab, isPrintPreview, reportPage },
    actions: { setActiveTab, setIsPrintPreview, setReportPage, exportExcel, exportCsv, reset },
  };
}
