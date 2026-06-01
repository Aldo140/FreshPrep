/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { AnalyzedCodeReport, SortField, SortOrder } from "../types";
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  X,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Check
} from "lucide-react";

interface DetailedTableProps {
  reports: AnalyzedCodeReport[];
  channels: string[];
}

export default function DetailedTable({ reports, channels }: DetailedTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [badgeFilter, setBadgeFilter] = useState<string>("ALL");
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("overallScore");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Column Visibility state
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    rank: true,
    discount_code: true,
    province: true,
    channel: true,
    signups: true,
    payingCx: true,
    conversion: true,
    ltv3: true,
    ltv6: true,
    ltv12: true,
    discount: true,
    efficiency: true,
    grade: true,
    score: true,
  });

  const columnLabels = [
    { key: "rank", label: "Rank" },
    { key: "discount_code", label: "Code" },
    { key: "province", label: "Province" },
    { key: "channel", label: "Channel" },
    { key: "signups", label: "Signups" },
    { key: "payingCx", label: "Paying" },
    { key: "conversion", label: "Conversion %" },
    { key: "ltv3", label: "Avg LTV 3" },
    { key: "ltv6", label: "Avg LTV 6" },
    { key: "ltv12", label: "Avg LTV 12" },
    { key: "discount", label: "Discount Used" },
    { key: "efficiency", label: "Efficiency Ratio" },
    { key: "grade", label: "Grade" },
    { key: "score", label: "Overall Score" },
  ];

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      // Keep at least two columns visible
      const visibleCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && visibleCount <= 2) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Score Badge display details
  const getScoreBadgeClass = (badge: string) => {
    switch (badge) {
      case "Elite":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "Strong":
        return "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20";
      case "Good":
        return "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20";
      case "Average":
        return "bg-[#fdf8e1] text-[#8a6f00] border-[#e7bd27]/30";
      case "Weak":
      default:
        return "bg-[#ffd0d0] text-[#850b0b] border-[#850b0b]/20";
    }
  };

  const getPerformanceGradeClass = (grade: string) => {
    if (grade.startsWith("A")) return "text-[#2b5346] font-extrabold";
    if (grade.startsWith("B")) return "text-[#2b5346] font-bold";
    if (grade.startsWith("C")) return "text-[#8a6f00] font-medium";
    return "text-[#850b0b] font-medium";
  };

  // Handle columns sorting triggers
  const requestSort = (field: SortField) => {
    let order: SortOrder = "asc";
    if (sortField === field && sortOrder === "asc") {
      order = "desc";
    }
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400 flex-shrink-0" />;
    }
    return sortOrder === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-[#2b5346] flex-shrink-0 font-extrabold" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 text-[#2b5346] flex-shrink-0 font-extrabold" />;
  };

  // Filter and sort the dataset based on active inputs
  const processedReports = useMemo(() => {
    let result = [...reports];

    // 1. Search filter
    if (searchTerm) {
      const q = searchTerm.trim().toUpperCase();
      result = result.filter(
        item => 
          item.discount_code.toUpperCase().includes(q) || 
          item.channel.toUpperCase().includes(q) ||
          (item.Province && item.Province.toUpperCase().includes(q))
      );
    }

    // 2. Conversion performance scale rating filter
    if (ratingFilter !== "ALL") {
      result = result.filter(item => item.performanceRating === ratingFilter);
    }

    // 3. Channel filter
    if (channelFilter !== "ALL") {
      result = result.filter(item => item.channel === channelFilter);
    }

    // 4. Overall score tier badge filter
    if (badgeFilter !== "ALL") {
      result = result.filter(item => item.overallScoreBadge === badgeFilter);
    }

    // 5. Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "Conversion") {
        valA = a.calculatedConversion;
        valB = b.calculatedConversion;
      }

      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc" 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" 
          ? valA - valB 
          : valB - valA;
      }
    });

    return result;
  }, [reports, searchTerm, ratingFilter, channelFilter, badgeFilter, sortField, sortOrder]);

  // Page Calculations
  const totalPages = Math.max(1, Math.ceil(processedReports.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedReports.slice(startIndex, startIndex + itemsPerPage);
  }, [processedReports, currentPage]);

  const handlePageChange = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setRatingFilter("ALL");
    setChannelFilter("ALL");
    setBadgeFilter("ALL");
    setCurrentPage(1);
  };

  const isFiltered = searchTerm !== "" || ratingFilter !== "ALL" || channelFilter !== "ALL" || badgeFilter !== "ALL";

  return (
    <div id="detailed-table-container" className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between font-sans">
      
      {/* Table Action Controls Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/40">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <SlidersHorizontal className="w-4 h-4 text-[#2b5346]" />
              Promo Code Ledger & Filter Controls
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Displaying {processedReports.length} of {reports.length} matched codes. Customize reports by active vectors.
            </p>
          </div>

          {/* Controls Panel */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            
            {/* Search Box */}
            <div className="relative min-w-[200px] w-full sm:w-auto flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                id="search-input"
                type="text"
                placeholder="Search code or province..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-slate-250 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2b5346] focus:border-[#2b5346] font-medium font-sans"
              />
            </div>

            {/* Overall Score Badge filter */}
            <div className="relative w-full sm:w-auto">
              <select
                id="badge-filter-select"
                value={badgeFilter}
                onChange={(e) => {
                  setBadgeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-250 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2b5346] cursor-pointer font-medium font-sans"
              >
                <option value="ALL">All Scores</option>
                <option value="Elite">Elite (95+)</option>
                <option value="Strong">Strong (85-94)</option>
                <option value="Good">Good (70-84)</option>
                <option value="Average">Average (55-69)</option>
                <option value="Weak">Weak (&lt;55)</option>
              </select>
            </div>

            {/* Channels filter */}
            <div className="relative w-full sm:w-auto">
              <select
                id="channel-filter-select"
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-250 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2b5346] cursor-pointer font-medium font-sans sm:max-w-[140px] truncate"
              >
                <option value="ALL">All Channels</option>
                {channels.map((chan) => (
                  <option key={chan} value={chan}>
                    {chan}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter Selector */}
            <div className="relative w-full sm:w-auto">
              <select
                id="rating-filter-select"
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-250 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2b5346] cursor-pointer font-medium font-sans"
              >
                <option value="ALL">All Ratings</option>
                <option value="Strong">Strong (&ge;40%)</option>
                <option value="Good">Good (30-40%)</option>
                <option value="Average">Average (20-30%)</option>
                <option value="Weak">Weak (10-20%)</option>
                <option value="Poor">Poor (&lt;10%)</option>
                <option value="Too Early">Too Early (&lt;5 signups)</option>
              </select>
            </div>

            {/* Column Visibility Selector trigger */}
            <div className="relative w-full sm:w-auto font-sans">
              <button
                type="button"
                id="col-visibility-trigger"
                onClick={() => setShowColMenu(!showColMenu)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-250 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center sm:justify-start gap-1 cursor-pointer font-medium transition"
              >
                <Eye className="w-3.5 h-3.5 text-slate-455" />
                Columns
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Popover Dropdown list */}
              {showColMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowColMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-20 max-h-80 overflow-y-auto font-sans">
                    <p className="text-[9.5px] uppercase font-bold tracking-wider text-slate-450 px-2 pb-1 bg-slate-50 border-b border-slate-100 rounded mb-1">
                      Column Selection
                    </p>
                    <div className="space-y-0.5">
                      {columnLabels.map((col) => (
                        <button
                          key={col.key}
                          type="button"
                          onClick={() => toggleColumn(col.key)}
                          className="w-full flex items-center justify-between text-[11.5px] px-2 py-1 text-slate-600 hover:bg-slate-50 rounded-md text-left"
                        >
                          <span>{col.label}</span>
                          {visibleColumns[col.key] && (
                            <Check className="w-3.5 h-3.5 text-[#2b5346] font-extrabold" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Selected badge indicators */}
        {isFiltered && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100" id="active-filters">
            <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider font-mono">Filters active:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Search: {searchTerm}
                <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-slate-650" onClick={() => setSearchTerm("")} />
              </span>
            )}
            {badgeFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-205">
                Score: {badgeFilter}
                <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-slate-650" onClick={() => setBadgeFilter("ALL")} />
              </span>
            )}
            {channelFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-105 text-slate-700 border border-slate-205">
                Channel: {channelFilter}
                <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-slate-650" onClick={() => setChannelFilter("ALL")} />
              </span>
            )}
            {ratingFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-205">
                Rating: {ratingFilter}
                <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-slate-650" onClick={() => setRatingFilter("ALL")} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[10px] text-[#2b5346] font-bold hover:underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table Layout */}
      <div className="overflow-x-auto w-full" id="detailed-table-viewport">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold font-mono tracking-wider select-none uppercase text-[10px]">
              {visibleColumns.rank && (
                <th className="py-2.5 px-4 text-center w-12 border-r border-slate-100">#</th>
              )}
              {visibleColumns.discount_code && (
                <th 
                  className="py-2.5 px-5 cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("discount_code")}
                >
                  <div className="flex items-center">
                    Promo Code <SortIcon field="discount_code" />
                  </div>
                </th>
              )}
              {visibleColumns.province && (
                <th 
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors text-center"
                  onClick={() => requestSort("Province")}
                >
                  <div className="flex items-center justify-center">
                    Prov <SortIcon field="Province" />
                  </div>
                </th>
              )}
              {visibleColumns.channel && (
                <th 
                  className="py-2.5 px-5 cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("channel")}
                >
                  <div className="flex items-center">
                    Channel <SortIcon field="channel" />
                  </div>
                </th>
              )}
              {visibleColumns.signups && (
                <th 
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("Signups")}
                >
                  <div className="flex items-center justify-end">
                    Signups <SortIcon field="Signups" />
                  </div>
                </th>
              )}
              {visibleColumns.payingCx && (
                <th 
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("Paying cx")}
                >
                  <div className="flex items-center justify-end">
                    Paying <SortIcon field="Paying cx" />
                  </div>
                </th>
              )}
              {visibleColumns.conversion && (
                <th 
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("Conversion")}
                >
                  <div className="flex items-center justify-end">
                    Conv % <SortIcon field="Conversion" />
                  </div>
                </th>
              )}
              {visibleColumns.ltv3 && (
                <th 
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("Avg LTV 3")}
                >
                  <div className="flex items-center justify-end font-medium">
                    LTV 3 <SortIcon field="Avg LTV 3" />
                  </div>
                </th>
              )}
              {visibleColumns.ltv6 && (
                <th 
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("Avg LTV 6")}
                >
                  <div className="flex items-center justify-end font-medium">
                    LTV 6 <SortIcon field="Avg LTV 6" />
                  </div>
                </th>
              )}
              {visibleColumns.ltv12 && (
                <th 
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("Avg LTV 12")}
                >
                  <div className="flex items-center justify-end font-extrabold">
                    LTV 12 <SortIcon field="Avg LTV 12" />
                  </div>
                </th>
              )}
              {visibleColumns.discount && (
                <th 
                  className="py-2.5 px-5 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("total_discount_used")}
                >
                  <div className="flex items-center justify-end">
                    Discount <SortIcon field="total_discount_used" />
                  </div>
                </th>
              )}
              {visibleColumns.efficiency && (
                <th 
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("efficiencyRatio")}
                >
                  <div className="flex items-center justify-end text-[#2b5346]">
                    Eff. Ratio <SortIcon field="efficiencyRatio" />
                  </div>
                </th>
              )}
              {visibleColumns.grade && (
                <th 
                  className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("performanceGrade")}
                >
                  <div className="flex items-center justify-center">
                    Grade <SortIcon field="performanceGrade" />
                  </div>
                </th>
              )}
              {visibleColumns.score && (
                <th 
                  className="py-2.5 px-5 text-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => requestSort("overallScore")}
                >
                  <div className="flex items-center justify-center">
                    Score <SortIcon field="overallScore" />
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-105 bg-white text-slate-700">
            {currentItems.length > 0 ? (
              currentItems.map((row, index) => (
                <tr
                  key={`${row.discount_code}-${row.Province || "ON"}-${index}`}
                  className="hover:bg-slate-50/55 odd:bg-slate-50/15 transition-colors group animate-fade-in"
                >
                  {visibleColumns.rank && (
                    <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[10.5px] border-r border-slate-100 bg-slate-50/5">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                  )}
                  {visibleColumns.discount_code && (
                    <td className="py-2.5 px-5 font-mono font-black text-slate-900 text-xs">
                      {row.discount_code}
                    </td>
                  )}
                  {visibleColumns.province && (
                    <td className="py-2.5 px-4 text-center font-mono font-semibold">
                      <span className="bg-slate-100 text-[10px] px-1.5 py-0.5 rounded text-slate-650 border border-slate-150 uppercase">
                        {row.Province || "ON"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.channel && (
                    <td className="py-2.5 px-5 text-slate-500 max-w-[130px] truncate" title={row.channel}>
                      {row.channel}
                    </td>
                  )}
                  {visibleColumns.signups && (
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {row.Signups.toLocaleString()}
                    </td>
                  )}
                  {visibleColumns.payingCx && (
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {row["Paying cx"].toLocaleString()}
                    </td>
                  )}
                  {visibleColumns.conversion && (
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                      {row.calculatedConversion.toFixed(1)}%
                    </td>
                  )}
                  {visibleColumns.ltv3 && (
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(row["Avg LTV 3"])}
                    </td>
                  )}
                  {visibleColumns.ltv6 && (
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(row["Avg LTV 6"])}
                    </td>
                  )}
                  {visibleColumns.ltv12 && (
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-medium">
                      {formatCurrency(row["Avg LTV 12"])}
                    </td>
                  )}
                  {visibleColumns.discount && (
                    <td className="py-2.5 px-5 text-right font-mono text-slate-550">
                      {formatCurrency(row.total_discount_used)}
                    </td>
                  )}
                  {visibleColumns.efficiency && (
                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-[#2b5346]">
                      {row.efficiencyRatio.toFixed(1)}x
                    </td>
                  )}
                  {visibleColumns.grade && (
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block text-xs uppercase px-1 font-mono ${getPerformanceGradeClass(row.performanceGrade)}`}>
                        {row.performanceGrade}
                      </span>
                    </td>
                  )}
                  {visibleColumns.score && (
                    <td className="py-2.5 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9.5px] font-bold border rounded-md font-mono ${getScoreBadgeClass(row.overallScoreBadge)}`}>
                        <span className="font-extrabold">{row.overallScore}</span>
                        <span>{row.overallScoreBadge}</span>
                      </span>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                  No promotional codes match the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Controller */}
      <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
        <p className="text-[10px] font-mono text-slate-500">
          Showing rows {processedReports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
          {Math.min(currentPage * itemsPerPage, processedReports.length)} of {processedReports.length} results
        </p>

        <div className="flex gap-1" id="pagination-controls font-sans">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
              currentPage === 1
                ? "text-slate-400 border-slate-200 cursor-not-allowed bg-slate-50"
                : "text-slate-700 border-slate-250 hover:bg-slate-100 transition cursor-pointer bg-white"
            }`}
          >
            Prev
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((idx) => {
            if (totalPages > 5 && Math.abs(currentPage - idx) > 1 && idx !== 1 && idx !== totalPages) {
              if (idx === 2 || idx === totalPages - 1) {
                return <span key={idx} className="px-1 text-slate-400 font-sans">...</span>;
              }
              return null;
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePageChange(idx)}
                className={`w-7 h-7 flex items-center justify-center text-[11px] rounded font-bold cursor-pointer transition ${
                  currentPage === idx
                    ? "bg-[#2b5346] text-white shadow-2xs border border-[#2b5346]"
                    : "text-slate-600 border border-slate-250 hover:bg-slate-100 bg-white"
                }`}
              >
                {idx}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
              currentPage === totalPages
                ? "text-slate-400 border-slate-200 cursor-not-allowed bg-slate-50"
                : "text-slate-700 border-slate-250 hover:bg-slate-100 transition cursor-pointer bg-white"
            }`}
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );
}
