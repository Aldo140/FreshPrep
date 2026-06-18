import React, { useRef, useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";

interface CustomerUploadModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
}

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
        className="bg-white rounded-2xl shadow-xl border border-[#e5e5e5] w-full max-w-md p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-black text-[#0f0f0f]">Unlock Calendar Tab</h3>
            <p className="text-xs text-[#a1a1a1] font-mono mt-0.5">Upload a customer export to enable YoY calendar analysis.</p>
          </div>
          <button onClick={onClose} className="text-[#a1a1a1] hover:text-[#1a1a1a] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
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

        <div className="flex items-start gap-2 bg-[#f8f7f5] rounded-xl p-3">
          <AlertCircle className="w-3.5 h-3.5 text-[#a1a1a1] shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold text-[#3d3d3d] font-mono uppercase tracking-wide mb-1">Expected columns</p>
            <p className="text-[10px] text-[#a1a1a1] font-mono leading-relaxed">
              signup_date · client_id · current_status · discount_code · channel · province · first_paying_date · days_till_paying
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {["CSV", "XLSX", "XLS"].map(fmt => (
            <span key={fmt} className="text-[9px] font-mono font-semibold text-[#a1a1a1] bg-[#f0f0ee] border border-[#e5e5e5] px-2 py-1 rounded">
              {fmt}
            </span>
          ))}
          <span className="text-[9px] text-[#c8c8c8] font-mono ml-auto">parsed client-side only</span>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleChange} />
      </div>
    </div>
  );
}
