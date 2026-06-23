import React, { useRef, useState } from "react";
import { ExternalLink, Upload, X } from "lucide-react";

const LOOKER_URL = "https://datastudio.google.com/u/1/reporting/025f0337-0db3-4d63-8659-8b52ba3c4b6f/page/p_g8t621xt5c";

interface CustomerUploadModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
}

const COLUMNS = [
  { name: "signup_date",       desc: "Date customer registered (e.g. Jan 5, 2025)" },
  { name: "client_id",         desc: "Unique customer ID" },
  { name: "current_status",    desc: "active / paused / closed" },
  { name: "discount_code",     desc: "Promo code used at signup" },
  { name: "channel",           desc: "BusinessDevelopment, PaidSocial, Referral, etc." },
  { name: "province",          desc: "Province where customer signed up" },
  { name: "first_paying_date", desc: "Date of first paid order (optional)" },
  { name: "days_till_paying",  desc: "Days from signup to first payment (optional)" },
];

export function CustomerUploadModal({ isOpen, isLoading, onClose, onFile }: CustomerUploadModalProps): React.ReactElement | null {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File): void => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      alert("Please upload a CSV or XLSX file.");
      return;
    }
    onFile(file);
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl border border-[#e5e5e5] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-black text-[#0f0f0f]">Upload custom signup data</h3>
            <p className="text-xs text-[#a1a1a1] font-mono mt-0.5 leading-relaxed">
              The calendar uses the built-in Jul 1, 2024 – Jun 22, 2026 dataset by default.
              Upload a newer export to override it.
            </p>
          </div>
          <button onClick={onClose} className="text-[#a1a1a1] hover:text-[#1a1a1a] cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source instructions */}
        <div className="bg-[#eef4f1] rounded-xl border border-[#2b5346]/15 px-4 py-4">
          <p className="text-[10px] font-semibold text-[#3d3d3d] font-mono uppercase tracking-wide mb-2">
            Where to get this file
          </p>
          <a
            href={LOOKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2b5346] hover:underline mb-3"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open the Signup Flow Evaluation Dashboard
          </a>
          <ol className="space-y-2 text-[11px] text-[#3d3d3d] leading-relaxed">
            {[
              ["a.", <>Open the <strong>Signup Flow Evaluation Dashboard</strong> using the link above and sign in with your Fresh Prep Google account.</>],
              ["b.", <>Go to the dashboard page or section labelled <strong>Signup to Paying Customer Conversion</strong>.</>],
              ["c.", <>At the top of that page, set the date filter to the <strong>period you want to analyze</strong>. Start before the event or campaign began and extend the end date far enough to capture later conversions.</>],
              ["d.", <>Scroll until you find the table labelled <strong>Exportable Client List</strong>. It contains individual signup records with status, discount code, province, first paying date, and days until paying.</>],
              ["e.", <>Move your cursor over the <strong>Exportable Client List</strong>. Click the <strong>three-dot menu (⋮)</strong> in the table’s top-right corner.</>],
              ["f.", <>Choose <strong>Export → CSV</strong>. Export the table itself—not the full dashboard or a PDF.</>],
              ["g.", <>Wait for the download to finish. The CSV will normally appear in your computer’s <strong>Downloads</strong> folder.</>],
              ["h.", "Return here and drag the downloaded CSV into the upload box below, or click the box and select it from Downloads."],
            ].map(([label, text]) => (
              <li key={String(label)} className="flex items-start gap-2">
                <span className="font-bold font-mono text-[#2b5346] shrink-0">{label}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-7 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            isDragOver ? "border-[#2b5346] bg-[#eef4f1]" : "border-[#e5e5e5] hover:border-[#2b5346] hover:bg-[#f8f7f5]"
          }`}
        >
          {isLoading ? (
            <div className="text-sm text-[#a1a1a1] font-mono">Parsing file…</div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-[#eef4f1] flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#2b5346]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#1a1a1a]">Drop CSV or XLSX here</p>
                <p className="text-xs text-[#a1a1a1] font-mono mt-0.5">or click to browse</p>
              </div>
            </>
          )}
        </div>

        {/* Expected columns */}
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-2">Expected columns</p>
          <div className="divide-y divide-[#f5f5f3] border border-[#f0f0ee] rounded-xl overflow-hidden">
            {COLUMNS.map(col => (
              <div key={col.name} className="flex items-baseline gap-3 px-3 py-2 bg-white">
                <span className="font-mono text-[10px] text-[#2b5346] font-semibold shrink-0">{col.name}</span>
                <span className="text-[10px] text-[#a1a1a1] leading-snug">{col.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-center gap-3">
          {["CSV", "XLSX", "XLS"].map(fmt => (
            <span key={fmt} className="text-[9px] font-mono font-semibold text-[#a1a1a1] bg-[#f0f0ee] border border-[#e5e5e5] px-2 py-1 rounded">
              {fmt}
            </span>
          ))}
          <span className="text-[9px] text-[#c8c8c8] font-mono ml-auto">parsed client-side · no data leaves browser</span>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleChange} />
      </div>
    </div>
  );
}
