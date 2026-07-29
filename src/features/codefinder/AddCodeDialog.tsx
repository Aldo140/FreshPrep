/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Plus, CalendarDays, MapPin } from "lucide-react";
import { EventSchedule } from "../../hooks/useEventSchedule";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

export interface AddCodeCandidate {
  code: string;
  name: string | null;
  province: string | null;
  date: string | null;
  inSchedule: boolean;
}

/**
 * Builds the full pickable code universe: everything in the BD wrap-up schedule,
 * plus any BD/EV code seen in the built-in signup DB that the schedule doesn't
 * know about (real codes that were never written into the wrap-up sheet).
 */
export function buildCodeUniverse(schedule: EventSchedule, dbCodes: string[]): AddCodeCandidate[] {
  const out: AddCodeCandidate[] = [];
  const seen = new Set<string>();

  for (const [code, entry] of Object.entries(schedule)) {
    const up = code.toUpperCase();
    seen.add(up);
    out.push({ code: up, name: entry.name, province: entry.province, date: entry.date, inSchedule: true });
  }
  for (const raw of dbCodes) {
    const up = raw.trim().toUpperCase();
    if (!up || seen.has(up)) continue;
    seen.add(up);
    out.push({ code: up, name: null, province: null, date: null, inSchedule: false });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

interface AddCodeDialogProps {
  eventName: string;
  universe: AddCodeCandidate[];
  alreadyInEvent: Set<string>;
  /** code → the event that currently owns it; adding moves it out of that event. */
  claimedBy: Map<string, { id: string; name: string }>;
  onAdd: (code: string) => void;
  onClose: () => void;
}

export function AddCodeDialog({ eventName, universe, alreadyInEvent, claimedBy, onAdd, onClose }: AddCodeDialogProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Seed with codes whose event name resembles this group's, so the common case
  // ("this event has another year I know about") needs no typing at all.
  const suggestions = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) {
      const stem = eventName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (stem.length === 0) return [];
      return universe
        .filter(c => c.name && stem.some(w => c.name!.toLowerCase().includes(w)))
        .filter(c => !alreadyInEvent.has(c.code))
        .slice(0, 40);
    }
    return universe
      .filter(c => c.code.includes(q) || (c.name?.toUpperCase().includes(q) ?? false))
      .filter(c => !alreadyInEvent.has(c.code))
      .sort((a, b) => {
        const aStarts = a.code.startsWith(q) ? 0 : 1;
        const bStarts = b.code.startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.code.localeCompare(b.code);
      })
      .slice(0, 60);
  }, [query, universe, alreadyInEvent, eventName]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
        <div className="px-5 py-4 border-b border-[#f0f0ee] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Add a code to</p>
            <p className="text-sm font-bold text-[#1a1a1a] truncate">{eventName}</p>
          </div>
          <button onClick={onClose} className="text-[#c0c0c0] hover:text-[#1a1a1a] cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#f5f5f3] shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a1a1a1]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search any code or event name…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-xs font-mono text-[#1a1a1a] outline-none focus:border-[#2b5346] focus:bg-white"
            />
          </div>
          {!query.trim() && suggestions.length > 0 && (
            <p className="text-[9px] font-mono text-[#a1a1a1] mt-2">
              Other codes with a similar event name — or search for any code above.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {suggestions.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-[#a1a1a1]">
              {query.trim() ? "No codes match that search." : "Type to search all available codes."}
            </p>
          ) : (
            <div className="divide-y divide-[#f5f5f3]">
              {suggestions.map(c => (
                <button
                  key={c.code}
                  onClick={() => { onAdd(c.code); onClose(); }}
                  className="w-full px-5 py-2.5 flex items-center gap-2.5 text-left hover:bg-[#f7faf8] cursor-pointer group"
                >
                  <Plus className="w-3 h-3 text-[#c0c0c0] group-hover:text-[#2b5346] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black font-mono text-[#0f0f0f] truncate">{c.code}</p>
                    <p className="text-[9px] font-mono text-[#a1a1a1] truncate">
                      {c.name ?? "not in wrap-up schedule · from signup DB"}
                    </p>
                    {claimedBy.has(c.code) && (
                      <p className="text-[9px] font-mono text-[#c9a000] truncate mt-0.5">
                        currently in “{claimedBy.get(c.code)!.name}” — adding moves it here
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.date && (
                      <span className="flex items-center gap-0.5 text-[9px] font-mono text-[#a1a1a1]">
                        <CalendarDays className="w-2.5 h-2.5" />{c.date}
                      </span>
                    )}
                    {c.province && (
                      <span
                        className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border"
                        style={{ color: provColor(c.province), borderColor: provColor(c.province) + "40", backgroundColor: provColor(c.province) + "12" }}
                      >
                        {c.province}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#f0f0ee] bg-[#fafafa] shrink-0 flex items-center gap-2">
          <MapPin className="w-3 h-3 text-[#c0c0c0]" />
          <p className="text-[9px] font-mono text-[#a1a1a1]">{universe.length.toLocaleString()} codes available</p>
        </div>
      </div>
    </div>
  );
}
