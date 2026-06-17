import React from "react";
import { AnalyzedCodeReport, KPIReportSummary } from "../../types";

interface PrintPreviewProps {
  foundReports: AnalyzedCodeReport[];
  missingCodes: string[];
  summary: KPIReportSummary;
  fileName: string | null;
  eventName: string;
  eventDate: string;
  isPrintPreview: boolean;
  onClose: () => void;
}

export function PrintPreview({
  foundReports,
  missingCodes,
  summary,
  fileName,
  eventName,
  eventDate,
  isPrintPreview,
  onClose,
}: PrintPreviewProps): React.ReactElement | null {
  if (foundReports.length === 0) return null;

  const withDiscount = foundReports.filter(r => r.total_discount_used !== 0).length;
  const discountAbsent = foundReports.length > 0 && withDiscount / foundReports.length < 0.2;

  const formattedEventDate = eventDate
    ? new Date(eventDate + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div
      id="printable-pdf-executive-summary"
      className={`${
        isPrintPreview
          ? "fixed inset-0 z-50 bg-slate-100 overflow-y-auto p-4 md:p-8 flex flex-col items-center animate-fade-in"
          : "hidden"
      } text-black font-sans`}
    >
      {/* On-screen controls header container. Marked with 'no-print' class to hide in final print outputs! */}
      <div className="no-print w-full max-w-4xl bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md font-sans shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Executive Report PDF Export &amp; Print Hub
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Review and format your printable digest. Click <strong>&ldquo;Confirm &amp; Save/Print&rdquo;</strong> to trigger the print layout.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="close-preview-btn"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-250 hover:bg-slate-50 rounded-lg cursor-pointer transition shadow-3xs"
          >
            ✕ Exit Preview
          </button>
          <button
            id="trigger-print-btn"
            onClick={() => {
              try {
                window.print();
              } catch (err) {
                alert("Triggering browser print directly from the iframe failed. Please open the app in a new tab first.");
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-850 rounded-lg transition shadow-2xs font-sans cursor-pointer flex items-center gap-2"
          >
            🖨️ Confirm &amp; Save/Print
          </button>
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="w-full max-w-4xl bg-white shadow-xl p-6 md:p-12 border border-slate-200 rounded-xl print:p-0 print:border-0 print:shadow-none font-sans select-text">
        <div className="border-b-2 border-zinc-900 pb-5 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <img
                src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
                alt="FreshPrep"
                className="h-7 w-auto mb-3"
                style={{ filter: "brightness(0)" }}
              />
              <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">
                {eventName ? eventName : "Campaign Performance Report"}
              </h1>
              {(eventName || formattedEventDate) && (
                <p className="text-xs font-mono text-zinc-500 mt-0.5">
                  {eventName && "Post-Event Report"}
                  {eventName && formattedEventDate && " · "}
                  {formattedEventDate}
                </p>
              )}
              <p className="text-xs font-mono text-zinc-500 mt-1">
                Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-zinc-900 text-white font-mono font-bold text-[10px] rounded">
                INTERNAL CONFIDENTIAL
              </span>
              <p className="text-[10px] font-mono mt-2 text-zinc-500">FreshPrep Campaign Intelligence</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8 bg-zinc-50 p-5 border border-zinc-200 rounded">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold font-mono">Report Scope &amp; Matches</h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between border-b pb-1">
                <dt className="text-zinc-650">Total Codes Submitted:</dt>
                <dd className="font-bold font-mono text-zinc-900">{foundReports.length + missingCodes.length}</dd>
              </div>
              <div className="flex justify-between border-b pb-1 text-blue-800">
                <dt className="font-medium">Codes Located in Data:</dt>
                <dd className="font-bold font-mono">{summary.numCodesFound}</dd>
              </div>
              <div className="flex justify-between text-rose-700">
                <dt className="font-medium">Not found in export:</dt>
                <dd className="font-bold font-mono">{summary.numCodesMissing}</dd>
              </div>
              {summary.numCodesMissing > 0 && (
                <p className="text-[10px] text-zinc-500 mt-1">These codes weren't in the Looker export. Check your date range.</p>
              )}
            </dl>
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold font-mono">Source Metadata</h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between border-b pb-1">
                <dt className="text-zinc-650">Source Filename:</dt>
                <dd className="font-mono text-zinc-800">{fileName || "Staged CSV/XLSX Export"}</dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="text-zinc-650">Processing:</dt>
                <dd className="font-mono font-semibold">Local only. No data uploaded.</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-extrabold uppercase border-b border-zinc-950 pb-1.5 mb-3 text-zinc-900 tracking-wide font-mono">
            Key Metrics Overview
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Registrations</p>
              <p className="text-base font-black text-zinc-900 font-mono mt-1">{summary.totalSignups.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Acquisitions</p>
              <p className="text-base font-black text-zinc-900 font-mono mt-1">{summary.totalPayingCustomers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Blended Conversion</p>
              <p className="text-base font-black text-zinc-900 font-mono mt-1">{summary.blendedConversionRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">LTV 12 Combined</p>
              <p className="text-base font-black text-zinc-900 font-mono mt-1">${summary.totalLTV12.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-900 font-bold font-mono border-b border-zinc-950 pb-1 mb-2">
              Leaderboard Performance Assets
            </h2>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-zinc-600 font-bold">⭐ Highest Scoring Promo Voucher:</dt>
                <dd className="font-mono text-zinc-950 text-sm mt-0.5 font-bold">
                  {summary.bestOverallScoreCode !== "N/A"
                    ? `${summary.bestOverallScoreCode} (${summary.bestOverallScoreVal}/100)`
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-650 font-bold">🏆 Best conversion rate:</dt>
                <dd className="font-mono text-zinc-955 text-sm mt-0.5 font-bold">
                  {summary.topPerformingCodeCode !== "N/A"
                    ? `${summary.topPerformingCodeCode} (${summary.topPerformingCodeVal.toFixed(1)}%)`
                    : "N/A"}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-900 font-bold font-mono border-b border-zinc-950 pb-1 mb-2">
              Executive Portfolios
            </h2>
            <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-700 leading-relaxed">
              <li>Replicate the offer structure behind <strong>{summary.bestOverallScoreCode ?? "N/A"}</strong> in future events.</li>
              <li>Review under-performing codes for discontinuation or re-targeting.</li>
              {missingCodes.length > 0 && (
                <li>Follow up on <strong>{missingCodes.length}</strong> codes not found in the export.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-xs uppercase tracking-wider text-zinc-900 font-bold font-mono border-b border-zinc-950 pb-1 mb-2">
            Performance Breakdown Listing
          </h2>
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-800 font-mono font-bold">
                <th className="py-1 px-1">Rank</th>
                <th className="py-1 px-2">Discount Code</th>
                <th className="py-1 px-1 text-center font-mono">Prov</th>
                <th className="py-1 px-2">Channel</th>
                <th className="py-1 px-2 text-right">Signups</th>
                <th className="py-1 px-2 text-right">Paying</th>
                <th className="py-1 px-2 text-right">Conversion</th>
                <th className="py-1 px-2 text-right font-bold">Avg LTV 12</th>
                {!discountAbsent && <th className="py-1 px-2 text-right">Eff. Ratio</th>}
                <th className="py-1 px-1 text-center font-mono">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {foundReports.map((r, idx) => (
                <tr key={`${r.discount_code}-${r.Province || "ON"}-${idx}`}>
                  <td className="py-1 px-1 font-mono">{idx + 1}</td>
                  <td className="py-1 px-2 font-mono font-bold text-zinc-955">{r.discount_code}</td>
                  <td className="py-1 px-1 font-mono text-center">{r.Province || "ON"}</td>
                  <td className="py-1 px-2 truncate text-zinc-650 max-w-[124px]">{r.channel}</td>
                  <td className="py-1 px-2 text-right font-mono">{r.Signups}</td>
                  <td className="py-1 px-2 text-right font-mono">{r["Paying cx"]}</td>
                  <td className="py-1 px-2 text-right font-mono">{r.calculatedConversion.toFixed(1)}%</td>
                  <td className="py-1 px-2 text-right font-mono font-medium">${r["Avg LTV 12"].toFixed(0)}</td>
                  {!discountAbsent && <td className="py-1 px-2 text-right font-mono font-bold text-blue-700">{r.efficiencyRatio.toFixed(1)}x</td>}
                  <td className="py-1 px-1 text-center font-mono font-bold">{r.performanceGrade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t pt-4 mt-8 text-center text-[9px] text-zinc-550 font-mono">
          <p>Certified Client-Side Review Audit &bull; Generated via Event Intelligence Platform &bull; Page 1 of 1</p>
        </div>
      </div>
    </div>
  );
}
