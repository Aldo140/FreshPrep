import React, { useState } from "react";
import { Database, GitCompare, ArrowRight, ArrowLeft } from "lucide-react";

interface BdFlowPickerProps {
  onConfirm: (flow: "all" | "compare", codes: string[], codesB?: string[]) => void;
  onBack: () => void;
}

type PickerMode = "all" | "compare";

function parseCodes(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);
}

export function BdFlowPicker({ onConfirm, onBack }: BdFlowPickerProps): React.ReactElement {
  const [mode, setMode] = useState<PickerMode>("all");
  const [codesARaw, setCodesARaw] = useState("");
  const [codesBRaw, setCodesBRaw] = useState("");

  const handleConfirm = () => {
    if (mode === "all") {
      onConfirm("all", []);
    } else {
      onConfirm("compare", parseCodes(codesARaw), parseCodes(codesBRaw));
    }
  };

  const canConfirm =
    mode === "all" ||
    (mode === "compare" && parseCodes(codesARaw).length > 0 && parseCodes(codesBRaw).length > 0);

  const cardClass = (active: boolean) =>
    `rounded-xl border-2 cursor-pointer transition-all ${
      active ? "border-[#2b5346] bg-white" : "border-[#e5e5e5] bg-white hover:border-[#c5d8d1]"
    }`;

  const iconBoxClass = (active: boolean) =>
    `w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${active ? "bg-[#eef4f1]" : "bg-[#f5f5f3]"}`;

  const iconClass = (active: boolean) => `w-4 h-4 ${active ? "text-[#2b5346]" : "text-[#888]"}`;

  const textareaClass =
    "w-full text-xs font-mono rounded-lg border border-[#ddd] bg-[#fafafa] px-3 py-2 resize-none focus:outline-none focus:border-[#2b5346] focus:ring-1 focus:ring-[#2b5346]/20 placeholder:text-[#bbb]";

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f7f5]">
      <div className="flex flex-col items-center min-h-full px-6 py-10">
      <div className="w-full max-w-lg">

        <div className="mb-6">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">
            Built-in BD Events DB · Jul 1, 2024 – Jun 24, 2026
          </p>
          <h2 className="text-xl font-semibold text-[#1a1a1a] mt-1">How do you want to explore?</h2>
          <p className="text-xs text-[#666] mt-1">Choose a mode — you can change this anytime via "Edit analysis".</p>
        </div>

        <div className="space-y-3">

          {/* Option 1: All events */}
          <div onClick={() => setMode("all")} className={cardClass(mode === "all")}>
            <div className="p-4 flex items-start gap-3">
              <div className={iconBoxClass(mode === "all")}>
                <Database className={iconClass(mode === "all")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Browse all BD events</p>
                <p className="text-xs text-[#666] mt-0.5 leading-relaxed">
                  Calendar heatmap + fiscal year breakdown for every built-in BD event code
                </p>
              </div>
            </div>
          </div>

          {/* Option 2: Compare */}
          <div onClick={() => setMode("compare")} className={cardClass(mode === "compare")}>
            <div className="p-4 flex items-start gap-3">
              <div className={iconBoxClass(mode === "compare")}>
                <GitCompare className={iconClass(mode === "compare")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Compare two editions</p>
                <p className="text-xs text-[#666] mt-0.5 leading-relaxed">
                  Side-by-side signup comparison between two groups of event codes
                </p>
              </div>
            </div>
            {mode === "compare" && (
              <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-mono font-semibold text-[#2b5346] uppercase tracking-wider mb-1.5">
                      Edition A
                    </p>
                    <textarea
                      value={codesARaw}
                      onChange={e => setCodesARaw(e.target.value)}
                      placeholder={"EV-YYYVANC1\nEV-CALGSTM2"}
                      rows={4}
                      autoFocus
                      className={textareaClass}
                      style={{ fontFamily: "DM Mono, monospace" }}
                    />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                      Edition B
                    </p>
                    <textarea
                      value={codesBRaw}
                      onChange={e => setCodesBRaw(e.target.value)}
                      placeholder={"EV-YYYVANC4\nEV-CALGSTM5"}
                      rows={4}
                      className={textareaClass}
                      style={{ fontFamily: "DM Mono, monospace" }}
                    />
                  </div>
                </div>
                <p className="text-[9px] font-mono text-[#a1a1a1] mt-1.5">
                  One code per line or comma-separated
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-[#666] font-medium hover:text-[#1a1a1a] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ backgroundColor: "#2b5346", transition: "background-color 150ms" }}
            onMouseEnter={e => { if (canConfirm) e.currentTarget.style.backgroundColor = "#1a3d2f"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#2b5346"; }}
          >
            {mode === "all" ? "Explore All Events" : "Compare Editions"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
      </div>
    </div>
  );
}
