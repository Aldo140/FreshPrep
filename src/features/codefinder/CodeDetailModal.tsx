/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Everything known about this code" panel — and, just as importantly, where each
 * fact came from and how confident we are in it. This is the target of every ⓘ in
 * Code Finder, so the compact list rows never have to repeat provenance inline.
 */
import React, { useEffect } from "react";
import {
  X, MapPin, Users, DollarSign, CalendarDays, TrendingUp, ShieldCheck,
  HelpCircle, FileSpreadsheet, Database,
} from "lucide-react";
import { EventSchedule } from "../../hooks/useEventSchedule";
import { EventStats } from "../../hooks/useCustomerData";
import { CodeLtv } from "../../utils/ltvDataBridge";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

function Field({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div>
      <p className="text-[8.5px] font-mono uppercase tracking-widest text-[#a1a1a1]">{label}</p>
      <p className={`text-[13px] font-bold font-mono mt-0.5 ${muted ? "text-[#c0c0c0]" : "text-[#1a1a1a]"}`}>{value}</p>
    </div>
  );
}

/** A titled block with an explicit "where this came from" line. */
function SourceBlock({
  icon, title, tone, provenance, children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "known" | "approx" | "missing";
  provenance: React.ReactNode;
  children?: React.ReactNode;
}) {
  const color = tone === "known" ? "#2b5346" : tone === "approx" ? "#8a6f00" : "#a1a1a1";
  const bg = tone === "known" ? "#f3f8f6" : tone === "approx" ? "#fdf8e1" : "#fafafa";
  const border = tone === "known" ? "#d7e5df" : tone === "approx" ? "#f0dfa8" : "#ececea";
  return (
    <section className="rounded-xl border overflow-hidden" style={{ borderColor: border }}>
      <div className="px-3.5 py-2 flex items-center gap-2" style={{ background: bg }}>
        <span style={{ color }}>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-wider font-mono" style={{ color }}>{title}</p>
      </div>
      <div className="px-3.5 py-3">
        {children}
        <p className="text-[9px] font-mono text-[#a1a1a1] leading-relaxed mt-2.5 pt-2.5 border-t border-[#f2f2f0]">
          {provenance}
        </p>
      </div>
    </section>
  );
}

interface CodeDetailModalProps {
  code: string;
  schedule: EventSchedule;
  dbStat: EventStats | null;
  dbLoading: boolean;
  ltv?: CodeLtv | null;
  payingFromLooker?: number | null;
  onClose: () => void;
}

export function CodeDetailModal({
  code, schedule, dbStat, dbLoading, ltv, payingFromLooker, onClose,
}: CodeDetailModalProps): React.ReactElement {
  const sched = schedule[code.toUpperCase()];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const province = dbStat?.homeProvince ?? sched?.province;
  const paying = payingFromLooker ?? (dbStat ? dbStat.payingSignups : null);
  const payingIsApprox = payingFromLooker == null && dbStat != null;
  const conv = dbStat && dbStat.totalSignups > 0 && paying != null ? paying / dbStat.totalSignups : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "88vh" }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0f0ee] flex items-start justify-between gap-3 shrink-0 bg-[#fafafa]">
          <div className="min-w-0">
            <h3 className="text-lg font-black font-mono text-[#1a1a1a] truncate">{code}</h3>
            <p className="text-[11px] text-[#666] mt-0.5 truncate">{sched?.name ?? "No event name on file"}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {province && (
                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                  style={{ color: provColor(province), borderColor: provColor(province) + "40", backgroundColor: provColor(province) + "12" }}
                >
                  {province}
                </span>
              )}
              {sched
                ? <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#eef4f1] text-[#2b5346]">named in wrap-up sheet</span>
                : <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#fdf8e1] text-[#8a6f00]">no wrap-up record</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-[#c0c0c0] hover:text-[#1a1a1a] cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

          {/* 1. Identity — the only thing we can ever be certain about */}
          <SourceBlock
            icon={sched ? <ShieldCheck className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
            title={sched ? "Confirmed: what this code is for" : "Unconfirmed: what this code is for"}
            tone={sched ? "known" : "missing"}
            provenance={sched
              ? <>This is a <strong className="text-[#2b5346]">recorded fact</strong>, not a guess — the BD event wrap-up
                 workbook lists <code className="text-[#3d3d3d]">{code}</code> on the {sched.province} sheet against this
                 event name, date and team. Whether it&apos;s the event <em>you</em> searched for is a separate judgement
                 shown as a match score.</>
              : <>This code isn&apos;t in the BD wrap-up workbook, so nothing states what event it belongs to. Any event
                 it&apos;s grouped under here is <strong className="text-[#8a6f00]">an assumption</strong> — most likely
                 inferred from keywords in the code text. Confirm with the province lead before relying on it.</>}
          >
            {sched ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Event name" value={sched.name} />
                <Field label="Date (as recorded)" value={sched.date ?? "—"} />
                <Field label="Team" value={sched.team ?? "—"} />
                <Field label="Province sheet" value={sched.province} />
              </div>
            ) : (
              <p className="text-xs text-[#a1a1a1]">Not found in the event wrap-up workbook.</p>
            )}
          </SourceBlock>

          {/* 2. Volume */}
          <SourceBlock
            icon={<Database className="w-3.5 h-3.5" />}
            title="Signup volume"
            tone={dbStat ? "known" : "missing"}
            provenance={dbStat
              ? <>Counted directly from the built-in per-signup database — one row per person who signed up with this
                 code. Exact, not estimated.</>
              : <>This code has no rows in the built-in signup database. It may predate it, postdate it, or have been
                 issued on a channel the database doesn&apos;t capture.</>}
          >
            {dbLoading ? (
              <p className="text-xs text-[#a1a1a1]">Loading signup database…</p>
            ) : dbStat ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Total signups" value={dbStat.totalSignups.toLocaleString()} />
                  <Field label="Event month (peak)" value={dbStat.eventMonth || "—"} />
                  <Field label="First signup" value={dbStat.firstSignupDate || "—"} />
                  <Field label="Last signup" value={dbStat.lastSignupDate || "—"} />
                </div>
                {Object.keys(dbStat.signupsByProvince).length > 0 && (
                  <div className="mt-3.5">
                    <p className="text-[8.5px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-2 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> By province
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {Object.entries(dbStat.signupsByProvince).sort((a, b) => b[1] - a[1]).map(([prov, n]) => {
                        const max = Math.max(...Object.values(dbStat.signupsByProvince));
                        return (
                          <div key={prov} className="flex items-center gap-2">
                            <span className="w-8 text-[10px] font-mono font-bold shrink-0" style={{ color: provColor(prov) }}>{prov}</span>
                            <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, backgroundColor: provColor(prov) }} />
                            </div>
                            <span className="w-8 text-right text-[10px] font-mono text-[#3d3d3d] shrink-0">{n}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[#a1a1a1]">No signup rows found for this code.</p>
            )}
          </SourceBlock>

          {/* 3. Paying customers */}
          <SourceBlock
            icon={<Users className="w-3.5 h-3.5" />}
            title="Paying customers"
            tone={paying == null ? "missing" : payingIsApprox ? "approx" : "known"}
            provenance={paying == null
              ? <>No paying-customer figure available for this code from any source.</>
              : payingIsApprox
                ? <><strong className="text-[#8a6f00]">Approximate.</strong> This comes from the signup database&apos;s
                   funnel step reaching &quot;Paying Customer&quot; — meaning the person took their first promotional
                   delivery. FreshPrep counts someone as a Customer only once total revenue exceeds $49 (they ordered
                   beyond the promo week), so this figure reads high. It is not in the bundled Looker export.</>
                : <>From the Looker Paying Customers export — total revenue over $49, i.e. the customer ordered beyond
                   their promotional week. This is FreshPrep&apos;s own definition of a Customer and the figure BD
                   reports on.</>}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field
                label={payingIsApprox ? "Paying customers ≈" : "Paying customers"}
                value={paying != null ? `${payingIsApprox ? "≈" : ""}${paying.toLocaleString()}` : "—"}
                muted={paying == null}
              />
              <Field
                label="Conversion"
                value={conv != null ? `${payingIsApprox ? "≈" : ""}${(conv * 100).toFixed(1)}%` : "—"}
                muted={conv == null}
              />
              {dbStat && (
                <>
                  <Field label="Median days to pay" value={dbStat.medianDaysToPay != null ? Math.round(dbStat.medianDaysToPay) : "—"} />
                  <Field label="Pre-existing accounts" value={dbStat.preExistingAccounts} />
                </>
              )}
            </div>
            {dbStat && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#eef4f1] text-[#2b5346]">{dbStat.statusCounts.active} active</span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#8a6f00]">{dbStat.statusCounts.paused} paused</span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#f5f5f4] text-[#5a5a5a]">{dbStat.statusCounts.closed} closed</span>
              </div>
            )}
          </SourceBlock>

          {/* 4. LTV */}
          <SourceBlock
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            title="Lifetime value"
            tone={ltv ? "known" : "missing"}
            provenance={ltv
              ? <>From the Client LTV export you loaded. Average revenue per paying customer at each horizon.</>
              : <>No LTV source is loaded. FreshPrep&apos;s current Looker exports carry only counts, and the wrap-up
                 workbook&apos;s LTV columns are hand-kept and inconsistent so they&apos;re deliberately not used. Load a
                 Client LTV export from the bar at the top of Code Finder to fill this in.</>}
          >
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <Field label="Avg LTV 3" value={ltv?.avgLtv3 != null ? `$${ltv.avgLtv3.toFixed(0)}` : "—"} muted={!ltv?.avgLtv3} />
              <Field label="Avg LTV 6" value={ltv?.avgLtv6 != null ? `$${ltv.avgLtv6.toFixed(0)}` : "—"} muted={!ltv?.avgLtv6} />
              <Field label="Avg LTV 12" value={ltv?.avgLtv12 != null ? `$${ltv.avgLtv12.toFixed(0)}` : "—"} muted={!ltv?.avgLtv12} />
            </div>
          </SourceBlock>

          {/* 5. Cost */}
          {sched && (sched.totalSpend != null || sched.cpa != null) && (
            <SourceBlock
              icon={<DollarSign className="w-3.5 h-3.5" />}
              title="Event cost"
              tone="known"
              provenance={<>Hand-entered by the province team in the BD wrap-up workbook — the only place event cost is
                recorded. Not reconciled against finance.</>}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Total spend" value={sched.totalSpend != null ? `$${sched.totalSpend.toLocaleString()}` : "—"} muted={sched.totalSpend == null} />
                <Field label="CPA (as recorded)" value={sched.cpa != null ? `$${sched.cpa.toFixed(2)}` : "—"} muted={sched.cpa == null} />
              </div>
            </SourceBlock>
          )}

          <p className="text-[9px] font-mono text-[#c0c0c0] flex items-start gap-1.5">
            <FileSpreadsheet className="w-3 h-3 shrink-0 mt-px" />
            Discount offered on first order isn&apos;t tracked in any source available to this tool.
          </p>
        </div>
      </div>
    </div>
  );
}
