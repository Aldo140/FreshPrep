/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { AnalyzedCodeReport, KPIReportSummary, UserPersona } from "../../../types";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Layers, MapPin, Radio } from "lucide-react";

interface KeyFindingsSectionProps {
  reports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  eventDate?: string;
  userPersona: UserPersona;
}

type Tone = "good" | "warn" | "bad" | "neutral";
interface Finding {
  key: string;
  icon: React.ReactNode;
  text: React.ReactNode;
  tone: Tone;
}

const provincesOf = (r: AnalyzedCodeReport) =>
  (r.Province ?? "ON").split("+").map(p => p.trim()).filter(Boolean);

export default function KeyFindingsSection({ reports, summary, eventDate, userPersona }: KeyFindingsSectionProps) {
  const calc = useMemo(() => {
    if (reports.length === 0) return null;

    const byConversion = [...reports].sort((a, b) => b.calculatedConversion - a.calculatedConversion);
    const byVolume = [...reports].sort((a, b) => b.Signups - a.Signups);
    const best = byConversion[0];
    const worst = byConversion[byConversion.length - 1];
    const biggest = byVolume[0];
    const aboveTarget = reports.filter(r => r.calculatedConversion >= 40);
    const belowTarget = reports.filter(r => r.calculatedConversion < 20);

    const avgConversion = reports.reduce((s, r) => s + r.calculatedConversion, 0) / reports.length;
    const avgLTV = reports.reduce((s, r) => s + r["Avg LTV 12"], 0) / reports.length;
    const highestLTV = [...reports].sort((a, b) => b["Avg LTV 12"] - a["Avg LTV 12"])[0];

    // Volume concentration — with no LTV, signup volume is the weight that matters
    const topCount = Math.min(3, reports.length);
    const topVolume = byVolume.slice(0, topCount).reduce((s, r) => s + r.Signups, 0);
    const concentration = summary.totalSignups > 0 ? (topVolume / summary.totalSignups) * 100 : 0;

    // Segment rollups
    const roll = (keyOf: (r: AnalyzedCodeReport) => string[]) => {
      const acc = new Map<string, { signups: number; paying: number; codes: number }>();
      reports.forEach(r => keyOf(r).forEach(k => {
        const cur = acc.get(k) ?? { signups: 0, paying: 0, codes: 0 };
        cur.signups += r.Signups; cur.paying += r["Paying cx"]; cur.codes += 1;
        acc.set(k, cur);
      }));
      return Array.from(acc.entries())
        .map(([key, v]) => ({ key, ...v, conv: v.signups > 0 ? (v.paying / v.signups) * 100 : 0 }))
        .filter(s => s.signups > 0);
    };

    const channels = roll(r => [r.channel?.trim() || "Unattributed"]);
    const provinces = roll(provincesOf);

    return {
      best, worst, biggest, aboveTarget, belowTarget, highestLTV,
      avgConversion, avgLTV, concentration, topCount, channels, provinces,
    };
  }, [reports, summary.totalSignups]);

  if (!calc) return null;

  const {
    best, worst, biggest, aboveTarget, belowTarget, highestLTV,
    avgConversion, avgLTV, concentration, topCount, channels, provinces,
  } = calc;
  const n = reports.length;
  const isSingle = n === 1;
  const hasLtv = summary.hasLtvData;

  // FreshPrep customers only count as paying from their 2nd box (~1–2 weeks post-signup),
  // so a fresh event always looks worse than it will finish.
  const eventDaysDelta = eventDate
    ? Math.floor((Date.now() - new Date(eventDate + "T00:00:00").getTime()) / 86_400_000)
    : null;
  const isRecentEvent = eventDaysDelta !== null && eventDaysDelta <= 14;

  const maturityNote = (() => {
    if (isRecentEvent) {
      return (
        <span className="block mt-1 text-[10px] opacity-70">
          The event was {eventDaysDelta}d ago — conversions are still landing. Customers only count as paying from their 2nd box, the first full-price week.
        </span>
      );
    }
    if (!eventDate) {
      return (
        <span className="block mt-1 text-[10px] opacity-70">
          Paying customers are counted from the 2nd box, not the discounted first order. A recent event will keep climbing for another week or two.
        </span>
      );
    }
    return null;
  })();

  const findings: Finding[] = [];

  /* 1 — The verdict on conversion */
  if (isSingle) {
    const tone: Tone = best.calculatedConversion >= 40 ? "good" : best.calculatedConversion >= 20 ? "warn" : "bad";
    findings.push({
      key: "verdict",
      icon: tone === "good" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />,
      tone,
      text: <>
        <strong className="font-mono">{best.discount_code}</strong> turned{" "}
        <strong>{best.Signups.toLocaleString()}</strong> signups into{" "}
        <strong>{best["Paying cx"].toLocaleString()}</strong> paying customers —{" "}
        <strong>{best.calculatedConversion.toFixed(1)}%</strong>
        {tone === "good" ? ", above the 40% target." : tone === "warn" ? ", inside the 20–39% average band." : ", below the 20% floor."}
        {tone !== "good" && maturityNote}
      </>,
    });
  } else if (aboveTarget.length > 0) {
    findings.push({
      key: "verdict",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      tone: "good",
      text: <>
        <strong>{aboveTarget.length} of {n} codes</strong> hit the 40% target.{" "}
        {aboveTarget.length === 1
          ? <><strong className="font-mono">{aboveTarget[0].discount_code}</strong> is the only one clearing it, at <strong>{aboveTarget[0].calculatedConversion.toFixed(1)}%</strong>.</>
          : <>Best rate: <strong className="font-mono">{best.discount_code}</strong> at <strong>{best.calculatedConversion.toFixed(1)}%</strong> on {best.Signups.toLocaleString()} signups.</>}
      </>,
    });
  } else {
    findings.push({
      key: "verdict",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      tone: "warn",
      text: <>
        No code cleared 40% — the blended rate is <strong>{summary.blendedConversionRate.toFixed(1)}%</strong> across{" "}
        <strong>{summary.totalSignups.toLocaleString()}</strong> signups. Best result:{" "}
        <strong className="font-mono">{best.discount_code}</strong> at <strong>{best.calculatedConversion.toFixed(1)}%</strong>.
        {maturityNote}
      </>,
    });
  }

  /* 2 — Where the volume actually sits. With no LTV, signups are the weight. */
  if (!isSingle && summary.totalSignups > 0) {
    const share = (biggest.Signups / summary.totalSignups) * 100;
    const delta = biggest.calculatedConversion - summary.blendedConversionRate;
    const pulls = delta >= 2 ? "up" : delta <= -2 ? "down" : "flat";
    findings.push({
      key: "weight",
      icon: <Layers className="w-3.5 h-3.5" />,
      tone: pulls === "up" ? "good" : pulls === "down" ? "bad" : "neutral",
      text: <>
        <strong className="font-mono">{biggest.discount_code}</strong> is your heaviest code —{" "}
        <strong>{biggest.Signups.toLocaleString()}</strong> signups, {share.toFixed(0)}% of the total — and it converts at{" "}
        <strong>{biggest.calculatedConversion.toFixed(1)}%</strong>.{" "}
        {pulls === "up"
          ? <>That pulls the blended rate up by {delta.toFixed(1)} pts.</>
          : pulls === "down"
            ? <>That drags the blended rate down by {Math.abs(delta).toFixed(1)} pts — fixing this one code moves the portfolio more than any other.</>
            : <>It sits on the portfolio average, so the blended rate is a fair read of the whole set.</>}
      </>,
    });
  }

  /* 3 — Concentration risk */
  if (n >= 4 && concentration >= 50) {
    findings.push({
      key: "concentration",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      tone: "neutral",
      text: <>
        <strong>{concentration.toFixed(0)}%</strong> of all signups came from just {topCount} of {n} codes.{" "}
        The rest of the portfolio is long-tail — judge those on rate, not volume.
      </>,
    });
  }

  /* 4 — Best segment (channel, then province) */
  if (channels.length > 1) {
    const ranked = [...channels].sort((a, b) => b.conv - a.conv);
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];
    if (top.conv - bottom.conv >= 5) {
      findings.push({
        key: "channel",
        icon: <Radio className="w-3.5 h-3.5" />,
        tone: "neutral",
        text: <>
          <strong>{top.key}</strong> converts best at <strong>{top.conv.toFixed(1)}%</strong> ({top.signups.toLocaleString()} signups),{" "}
          against <strong>{bottom.key}</strong> at <strong>{bottom.conv.toFixed(1)}%</strong>. Shift budget toward the channel that closes.
        </>,
      });
    }
  } else if (provinces.length > 1) {
    const ranked = [...provinces].sort((a, b) => b.conv - a.conv);
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];
    if (top.conv - bottom.conv >= 5) {
      findings.push({
        key: "province",
        icon: <MapPin className="w-3.5 h-3.5" />,
        tone: "neutral",
        text: <>
          <strong>{top.key}</strong> leads on conversion at <strong>{top.conv.toFixed(1)}%</strong> ({top.signups.toLocaleString()} signups);{" "}
          <strong>{bottom.key}</strong> trails at <strong>{bottom.conv.toFixed(1)}%</strong>.
        </>,
      });
    }
  }

  /* 5 — Weak codes */
  if (!isSingle && belowTarget.length > 0) {
    const wastedSignups = belowTarget.reduce((s, r) => s + r.Signups, 0);
    findings.push({
      key: "weak",
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      tone: "bad",
      text: <>
        <strong>{belowTarget.length} {belowTarget.length === 1 ? "code" : "codes"}</strong> sat under 20%
        {belowTarget.length <= 2
          ? <>: {belowTarget.map((r, i) => (
              <React.Fragment key={r.discount_code}>
                <strong className="font-mono">{r.discount_code}</strong>{i < belowTarget.length - 1 ? ", " : ""}
              </React.Fragment>
            ))}.</>
          : <>. Worst: <strong className="font-mono">{worst.discount_code}</strong> at <strong>{worst.calculatedConversion.toFixed(1)}%</strong>.</>}
        {" "}Between them they took in <strong>{wastedSignups.toLocaleString()}</strong> signups.
        {isRecentEvent && (
          <span className="block mt-1 text-[10px] opacity-70">
            These may still recover — it has only been {eventDaysDelta}d since the event.
          </span>
        )}
      </>,
    });
  }

  /* 6 — Baseline */
  if (!isSingle) {
    findings.push({
      key: "baseline",
      icon: <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold font-mono">avg</span>,
      tone: "neutral",
      text: hasLtv
        ? <>Across {n} codes: <strong>{avgConversion.toFixed(1)}%</strong> average conversion and <strong>${avgLTV.toFixed(0)}</strong> average 12-month LTV.</>
        : <>Across {n} codes: <strong>{avgConversion.toFixed(1)}%</strong> average conversion, <strong>{summary.totalSignups.toLocaleString()}</strong> signups and <strong>{summary.totalPayingCustomers.toLocaleString()}</strong> paying customers.</>,
    });
  }

  /* 7 — LTV, strictly a bonus when the upload carries it */
  if (hasLtv && highestLTV["Avg LTV 12"] > 0) {
    findings.push({
      key: "ltv",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      tone: "good",
      text: isSingle
        ? <>Average 12-month LTV per customer: <strong>${best["Avg LTV 12"].toFixed(0)}</strong>.{best["Avg LTV 12"] > 500 ? " Strong customer quality for this code." : ""}</>
        : <><strong className="font-mono">{highestLTV.discount_code}</strong> brought in the most valuable customers — <strong>${highestLTV["Avg LTV 12"].toFixed(0)}</strong> average LTV against a portfolio average of <strong>${avgLTV.toFixed(0)}</strong>.</>,
    });
  }

  /* 8 — Rep verdict */
  if (userPersona === "bd-rep") {
    if (summary.blendedConversionRate >= 40) {
      findings.push({
        key: "rep",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        tone: "good",
        text: <>Strong event — book it again next year.</>,
      });
    } else if (summary.blendedConversionRate < 20) {
      findings.push({
        key: "rep",
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        tone: "bad",
        text: <>Below the event threshold — review booth placement and the offer before committing to a return.</>,
      });
    }
  }

  const visible = findings.slice(0, 6);

  const toneColor: Record<Tone, { bg: string; border: string; icon: string }> = {
    good:    { bg: "#eef4f1", border: "rgba(43,83,70,0.15)",   icon: "text-[#2b5346]" },
    warn:    { bg: "#fdf8e1", border: "rgba(231,189,39,0.25)", icon: "text-[#8a6f00]" },
    bad:     { bg: "#fff4f4", border: "rgba(133,11,11,0.15)",  icon: "text-[#850b0b]" },
    neutral: { bg: "#f8f7f5", border: "#e5e5e5",               icon: "text-[#a1a1a1]" },
  };

  return (
    <div className="space-y-2.5">
      {visible.map((f, i) => {
        const c = toneColor[f.tone];
        return (
          <div
            key={f.key}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border text-xs leading-relaxed animate-slide-up-in"
            style={{ backgroundColor: c.bg, borderColor: c.border, animationDelay: `${Math.min(i, 5) * 40}ms` }}
          >
            <span className={`shrink-0 mt-0.5 ${c.icon}`}>{f.icon}</span>
            <span className="text-[#3d3d3d]">{f.text}</span>
          </div>
        );
      })}
    </div>
  );
}
