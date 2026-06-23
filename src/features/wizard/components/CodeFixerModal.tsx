import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Search, Sparkles, Trash2, X } from "lucide-react";
import { getFuzzySuggestionsWithConfidence } from "../../../utils/fuzzy";
import { toCanonicalCode } from "../../../utils/fileParser";

export interface CodeScanEntry {
  original: string;
  normalized: string;
  resolved: string | null;
  status: "exact" | "format-fixed" | "missing";
}

export interface CodeScanResult {
  entries: CodeScanEntry[];
  nonEmptyLines: number;
  multiCodeLines: number;
  duplicates: number;
  missing: string[];
  hasIssues: boolean;
}

export function scanCodeInput(rawText: string, allCodes: string[]): CodeScanResult {
  const cleanToken = (value: string) =>
    value
      .trim()
      .replace(/^(?:\d+[.)]|[-•])\s*/, "")
      .replace(/^["']|["']$/g, "")
      .trim()
      .toUpperCase();
  const exactMap = new Map(allCodes.map(code => [code.trim().toUpperCase(), code.trim().toUpperCase()]));
  const canonicalMap = new Map<string, string>();
  for (const code of allCodes) {
    const canonical = toCanonicalCode(code);
    if (canonical && !canonicalMap.has(canonical)) canonicalMap.set(canonical, code.trim().toUpperCase());
  }

  const lines = rawText.split(/\r?\n/);
  const nonEmptyLines = lines.filter(line => line.trim()).length;
  let multiCodeLines = 0;
  const tokens: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    let parts = line.split(/[\t,;]+/).map(part => part.trim()).filter(Boolean);
    if (parts.length === 1) {
      const whitespaceParts = line.trim().split(/\s+/).map(cleanToken).filter(Boolean);
      const everyPartLooksLikeCode = whitespaceParts.length > 1 && whitespaceParts.every(part =>
        exactMap.has(part) || canonicalMap.has(toCanonicalCode(part))
      );
      if (everyPartLooksLikeCode) parts = whitespaceParts;
    }
    if (parts.length > 1) multiCodeLines++;
    tokens.push(...parts);
  }

  const seen = new Set<string>();
  let duplicates = 0;
  const entries: CodeScanEntry[] = [];
  for (const token of tokens) {
    const normalized = cleanToken(token);
    if (!normalized) continue;
    const duplicateKey = toCanonicalCode(normalized) || normalized;
    if (seen.has(duplicateKey)) {
      duplicates++;
      continue;
    }
    seen.add(duplicateKey);

    const exact = exactMap.get(normalized);
    if (exact) {
      entries.push({ original: token, normalized, resolved: exact, status: "exact" });
      continue;
    }
    const canonical = canonicalMap.get(toCanonicalCode(normalized));
    if (canonical) {
      entries.push({ original: token, normalized, resolved: canonical, status: "format-fixed" });
      continue;
    }
    entries.push({ original: token, normalized, resolved: null, status: "missing" });
  }

  const missing = entries.filter(entry => entry.status === "missing").map(entry => entry.normalized);
  return {
    entries,
    nonEmptyLines,
    multiCodeLines,
    duplicates,
    missing,
    hasIssues: missing.length > 0
      || duplicates > 0
      || multiCodeLines > 0
      || entries.some(entry => entry.status === "format-fixed"),
  };
}

interface CodeFixerModalProps {
  rawText: string;
  allCodes: string[];
  onClose: () => void;
  onApply: (codes: string[], analyze: boolean) => void;
}

export function CodeFixerModal({ rawText, allCodes, onClose, onApply }: CodeFixerModalProps): React.ReactElement {
  const scan = useMemo(() => scanCodeInput(rawText, allCodes), [rawText, allCodes]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const suggestions = useMemo(() => {
    const result: Record<string, ReturnType<typeof getFuzzySuggestionsWithConfidence>> = {};
    for (const code of scan.missing) {
      result[code] = getFuzzySuggestionsWithConfidence(code, allCodes, 5);
    }
    return result;
  }, [scan.missing, allCodes]);

  const validCodeMap = useMemo(
    () => new Map(allCodes.map(code => [code.trim().toUpperCase(), code.trim().toUpperCase()])),
    [allCodes],
  );
  const canonicalCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const code of allCodes) {
      const canonical = toCanonicalCode(code);
      if (canonical && !map.has(canonical)) map.set(canonical, code.trim().toUpperCase());
    }
    return map;
  }, [allCodes]);
  const resolveReplacement = (value: string | undefined): string | null => {
    const normalized = value?.trim().toUpperCase() ?? "";
    if (!normalized) return null;
    return validCodeMap.get(normalized) ?? canonicalCodeMap.get(toCanonicalCode(normalized)) ?? null;
  };

  const unresolved = scan.missing.filter(code => !removed.has(code) && !resolveReplacement(replacements[code]));

  const buildCodes = (): string[] => {
    const output: string[] = [];
    const seen = new Set<string>();
    for (const entry of scan.entries) {
      if (entry.status === "missing" && removed.has(entry.normalized)) continue;
      const value = entry.status === "missing"
        ? resolveReplacement(replacements[entry.normalized])
        : entry.resolved;
      if (!value || seen.has(value)) continue;
      seen.add(value);
      output.push(value);
    }
    return output;
  };

  const autocomplete = (code: string) => {
    const query = replacements[code]?.trim().toUpperCase() ?? "";
    if (!query) return suggestions[code] ?? [];
    const starts = allCodes
      .filter(candidate => candidate.toUpperCase().includes(query))
      .slice(0, 5)
      .map(candidate => ({ code: candidate, score: 100, tier: "High" as const }));
    return starts.length ? starts : getFuzzySuggestionsWithConfidence(query, allCodes, 5);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl border border-[#e5e5e5] shadow-2xl overflow-hidden flex flex-col">
        <header className="px-5 py-4 bg-[#fafafa] border-b border-[#ececec] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2b5346]" />
              <h3 className="text-base font-black text-[#0f0f0f]">Review and fix event codes</h3>
            </div>
            <p className="text-[10px] font-mono text-[#888] mt-1">
              Expected format: one code per line. Formatting-only corrections are applied automatically.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#e5e5e5] bg-white flex items-center justify-center text-[#888] hover:text-[#1a1a1a] cursor-pointer" aria-label="Close code fixer">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-3 border-b border-[#ececec] grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ["Input lines", scan.nonEmptyLines],
            ["Unique codes", scan.entries.length],
            ["Duplicates removed", scan.duplicates],
            ["Needs review", scan.missing.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-[#f8f7f5] border border-[#ececec] px-3 py-2">
              <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">{label}</p>
              <p className="text-lg font-black font-mono text-[#1a1a1a]">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {(scan.multiCodeLines > 0 || scan.duplicates > 0 || scan.entries.some(entry => entry.status === "format-fixed")) && (
            <div className="rounded-xl border border-[#dce9e4] bg-[#eef4f1] px-4 py-3 text-[10px] text-[#2b5346]">
              <strong>Automatic cleanup:</strong>{" "}
              {scan.multiCodeLines > 0 && `${scan.multiCodeLines} line${scan.multiCodeLines !== 1 ? "s" : ""} contained multiple codes; `}
              {scan.duplicates > 0 && `${scan.duplicates} duplicate${scan.duplicates !== 1 ? "s" : ""} removed; `}
              {scan.entries.filter(entry => entry.status === "format-fixed").length > 0
                && `${scan.entries.filter(entry => entry.status === "format-fixed").length} formatting difference${scan.entries.filter(entry => entry.status === "format-fixed").length !== 1 ? "s" : ""} corrected.`}
            </div>
          )}

          {scan.missing.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-[#2b5346] mx-auto" />
              <p className="text-sm font-bold text-[#1a1a1a] mt-2">All codes match the dataset.</p>
              <p className="text-[10px] font-mono text-[#888] mt-1">{buildCodes().length} codes are ready to analyze.</p>
            </div>
          ) : (
            scan.missing.map(code => {
              const options = autocomplete(code);
              return (
                <div key={code} className="rounded-xl border border-[#f0d1c1] overflow-hidden">
                  <div className="px-4 py-3 bg-[#fff8f4] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-[#9b4a1c] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-mono uppercase tracking-wide text-[#a1a1a1]">Code not found</p>
                        <p className="text-sm font-black font-mono text-[#1a1a1a] truncate">{code}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRemoved(previous => {
                        const next = new Set(previous);
                        next.has(code) ? next.delete(code) : next.add(code);
                        return next;
                      })}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border cursor-pointer ${removed.has(code) ? "bg-[#850b0b] text-white border-[#850b0b]" : "bg-white text-[#850b0b] border-[#850b0b]/20"}`}
                    >
                      <Trash2 className="w-3 h-3" /> {removed.has(code) ? "Removed" : "Remove"}
                    </button>
                  </div>
                  {!removed.has(code) && (
                    <div className="p-4">
                      <p className="text-[9px] font-mono uppercase tracking-wide text-[#a1a1a1] mb-2">Suggested matches</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(suggestions[code] ?? []).map(suggestion => (
                          <button
                            key={suggestion.code}
                            type="button"
                            onClick={() => setReplacements(previous => ({ ...previous, [code]: suggestion.code }))}
                            className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono cursor-pointer ${replacements[code] === suggestion.code ? "bg-[#2b5346] text-white border-[#2b5346]" : "bg-white text-[#3d3d3d] border-[#e5e5e5] hover:border-[#2b5346]/40"}`}
                          >
                            {suggestion.code} · {suggestion.score}%
                          </button>
                        ))}
                      </div>
                      <label className="block">
                        <span className="text-[9px] font-mono uppercase tracking-wide text-[#a1a1a1]">Manual replacement</span>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a1a1a1]" />
                          <input
                            value={replacements[code] ?? ""}
                            onChange={event => setReplacements(previous => ({ ...previous, [code]: event.target.value.toUpperCase() }))}
                            placeholder="Start typing a code…"
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#e5e5e5] bg-[#fafafa] text-xs font-mono outline-none focus:border-[#2b5346]"
                          />
                        </div>
                      </label>
                      {replacements[code]?.trim() && (
                        <div className="mt-1 border border-[#e8e8e8] rounded-lg overflow-hidden">
                          {options.slice(0, 5).map(option => (
                            <button
                              key={option.code}
                              type="button"
                              onClick={() => setReplacements(previous => ({ ...previous, [code]: option.code }))}
                              className="w-full px-3 py-2 text-left text-[10px] font-mono bg-white hover:bg-[#f7faf8] border-b last:border-b-0 border-[#f3f3f1] cursor-pointer"
                            >
                              {option.code}
                            </button>
                          ))}
                        </div>
                      )}
                      {replacements[code]?.trim() && !resolveReplacement(replacements[code]) && (
                        <p className="text-[9px] font-mono text-[#9b4a1c] mt-1">
                          Select a code from the suggestions so it matches the dataset exactly.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="px-5 py-4 border-t border-[#ececec] bg-[#fafafa] flex items-center justify-between gap-3">
          <p className={`text-[10px] font-mono ${unresolved.length ? "text-[#9b4a1c]" : "text-[#2b5346]"}`}>
            {unresolved.length ? `${unresolved.length} code${unresolved.length !== 1 ? "s" : ""} still need a replacement or removal.` : `${buildCodes().length} codes ready.`}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => onApply(buildCodes(), false)} disabled={unresolved.length > 0} className="px-3 py-2 rounded-lg border border-[#d0e8e2] text-[#2b5346] bg-white text-xs font-semibold disabled:opacity-40 cursor-pointer">
              Apply fixes
            </button>
            <button onClick={() => onApply(buildCodes(), true)} disabled={unresolved.length > 0 || buildCodes().length === 0} className="px-4 py-2 rounded-lg bg-[#2b5346] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer">
              Apply &amp; analyze
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
