import { useState, useMemo, useCallback } from "react";
import { DiscountCodeData, AnalysisFlow, UserPersona } from "../types";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../types";
import { generateAnalysisReport, parsePastedCodes } from "../utils/fileParser";

export interface AnalysisReportResults {
  foundReports: AnalyzedCodeReport[];
  missingCodes: string[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
}

export interface PortfolioHealth {
  total: number;
  strong: number;
  average: number;
  weak: number;
}

export interface AnalysisState {
  selectedFlow: AnalysisFlow;
  inputText: string;
  compareSearch: string;
  selectedCompareCodes: string[];
  eraseKeyword: string;
  rawPastedCodes: string[];
  isAnalyzing: boolean;
  hasReportGenerated: boolean;
  filteredCompareCodes: string[];
  normalizedPastedCodes: string[];
  reportResults: AnalysisReportResults;
  portfolioHealth: PortfolioHealth | null;
  uniqueChannels: string[];
  eventName: string;
  eventDate: string;
  bdFilter: boolean;
  userPersona: UserPersona;
  editionLabels: Record<string, string>;
}

export interface AnalysisActions {
  setSelectedFlow: (flow: AnalysisFlow) => void;
  setInputText: (text: string) => void;
  setCompareSearch: (query: string) => void;
  setEraseKeyword: (keyword: string) => void;
  toggleCompareCode: (code: string) => void;
  selectAllCompareCodes: (codes: string[]) => void;
  clearCompareCodes: () => void;
  compileSpecificCodes: () => void;
  compilePortfolio: (allCodes: string[]) => void;
  compileComparison: () => void;
  applyCorrections: (corrections: Record<string, string>) => void;
  reset: () => void;
  backToWizard: () => void;
  setEventName: (name: string) => void;
  setEventDate: (date: string) => void;
  setBdFilter: (on: boolean) => void;
  setEditionLabel: (code: string, label: string) => void;
}

export function useAnalysis(
  dbRows: DiscountCodeData[],
  uniqueDbCodes: string[]
): { state: AnalysisState; actions: AnalysisActions } {
  const [selectedFlow, setSelectedFlow] = useState<AnalysisFlow>("paste");
  const [inputText, setInputText] = useState("");
  const [compareSearch, setCompareSearch] = useState("");
  const [selectedCompareCodes, setSelectedCompareCodes] = useState<string[]>([]);
  const [eraseKeyword, setEraseKeyword] = useState("");
  const [rawPastedCodes, setRawPastedCodes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasReportGenerated, setHasReportGenerated] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [bdFilter, setBdFilter] = useState(false);
  const [editionLabels, setEditionLabelsState] = useState<Record<string, string>>({});

  const setEditionLabel = useCallback((code: string, label: string): void => {
    setEditionLabelsState(prev => ({ ...prev, [code]: label }));
  }, []);

  const userPersona = useMemo((): UserPersona => {
    if (selectedFlow === "paste") return "bd-rep";
    if (selectedFlow === "all" && bdFilter) return "bd-lead";
    if (selectedFlow === "compare") return "analyst";
    return "neutral";
  }, [selectedFlow, bdFilter]);

  const filteredCompareCodes = useMemo(() => {
    const query = compareSearch.trim().toUpperCase();
    if (!query) return uniqueDbCodes.slice(0, 80);
    return uniqueDbCodes.filter(c => c.includes(query));
  }, [uniqueDbCodes, compareSearch]);

  const normalizedPastedCodes = useMemo(() => parsePastedCodes(inputText), [inputText]);

  const reportResults = useMemo(
    (): AnalysisReportResults => generateAnalysisReport(dbRows, rawPastedCodes),
    [dbRows, rawPastedCodes]
  );

  const portfolioHealth = useMemo((): PortfolioHealth | null => {
    if (!hasReportGenerated || reportResults.foundReports.length === 0) return null;
    const total = reportResults.foundReports.length;
    const strong = reportResults.foundReports.filter(r => r.calculatedConversion >= 40).length;
    const average = reportResults.foundReports.filter(r => r.calculatedConversion >= 20 && r.calculatedConversion < 40).length;
    const weak = reportResults.foundReports.filter(r => r.calculatedConversion < 20).length;
    return { total, strong, average, weak };
  }, [reportResults.foundReports, hasReportGenerated]);

  const uniqueChannels = useMemo(() =>
    Array.from(new Set(reportResults.foundReports.map(r => r.channel)))
      .filter((c): c is string => typeof c === "string" && c.length > 0)
      .sort(),
    [reportResults.foundReports]
  );

  const runWithLoading = useCallback((codes: string[]): void => {
    setIsAnalyzing(true);
    setRawPastedCodes(codes);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasReportGenerated(true);
    }, 450);
  }, []);

  const compileSpecificCodes = useCallback((): void => {
    if (normalizedPastedCodes.length === 0) {
      alert("Please enter or paste at least one discount code to analyze.");
      return;
    }
    runWithLoading(normalizedPastedCodes);
  }, [normalizedPastedCodes, runWithLoading]);

  const compilePortfolio = useCallback((allCodes: string[]): void => {
    if (allCodes.length === 0) return;
    runWithLoading(allCodes);
  }, [runWithLoading]);

  const compileComparison = useCallback((): void => {
    if (selectedCompareCodes.length < 2) {
      alert("Please select at least 2 distinct promo codes to compare side-by-side.");
      return;
    }
    runWithLoading(selectedCompareCodes);
  }, [selectedCompareCodes, runWithLoading]);

  const toggleCompareCode = useCallback((code: string): void => {
    setSelectedCompareCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const applyCorrections = useCallback((corrections: Record<string, string>): void => {
    const newCodes = rawPastedCodes.map(code => corrections[code] !== undefined ? corrections[code] : code);
    const unique = Array.from(new Set(newCodes));
    setRawPastedCodes(unique);
    setInputText(unique.join("\n"));
  }, [rawPastedCodes]);

  const reset = useCallback((): void => {
    setHasReportGenerated(false);
    setRawPastedCodes([]);
    setInputText("");
    setSelectedCompareCodes([]);
    setCompareSearch("");
    setSelectedFlow("paste");
    setEventName("");
    setEventDate("");
    setBdFilter(false);
    setEditionLabelsState({});
  }, []);

  // Returns to wizard without clearing inputs — codes and event name are preserved
  const backToWizard = useCallback((): void => {
    setHasReportGenerated(false);
  }, []);

  return {
    state: {
      selectedFlow, inputText, compareSearch, selectedCompareCodes, eraseKeyword,
      rawPastedCodes, isAnalyzing, hasReportGenerated,
      filteredCompareCodes, normalizedPastedCodes, reportResults,
      portfolioHealth, uniqueChannels, eventName, eventDate,
      bdFilter, userPersona, editionLabels,
    },
    actions: {
      setSelectedFlow, setInputText, setCompareSearch, setEraseKeyword,
      toggleCompareCode,
      selectAllCompareCodes: setSelectedCompareCodes,
      clearCompareCodes: () => setSelectedCompareCodes([]),
      compileSpecificCodes, compilePortfolio, compileComparison,
      applyCorrections, reset, backToWizard, setEventName, setEventDate,
      setBdFilter, setEditionLabel,
    },
  };
}
