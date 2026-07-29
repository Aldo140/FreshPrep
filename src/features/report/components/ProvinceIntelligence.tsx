import React, { useState, useMemo } from "react";
import { DiscountCodeData, AnalyzedCodeReport } from "../../../types";
import {
  Users, DollarSign, TrendingUp, Layers,
  Award, Info, Search, X, ChevronRight, MapPin,
} from "lucide-react";
import { MetricInfo } from "../../../components/MetricInfo";

interface ProvinceIntelligenceProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
  channelScope?: string;
}

/* ── Province identity ──────────────────────────────────────── */

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
  NS: "#5a5a5a", NB: "#7a8b7f",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#2b5346";
/** Gold needs dark ink; every other province colour carries white. */
const provInk = (p: string) => (p === "AB" ? "#3a2e00" : "#ffffff");

const PROV_FULL: Record<string, string> = {
  BC: "British Columbia", AB: "Alberta", ON: "Ontario",
  QC: "Quebec", SK: "Saskatchewan", MB: "Manitoba",
  NS: "Nova Scotia", NB: "New Brunswick",
};

/** Province can be compound — "BC + AB", "ON/QC". Split into member codes. */
function splitProvinces(raw?: string): string[] {
  const parts = (raw ?? "")
    .toUpperCase()
    .split(/[+,/&]/)
    .map(p => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : ["ON"];
}

const channelOf = (row: DiscountCodeData) => (row.channel || "").trim() || "Unspecified";

/* ── Zones on the conversion × reach map ────────────────────── */

type ZoneKey = "scale" | "prove" | "fix" | "hold";

const ZONE: Record<ZoneKey, { name: string; tint: string; ink: string; read: string }> = {
  scale: { name: "Scale",          tint: "#eef4f1", ink: "#2b5346", read: "Above the national rate with the broadest reach." },
  prove: { name: "Prove out",      tint: "#fdf8e1", ink: "#8a6f00", read: "Converts well but stays small. Room to run more events." },
  fix:   { name: "Fix conversion", tint: "#fbf0e9", ink: "#9b4a1c", read: "Plenty of signups, but they stall before paying." },
  hold:  { name: "Hold",           tint: "#f7f7f5", ink: "#7a7a7a", read: "Below the national rate on limited volume." },
};

const TIER_STYLE: Record<string, string> = {
  Leading:    "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/25",
  Growing:    "bg-[#f3f7f5] text-[#4d8970] border-[#4d8970]/25",
  Developing: "bg-[#fdf8e1] text-[#8a6f00] border-[#e7bd27]/45",
  Weak:       "bg-[#f7f3f1] text-[#9b4a1c] border-[#9b4a1c]/25",
};

const CHANNEL_PALETTE = ["#2b5346", "#4d8970", "#e7bd27", "#9b4a1c", "#6b8e9f", "#8a6f00", "#a8bfb4"];

interface ReadoutCard {
  eyebrow: string;
  accent: string;
  prov: ProvinceRow | null;
  body: (p: ProvinceRow) => React.ReactNode;
  empty: string;
  foot: string;
}

interface ProvinceRow {
  province: string;
  signups: number;
  paying: number;
  conversion: number;
  shareOfSignups: number;
  codeCount: number;
  channels: { channel: string; signups: number }[];
  ltv12: number;
  avgLtv12: number;
  discount: number;
  efficiencyRatio: number;
  score: number;
  tier: "Leading" | "Growing" | "Developing" | "Weak";
  zone: ZoneKey;
}

export default function ProvinceIntelligence({ dbRows, foundReports, channelScope }: ProvinceIntelligenceProps) {
  const eventsMode = channelScope === "events";
  const [dataSource, setDataSource] = useState<"audited" | "full">("audited");
  const [sortBy, setSortBy] = useState<"score" | "conversion" | "signups" | "paying" | "codes" | "ltv">("score");
  const [hoverProv, setHoverProv] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [eventChannel, setEventChannel] = useState("all");
  const [eventConversion, setEventConversion] = useState<"all" | "high" | "medium" | "low">("all");
  const [eventMinSignups, setEventMinSignups] = useState("0");

  /**
   * True only when the upload actually carries LTV figures. The 2026 Code Level
   * Report has none — every dollar field is 0, so LTV must stay out of the
   * ranking maths and off the screen rather than render as $0.
   */
  const hasLtv = useMemo(() => {
    const carries = (r: DiscountCodeData) => (r["Sum LTV 12"] || 0) > 0 || (r["Avg LTV 12"] || 0) > 0;
    return foundReports.some(carries) || dbRows.some(carries);
  }, [foundReports, dbRows]);

  const hasSpend = useMemo(
    () => hasLtv && dbRows.concat(foundReports).some(r => Math.abs(r.total_discount_used || 0) > 0),
    [hasLtv, dbRows, foundReports],
  );

  const canToggleSource = dbRows.length > 0 && foundReports.length > 0;

  const activeDataset = useMemo<DiscountCodeData[]>(() => {
    if (!canToggleSource) return dbRows.length > 0 ? dbRows : foundReports;
    return dataSource === "audited" ? foundReports : dbRows;
  }, [canToggleSource, dataSource, dbRows, foundReports]);

  /* ── Channel colour ordering, stable across the whole view ── */

  const channelOrder = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of activeDataset) {
      const ch = channelOf(row);
      totals.set(ch, (totals.get(ch) ?? 0) + (row.Signups || 0));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([ch]) => ch);
  }, [activeDataset]);

  const channelColor = (channel: string) => {
    const i = channelOrder.indexOf(channel);
    if (i < 0) return "#c8c8c8";
    return CHANNEL_PALETTE[Math.min(i, CHANNEL_PALETTE.length - 1)];
  };

  /* ── Province aggregation ───────────────────────────────────
     A code spanning "BC + AB" is split evenly across its members so
     national shares still total 100%. Conversion is unaffected by the
     split — numerator and denominator divide by the same factor.      */

  const { provinces, national } = useMemo(() => {
    interface Bucket {
      signups: number; paying: number; ltv12: number; discount: number;
      codes: Set<string>; channels: Map<string, number>;
    }
    const buckets = new Map<string, Bucket>();
    let natSignups = 0, natPaying = 0;

    for (const row of activeDataset) {
      const members = splitProvinces(row.Province);
      const weight = 1 / members.length;
      const signups = (row.Signups || 0) * weight;
      const paying = (row["Paying cx"] || 0) * weight;
      natSignups += signups * members.length;
      natPaying += paying * members.length;

      for (const prov of members) {
        const b = buckets.get(prov) ?? {
          signups: 0, paying: 0, ltv12: 0, discount: 0,
          codes: new Set<string>(), channels: new Map<string, number>(),
        };
        b.signups += signups;
        b.paying += paying;
        b.ltv12 += (row["Sum LTV 12"] || 0) * weight;
        b.discount += Math.abs(row.total_discount_used || 0) * weight;
        b.codes.add(row.discount_code.trim().toUpperCase());
        const ch = channelOf(row);
        b.channels.set(ch, (b.channels.get(ch) ?? 0) + signups);
        buckets.set(prov, b);
      }
    }

    const nationalConversion = natSignups > 0 ? (natPaying / natSignups) * 100 : 0;
    const maxSignups = Math.max(1, ...Array.from(buckets.values()).map(b => b.signups));
    const meanShare = buckets.size > 0 ? 100 / buckets.size : 0;

    const rows: ProvinceRow[] = Array.from(buckets.entries()).map(([province, b]) => {
      const conversion = b.signups > 0 ? (b.paying / b.signups) * 100 : 0;
      const shareOfSignups = natSignups > 0 ? (b.signups / natSignups) * 100 : 0;
      const avgLtv12 = b.paying > 0 ? b.ltv12 / b.paying : 0;
      const efficiencyRatio = b.discount > 0 ? b.ltv12 / b.discount : 0;

      // Conversion is scored against an absolute 50% benchmark (matching the
      // code-level score); reach is scored relative to the largest province,
      // which is the only meaningful volume yardstick between regions.
      const sConv = Math.min(100, conversion * 2);
      const sReach = Math.min(100, (b.signups / maxSignups) * 100);
      const sLtv = Math.min(100, (avgLtv12 / 200) * 100);
      const sEff = Math.min(100, (efficiencyRatio / 8) * 100);

      let score: number;
      if (!hasLtv) score = Math.round(0.65 * sConv + 0.35 * sReach);
      else if (hasSpend) score = Math.round(0.40 * sConv + 0.30 * sLtv + 0.20 * sReach + 0.10 * sEff);
      else score = Math.round(0.45 * sConv + 0.35 * sLtv + 0.20 * sReach);

      let tier: ProvinceRow["tier"] = "Weak";
      if (score >= 70) tier = "Leading";
      else if (score >= 50) tier = "Growing";
      else if (score >= 30) tier = "Developing";

      const aboveRate = conversion >= nationalConversion;
      const aboveReach = shareOfSignups >= meanShare;
      const zone: ZoneKey = aboveRate ? (aboveReach ? "scale" : "prove") : (aboveReach ? "fix" : "hold");

      return {
        province,
        signups: b.signups,
        paying: b.paying,
        conversion,
        shareOfSignups,
        codeCount: b.codes.size,
        channels: Array.from(b.channels.entries())
          .map(([channel, signups]) => ({ channel, signups }))
          .sort((x, y) => y.signups - x.signups),
        ltv12: b.ltv12,
        avgLtv12,
        discount: b.discount,
        efficiencyRatio,
        score, tier, zone,
      };
    });

    return {
      provinces: rows,
      national: {
        signups: natSignups,
        paying: natPaying,
        conversion: nationalConversion,
        meanShare,
        maxSignups,
        codeCount: new Set(activeDataset.map(r => r.discount_code.trim().toUpperCase())).size,
      },
    };
  }, [activeDataset, hasLtv, hasSpend]);

  /* ── Headline reads ─────────────────────────────────────────── */

  const best = useMemo(() => {
    const pick = (fn: (p: ProvinceRow) => number) =>
      provinces.reduce<ProvinceRow | null>((acc, p) => (!acc || fn(p) > fn(acc) ? p : acc), null);
    return {
      conversion: pick(p => (p.signups >= 1 ? p.conversion : -1)),
      reach: pick(p => p.signups),
      paying: pick(p => p.paying),
      breadth: pick(p => p.codeCount),
      value: pick(p => (p.paying > 0 ? p.avgLtv12 : -1)),
    };
  }, [provinces]);

  const zoneLeaders = useMemo(() => {
    const inZone = (z: ZoneKey, rank: (p: ProvinceRow) => number) =>
      provinces.filter(p => p.zone === z).sort((a, b) => rank(b) - rank(a))[0] ?? null;
    return {
      scale: inZone("scale", p => p.conversion),
      prove: inZone("prove", p => p.conversion),
      fix: inZone("fix", p => p.signups),
    };
  }, [provinces]);

  const ranked = useMemo(() => [...provinces].sort((a, b) => {
    if (sortBy === "conversion") return b.conversion - a.conversion;
    if (sortBy === "signups") return b.signups - a.signups;
    if (sortBy === "paying") return b.paying - a.paying;
    if (sortBy === "codes") return b.codeCount - a.codeCount;
    if (sortBy === "ltv") return b.avgLtv12 - a.avgLtv12;
    return b.score - a.score;
  }), [provinces, sortBy]);

  /* ── Plot geometry ──────────────────────────────────────────── */

  const plot = useMemo(() => {
    const xMax = Math.max(1, ...provinces.map(p => p.shareOfSignups)) * 1.2;
    const yMax = Math.max(5, ...provinces.map(p => p.conversion)) * 1.2;
    const maxPaying = Math.max(1, ...provinces.map(p => p.paying));
    const px = (share: number) => 8 + (share / xMax) * 84;
    const py = (conv: number) => 9 + (conv / yMax) * 82;
    return {
      xMax, yMax, px, py,
      cx: px(national.meanShare),
      cy: py(national.conversion),
      size: (paying: number) => 22 + Math.sqrt(paying / maxPaying) * 20,
    };
  }, [provinces, national]);

  /* ── Drill-down ─────────────────────────────────────────────── */

  const provinceCodes = useMemo(() => {
    if (!selectedProvince) return [];
    return activeDataset.filter(row => splitProvinces(row.Province).includes(selectedProvince));
  }, [activeDataset, selectedProvince]);

  const drillChannels = useMemo(
    () => Array.from(new Set(provinceCodes.map(channelOf))).sort(),
    [provinceCodes],
  );

  const filteredCodes = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    const minSignups = Math.max(0, Number(eventMinSignups) || 0);
    return provinceCodes
      .filter(row => {
        const conversion = row.Signups > 0 ? (row["Paying cx"] / row.Signups) * 100 : 0;
        const matchesSearch = !query
          || row.discount_code.toLowerCase().includes(query)
          || channelOf(row).toLowerCase().includes(query);
        const matchesChannel = eventChannel === "all" || channelOf(row) === eventChannel;
        const matchesConversion = eventConversion === "all"
          || (eventConversion === "high" && conversion >= 40)
          || (eventConversion === "medium" && conversion >= 20 && conversion < 40)
          || (eventConversion === "low" && conversion < 20);
        return matchesSearch && matchesChannel && matchesConversion && (row.Signups || 0) >= minSignups;
      })
      .sort((a, b) => (b.Signups || 0) - (a.Signups || 0));
  }, [provinceCodes, eventSearch, eventChannel, eventConversion, eventMinSignups]);

  const openProvince = (province: string) => {
    setSelectedProvince(province);
    setEventSearch("");
    setEventChannel("all");
    setEventConversion("all");
    setEventMinSignups("0");
  };
  const clearFilters = () => {
    setEventSearch("");
    setEventChannel("all");
    setEventConversion("all");
    setEventMinSignups("0");
  };

  const selectedRow = provinces.find(p => p.province === selectedProvince) ?? null;
  const hovered = hoverProv ? provinces.find(p => p.province === hoverProv) ?? null : null;
  const maxCodeSignups = Math.max(1, ...filteredCodes.map(r => r.Signups || 0));

  const num = (v: number) => Math.round(v).toLocaleString();
  const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

  if (provinces.length === 0) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm p-10 flex flex-col items-center gap-3 text-center">
        <MapPin className="w-7 h-7 text-[#d8d8d4]" />
        <p className="text-sm font-semibold text-[#3d3d3d]">No province data in this selection</p>
        <p className="text-[10px] font-mono text-[#a1a1a1]">Widen the province filter or upload a code-level export.</p>
      </div>
    );
  }

  const scorecards: { label: string; icon: React.ReactNode; value: string; badge: string; sub: string }[] = [
    {
      label: "Best conversion",
      icon: <TrendingUp className="w-4 h-4" />,
      value: best.conversion ? `${best.conversion.conversion.toFixed(1)}%` : "—",
      badge: best.conversion?.province ?? "—",
      sub: best.conversion
        ? `${num(best.conversion.paying)} of ${num(best.conversion.signups)} signups started paying`
        : "No signups recorded",
    },
    {
      label: "Widest reach",
      icon: <Users className="w-4 h-4" />,
      value: best.reach ? num(best.reach.signups) : "—",
      badge: best.reach?.province ?? "—",
      sub: best.reach ? `${best.reach.shareOfSignups.toFixed(0)}% of all signups in view` : "No signups recorded",
    },
    {
      label: "Most customers won",
      icon: <Award className="w-4 h-4" />,
      value: best.paying ? num(best.paying.paying) : "—",
      badge: best.paying?.province ?? "—",
      sub: best.paying ? `Converting at ${best.paying.conversion.toFixed(1)}%` : "No paying customers yet",
    },
    hasLtv
      ? {
          label: "Highest avg LTV 12m",
          icon: <DollarSign className="w-4 h-4" />,
          value: best.value && best.value.avgLtv12 > 0 ? money(best.value.avgLtv12) : "—",
          badge: best.value?.province ?? "—",
          sub: best.value ? `${money(best.value.ltv12)} total 12-month value` : "No customer value recorded",
        }
      : {
          label: "Deepest program",
          icon: <Layers className="w-4 h-4" />,
          value: best.breadth ? `${best.breadth.codeCount}` : "—",
          badge: best.breadth?.province ?? "—",
          sub: best.breadth
            ? `codes running across ${best.breadth.channels.length} channel${best.breadth.channels.length !== 1 ? "s" : ""}`
            : "No codes recorded",
        },
  ];

  const sortOptions: [typeof sortBy, string][] = [
    ["score", "Score"],
    ["conversion", "Conversion"],
    ["signups", "Signups"],
    ["paying", "Paying"],
    ["codes", "Codes"],
    ...(hasLtv ? ([["ltv", "Avg LTV"]] as [typeof sortBy, string][]) : []),
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-5">

      {/* ── Scope + national totals ──────────────────────────── */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm px-4 py-3.5 flex flex-col lg:flex-row lg:items-center gap-3.5 justify-between">
        <div className="flex items-center gap-5 md:gap-7 flex-wrap">
          {[
            { v: num(national.signups), l: "signups" },
            { v: num(national.paying), l: "paying" },
            { v: `${national.conversion.toFixed(1)}%`, l: "national rate" },
            { v: `${provinces.length}`, l: `province${provinces.length !== 1 ? "s" : ""}` },
            { v: `${national.codeCount}`, l: "codes" },
          ].map(stat => (
            <div key={stat.l}>
              <p className="text-[19px] md:text-[21px] font-black font-mono text-[#0f0f0f] leading-none tabular-nums">{stat.v}</p>
              <p className="text-[8px] font-mono uppercase tracking-[0.18em] text-[#a1a1a1] mt-1">{stat.l}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
          {canToggleSource && (
            <div className="flex bg-[#f5f5f3] p-1 rounded-lg border border-[#e8e8e8]">
              {([["audited", `Analyzed codes (${foundReports.length})`], ["full", `Full dataset (${dbRows.length.toLocaleString()})`]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDataSource(key)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap tap-scale ${
                    dataSource === key ? "bg-white text-[#2b5346] shadow-sm border border-[#d0e8e2]" : "text-[#888] hover:text-[#1a1a1a]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <p className="text-[9px] font-mono text-[#b0b0b0]">
            {canToggleSource && dataSource === "full"
              ? "Every uploaded row, including codes outside your target list."
              : "Your analyzed codes only."}
            {" "}Multi-province codes split evenly across their provinces.
          </p>
          {eventsMode && (
            <p className="flex items-center gap-1 text-[9px] font-mono text-[#a07800]">
              <Info className="w-3 h-3 shrink-0 text-[#c9a000]" />
              Some EV-prefix codes may be missing
              <MetricInfo
                side="bottom"
                text="Codes from 2024 and earlier weren't always tagged 'Events' in the database — they may not appear here. To guarantee all EV-prefix codes are included, enable the EV-prefix toggle in the scope bar above."
              />
            </p>
          )}
        </div>
      </div>

      {/* ── Scorecards ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {scorecards.map((card, i) => (
          <div
            key={card.label}
            data-stagger={i}
            className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm p-3.5 md:p-4 flex flex-col gap-2.5 animate-slide-up-in"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8.5px] md:text-[9px] font-mono font-semibold uppercase tracking-[0.14em] text-[#a1a1a1] leading-tight">{card.label}</span>
              <div className="w-6 h-6 rounded-lg bg-[#eef4f1] flex items-center justify-center text-[#2b5346] shrink-0">{card.icon}</div>
            </div>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[22px] md:text-[26px] font-black font-mono text-[#0f0f0f] leading-none tabular-nums">{card.value}</span>
                <span
                  className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded border leading-none"
                  style={{
                    color: provColor(card.badge),
                    borderColor: `${provColor(card.badge)}40`,
                    backgroundColor: `${provColor(card.badge)}12`,
                  }}
                >
                  {card.badge}
                </span>
              </div>
              <p className="text-[9.5px] md:text-[10px] text-[#a1a1a1] mt-1.5 leading-snug">{card.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Signature: conversion × reach map ────────────────── */}
      <section className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden animate-slide-up-in">
        <div className="px-4 md:px-5 py-4 border-b border-[#f0f0ee] bg-[#fafafa] flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Positioning</p>
            <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5 flex items-center gap-1.5">
              Conversion × reach
              <MetricInfo text="Each province is plotted by how well it converts (vertical) against how much of the national signup volume it carries (horizontal). The dashed lines are the national conversion rate and the average province's share, which split the chart into four zones." />
            </h3>
          </div>
          <p className="text-[10px] font-mono text-right leading-snug" style={{ color: hovered ? provColor(hovered.province) : "#b0b0b0" }}>
            {hovered
              ? `${PROV_FULL[hovered.province] ?? hovered.province} — ${hovered.conversion.toFixed(1)}% conversion · ${num(hovered.signups)} signups · ${hovered.shareOfSignups.toFixed(0)}% of national`
              : "Dot size = customers won · tap a province to open its codes"}
          </p>
        </div>

        <div className="px-4 md:px-6 pt-5 pb-3">
          <div className="flex gap-2">
            {/* y axis */}
            <div className="w-7 md:w-9 shrink-0 relative">
              <span className="absolute right-0 top-0 text-[8.5px] font-mono text-[#c0c0c0] tabular-nums">{plot.yMax.toFixed(0)}%</span>
              <span className="absolute right-0 bottom-8 text-[8.5px] font-mono text-[#c0c0c0]">0%</span>
              <span className="absolute right-0 top-1/2 origin-right -rotate-90 translate-x-[-14px] text-[8px] font-mono uppercase tracking-[0.16em] text-[#c0c0c0] whitespace-nowrap">
                conversion
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="relative h-[250px] sm:h-[300px] md:h-[330px] rounded-lg border border-[#eeeeec] bg-[#fcfcfb] overflow-hidden">
                {/* zone tints */}
                <div className="absolute" style={{ left: 0, top: 0, width: `${plot.cx}%`, height: `${100 - plot.cy}%`, background: ZONE.prove.tint }} />
                <div className="absolute" style={{ left: `${plot.cx}%`, top: 0, right: 0, height: `${100 - plot.cy}%`, background: ZONE.scale.tint }} />
                <div className="absolute" style={{ left: 0, top: `${100 - plot.cy}%`, width: `${plot.cx}%`, bottom: 0, background: ZONE.hold.tint }} />
                <div className="absolute" style={{ left: `${plot.cx}%`, top: `${100 - plot.cy}%`, right: 0, bottom: 0, background: ZONE.fix.tint }} />

                {/* zone names, anchored to the outer corner of each quadrant */}
                <span className="absolute text-[8px] md:text-[8.5px] font-mono font-black uppercase tracking-[0.16em]" style={{ left: 8, top: 7, color: ZONE.prove.ink, opacity: 0.55 }}>{ZONE.prove.name}</span>
                <span className="absolute text-[8px] md:text-[8.5px] font-mono font-black uppercase tracking-[0.16em]" style={{ right: 8, top: 7, color: ZONE.scale.ink, opacity: 0.6 }}>{ZONE.scale.name}</span>
                <span className="absolute text-[8px] md:text-[8.5px] font-mono font-black uppercase tracking-[0.16em]" style={{ left: 8, bottom: 7, color: ZONE.hold.ink, opacity: 0.5 }}>{ZONE.hold.name}</span>
                <span className="absolute text-[8px] md:text-[8.5px] font-mono font-black uppercase tracking-[0.16em]" style={{ right: 8, bottom: 7, color: ZONE.fix.ink, opacity: 0.55 }}>{ZONE.fix.name}</span>

                {/* crosshairs */}
                <div className="absolute left-0 right-0 border-t border-dashed border-[#2b5346]/30" style={{ bottom: `${plot.cy}%` }} />
                <div className="absolute top-0 bottom-0 border-l border-dashed border-[#2b5346]/20" style={{ left: `${plot.cx}%` }} />
                <span
                  className="absolute text-[8px] font-mono text-[#2b5346]/70 bg-white/80 px-1 rounded"
                  style={{ bottom: `calc(${plot.cy}% + 3px)`, left: 6 }}
                >
                  national {national.conversion.toFixed(1)}%
                </span>

                {/* provinces */}
                {provinces.map(p => {
                  const d = plot.size(p.paying);
                  const dim = hoverProv !== null && hoverProv !== p.province;
                  return (
                    <button
                      key={p.province}
                      type="button"
                      onClick={() => openProvince(p.province)}
                      onMouseEnter={() => setHoverProv(p.province)}
                      onMouseLeave={() => setHoverProv(null)}
                      onFocus={() => setHoverProv(p.province)}
                      onBlur={() => setHoverProv(null)}
                      aria-label={`${PROV_FULL[p.province] ?? p.province}: ${p.conversion.toFixed(1)}% conversion, ${num(p.signups)} signups, ${num(p.paying)} paying customers. Open codes.`}
                      className="absolute rounded-full flex items-center justify-center cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3d2f] focus-visible:ring-offset-1"
                      style={{
                        left: `${plot.px(p.shareOfSignups)}%`,
                        bottom: `${plot.py(p.conversion)}%`,
                        width: d,
                        height: d,
                        transform: "translate(-50%, 50%)",
                        backgroundColor: provColor(p.province),
                        opacity: dim ? 0.4 : 1,
                        boxShadow: dim ? "none" : `0 2px 10px ${provColor(p.province)}55`,
                        zIndex: dim ? 1 : 2,
                      }}
                    >
                      <span className="text-[9px] font-black font-mono leading-none" style={{ color: provInk(p.province) }}>
                        {p.province}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* x axis */}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[8.5px] font-mono text-[#c0c0c0]">0%</span>
                <span className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#c0c0c0]">share of national signups →</span>
                <span className="text-[8.5px] font-mono text-[#c0c0c0] tabular-nums">{plot.xMax.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-5 py-2.5 border-t border-[#f5f5f3] bg-[#fafafa] flex flex-wrap gap-x-4 gap-y-1">
          {(Object.keys(ZONE) as ZoneKey[]).map(key => (
            <span key={key} className="flex items-center gap-1.5 text-[9px] font-mono text-[#a1a1a1]">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0 border border-black/5" style={{ background: ZONE[key].tint }} />
              <span className="font-bold" style={{ color: ZONE[key].ink }}>{ZONE[key].name}</span>
              <span className="hidden sm:inline">— {ZONE[key].read}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Province leaderboard ─────────────────────────────── */}
      <section className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden animate-slide-up-in">
        <div className="px-4 md:px-5 py-4 border-b border-[#f0f0ee] bg-[#fafafa] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Ranking</p>
            <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5 flex items-center gap-1.5">
              Province leaderboard
              <MetricInfo
                text={hasLtv
                  ? `Province score out of 100: ${hasSpend ? "40% conversion, 30% average customer value, 20% reach, 10% discount efficiency" : "45% conversion, 35% average customer value, 20% reach"}. Conversion is measured against a 50% benchmark; reach is measured against the largest province.`
                  : "This upload carries no customer-value data, so the score is 65% conversion and 35% reach. Conversion is measured against a 50% benchmark; reach is measured against the largest province."}
              />
            </h3>
            <p className="text-[10px] font-mono text-[#a1a1a1] mt-0.5">Bar shows signups against the leading province. Tap a row to open its codes.</p>
          </div>
          <div className="flex items-center gap-1 bg-[#f0f0ee] p-1 rounded-lg border border-[#e8e8e8] flex-wrap">
            <span className="text-[9px] font-mono uppercase text-[#a1a1a1] px-1 shrink-0">Sort</span>
            {sortOptions.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md cursor-pointer transition-colors tap-scale ${
                  sortBy === key ? "bg-white text-[#2b5346] shadow-sm border border-[#d0e8e2]" : "text-[#888] hover:text-[#1a1a1a]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* channel legend */}
        {channelOrder.length > 1 && (
          <div className="px-4 md:px-5 py-2 border-b border-[#f5f5f3] flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <span className="text-[8.5px] font-mono uppercase tracking-[0.16em] text-[#a1a1a1]">Channel mix</span>
            {channelOrder.slice(0, CHANNEL_PALETTE.length).map(ch => (
              <span key={ch} className="flex items-center gap-1 text-[9px] font-mono text-[#7a7a7a]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: channelColor(ch) }} />
                {ch}
              </span>
            ))}
            {channelOrder.length > CHANNEL_PALETTE.length && (
              <span className="text-[9px] font-mono text-[#c0c0c0]">+{channelOrder.length - CHANNEL_PALETTE.length} more</span>
            )}
          </div>
        )}

        <div className="divide-y divide-[#f5f5f3]">
          {ranked.map((p, i) => {
            const reachOfLeader = national.maxSignups > 0 ? (p.signups / national.maxSignups) * 100 : 0;
            const isLeader = i === 0 && ranked.length > 1;
            return (
              <button
                key={p.province}
                type="button"
                onClick={() => openProvince(p.province)}
                onMouseEnter={() => setHoverProv(p.province)}
                onMouseLeave={() => setHoverProv(null)}
                className="w-full text-left px-4 md:px-5 py-3.5 flex items-center gap-3 md:gap-4 hover:bg-[#fbfbfa] transition-colors cursor-pointer group tap-scale"
              >
                <span
                  className="shrink-0 w-6 text-right font-black font-mono leading-none text-[20px] md:text-[22px] tabular-nums"
                  style={{ color: isLeader ? "#e7bd27" : "#e0ded9" }}
                >
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 md:gap-2 flex-wrap">
                    <span
                      className="font-black text-[12.5px] font-mono px-1.5 py-0.5 rounded border leading-none"
                      style={{ color: provColor(p.province), borderColor: `${provColor(p.province)}40`, backgroundColor: `${provColor(p.province)}12` }}
                    >
                      {p.province}
                    </span>
                    <span className="text-[12px] font-semibold text-[#3d3d3d] truncate hidden sm:inline">{PROV_FULL[p.province] ?? p.province}</span>
                    <span className={`text-[8px] font-black font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border ${TIER_STYLE[p.tier]}`}>
                      {p.tier}
                    </span>
                    <span className="text-[9px] font-mono text-[#a1a1a1]">
                      {p.codeCount} code{p.codeCount !== 1 ? "s" : ""} · {p.shareOfSignups.toFixed(0)}% of national
                    </span>
                  </div>

                  {/* reach against the leading province */}
                  <div className="mt-2 h-2 bg-[#f0f0ee] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bar-grow" style={{ width: `${reachOfLeader}%`, backgroundColor: provColor(p.province) }} />
                  </div>

                  {/* channel mix of this province's signups */}
                  {p.channels.length > 1 && (
                    <div className="mt-1.5 flex w-full h-[3px] rounded-full overflow-hidden gap-px" aria-hidden="true">
                      {p.channels.map(c => (
                        <span
                          key={c.channel}
                          title={`${c.channel} · ${num(c.signups)} signups`}
                          style={{ flexGrow: Math.max(c.signups, 0.0001), flexBasis: 0, backgroundColor: channelColor(c.channel) }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-black font-mono text-[#0f0f0f] leading-none text-[18px] md:text-[20px] tabular-nums">
                    {p.conversion.toFixed(1)}<span className="text-[12px]">%</span>
                  </p>
                  <p className="text-[9px] font-mono text-[#4d8970] mt-1 tabular-nums">
                    {num(p.paying)} of {num(p.signups)}
                  </p>
                  {hasLtv && p.avgLtv12 > 0 && (
                    <p className="text-[8.5px] font-mono text-[#8a6f00] mt-0.5 tabular-nums">{money(p.avgLtv12)} avg LTV</p>
                  )}
                </div>

                <div className="shrink-0 w-9 md:w-11 text-right">
                  <p className="text-[16px] md:text-[18px] font-black font-mono text-[#1a1a1a] leading-none tabular-nums">{p.score}</p>
                  <p className="text-[8px] font-mono text-[#c0c0c0] leading-none mt-0.5">score</p>
                </div>

                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#d8d8d4] group-hover:text-[#2b5346] transition-colors" />
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Read-out ─────────────────────────────────────────── */}
      <section className="bg-[#1a3d2f] rounded-xl md:rounded-2xl p-4 md:p-5 animate-slide-up-in">
        <div className="border-b border-white/10 pb-3 mb-4">
          <h3 className="text-[11px] font-black text-[#e7bd27] font-mono uppercase tracking-[0.18em]">What to do next</h3>
          <p className="text-[10px] text-white/45 font-mono mt-1">
            Read off the four zones{hasLtv ? " and customer value" : ""} — no province is judged on data this upload doesn't carry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {([
            {
              eyebrow: "Scale here",
              accent: "#8fc7ae",
              prov: zoneLeaders.scale,
              body: (p: ProvinceRow) => (
                <>Converts at <strong className="text-white">{p.conversion.toFixed(1)}%</strong> against a national{" "}
                <strong className="text-white">{national.conversion.toFixed(1)}%</strong>, on{" "}
                <strong className="text-white">{p.shareOfSignups.toFixed(0)}%</strong> of all signups. Add event dates here first.</>
              ),
              empty: "No province is both above the national rate and above average reach.",
              foot: "Highest-confidence bet",
            },
            {
              eyebrow: "Prove it out",
              accent: "#e7bd27",
              prov: zoneLeaders.prove,
              body: (p: ProvinceRow) => (
                <>Strong <strong className="text-white">{p.conversion.toFixed(1)}%</strong> conversion on only{" "}
                <strong className="text-white">{num(p.signups)}</strong> signups from{" "}
                <strong className="text-white">{p.codeCount}</strong> code{p.codeCount !== 1 ? "s" : ""}. Small sample, good signal.</>
              ),
              empty: "No small-volume province is beating the national rate.",
              foot: "Run more events, then re-read",
            },
            {
              eyebrow: "Fix conversion",
              accent: "#e0895a",
              prov: zoneLeaders.fix,
              body: (p: ProvinceRow) => (
                <><strong className="text-white">{num(p.signups)}</strong> signups but only{" "}
                <strong className="text-white">{p.conversion.toFixed(1)}%</strong> convert —{" "}
                <strong className="text-white">{num(p.signups - p.paying)}</strong> people signed up and never paid.</>
              ),
              empty: "Every high-volume province is at or above the national rate.",
              foot: "Biggest recoverable loss",
            },
            hasLtv
              ? {
                  eyebrow: "Most valuable",
                  accent: "#8fc7ae",
                  prov: best.value && best.value.avgLtv12 > 0 ? best.value : null,
                  body: (p: ProvinceRow) => (
                    <>Each customer is worth <strong className="text-white">{money(p.avgLtv12)}</strong> over 12 months across{" "}
                    <strong className="text-white">{num(p.paying)}</strong> customers.</>
                  ),
                  empty: "No customer-value figures in this upload.",
                  foot: "Highest revenue per win",
                }
              : {
                  eyebrow: "Concentration",
                  accent: "#8fc7ae",
                  prov: best.reach,
                  body: (p: ProvinceRow) => (
                    <><strong className="text-white">{p.shareOfSignups.toFixed(0)}%</strong> of every signup comes from{" "}
                    {PROV_FULL[p.province] ?? p.province}. The other {provinces.length - 1} province
                    {provinces.length - 1 !== 1 ? "s" : ""} split the remaining{" "}
                    <strong className="text-white">{(100 - p.shareOfSignups).toFixed(0)}%</strong>.</>
                  ),
                  empty: "No signup volume recorded.",
                  foot: "Where the program is exposed",
                },
          ] as ReadoutCard[]).map((card, i) => (
            <div
              key={card.eyebrow}
              data-stagger={i}
              className="bg-white/[0.06] rounded-xl border border-white/10 p-3.5 md:p-4 flex flex-col justify-between gap-3 animate-slide-up-in"
            >
              <div>
                <span className="text-[9px] font-mono font-bold tracking-[0.16em] uppercase block mb-1.5" style={{ color: card.accent }}>
                  {card.eyebrow}
                </span>
                {card.prov ? (
                  <>
                    <h4 className="text-[19px] font-black font-mono text-white leading-none">{card.prov.province}</h4>
                    <p className="text-[10.5px] text-white/55 mt-2.5 leading-relaxed">{card.body(card.prov)}</p>
                  </>
                ) : (
                  <>
                    <h4 className="text-[19px] font-black font-mono text-white/25 leading-none">—</h4>
                    <p className="text-[10.5px] text-white/40 mt-2.5 leading-relaxed">{card.empty}</p>
                  </>
                )}
              </div>
              <p className="pt-2.5 border-t border-white/10 text-[8.5px] text-white/35 uppercase font-mono font-bold tracking-[0.12em]">
                {card.foot}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Drill-down ───────────────────────────────────────── */}
      {selectedProvince && selectedRow && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-5"
          onMouseDown={e => { if (e.target === e.currentTarget) setSelectedProvince(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProvince} codes`}
            className="bg-white w-full sm:max-w-5xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[#e8e8e8] shadow-2xl overflow-hidden flex flex-col"
          >
            <header className="px-4 md:px-5 py-4 border-b border-[#ececea] bg-[#fafafa] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[11px] font-black font-mono px-2 py-0.5 rounded border leading-none"
                    style={{ color: provColor(selectedProvince), borderColor: `${provColor(selectedProvince)}40`, backgroundColor: `${provColor(selectedProvince)}12` }}
                  >
                    {selectedProvince}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#a1a1a1]">
                    {ZONE[selectedRow.zone].name} zone
                  </span>
                </div>
                <h3 className="text-base md:text-lg font-black text-[#0f0f0f] mt-1 truncate">
                  {PROV_FULL[selectedProvince] ?? selectedProvince} · {provinceCodes.length.toLocaleString()} code{provinceCodes.length !== 1 ? "s" : ""}
                </h3>
                <p className="text-[10px] font-mono text-[#888] mt-0.5">
                  {num(selectedRow.signups)} signups · {num(selectedRow.paying)} paying · {selectedRow.conversion.toFixed(1)}% conversion
                  {hasLtv && selectedRow.avgLtv12 > 0 ? ` · ${money(selectedRow.avgLtv12)} avg LTV` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="w-9 h-9 shrink-0 rounded-lg border border-[#e8e8e8] bg-white text-[#888] hover:text-[#1a1a1a] hover:border-[#c8c8c8] flex items-center justify-center cursor-pointer tap-scale"
                aria-label="Close province codes"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-4 md:px-5 py-3 border-b border-[#ececea] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_170px_170px_140px] gap-2">
              <label className="relative">
                <Search className="w-3.5 h-3.5 text-[#a1a1a1] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={eventSearch}
                  onChange={e => setEventSearch(e.target.value)}
                  placeholder="Search code or channel…"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e8e8e8] text-xs outline-none focus:border-[#2b5346] bg-[#fafafa] focus:bg-white"
                />
              </label>
              <select
                value={eventChannel}
                onChange={e => setEventChannel(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[#e8e8e8] text-xs text-[#3d3d3d] bg-[#fafafa] outline-none focus:border-[#2b5346]"
                aria-label="Filter by channel"
              >
                <option value="all">All channels</option>
                {drillChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
              </select>
              <select
                value={eventConversion}
                onChange={e => setEventConversion(e.target.value as "all" | "high" | "medium" | "low")}
                className="h-10 px-3 rounded-lg border border-[#e8e8e8] text-xs text-[#3d3d3d] bg-[#fafafa] outline-none focus:border-[#2b5346]"
                aria-label="Filter by conversion"
              >
                <option value="all">All conversion rates</option>
                <option value="high">High · 40%+</option>
                <option value="medium">Medium · 20–39.9%</option>
                <option value="low">Low · under 20%</option>
              </select>
              <select
                value={eventMinSignups}
                onChange={e => setEventMinSignups(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[#e8e8e8] text-xs text-[#3d3d3d] bg-[#fafafa] outline-none focus:border-[#2b5346]"
                aria-label="Filter by minimum signups"
              >
                <option value="0">Any signups</option>
                <option value="10">10+ signups</option>
                <option value="25">25+ signups</option>
                <option value="50">50+ signups</option>
                <option value="100">100+ signups</option>
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[680px] text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#fafafa] border-b border-[#e8e8e8] text-[#a1a1a1] font-semibold font-mono uppercase text-[9px]">
                    <th className="py-2.5 px-4 md:px-5">Code</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Province</th>
                    <th className="py-2.5 px-3 text-right">Signups</th>
                    <th className="py-2.5 px-3 text-right">Paying</th>
                    <th className="py-2.5 px-3 text-right">Conversion</th>
                    {hasLtv && <>
                      <th className="py-2.5 px-3 text-right">Avg LTV 12m</th>
                      <th className="py-2.5 px-4 md:px-5 text-right">Total LTV 12m</th>
                    </>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f3] text-[#3d3d3d]">
                  {filteredCodes.map((row, index) => {
                    const conversion = row.Signups > 0 ? (row["Paying cx"] / row.Signups) * 100 : 0;
                    const avgLtv = row["Paying cx"] > 0 ? (row["Sum LTV 12"] || 0) / row["Paying cx"] : 0;
                    const ch = channelOf(row);
                    return (
                      <tr key={`${row.discount_code}-${ch}-${index}`} className="hover:bg-[#fbfbfa]">
                        <td className="py-2.5 px-4 md:px-5">
                          <p className="font-black font-mono text-[#0f0f0f]">{row.discount_code}</p>
                          <div className="mt-1 h-[3px] w-24 bg-[#f0f0ee] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${((row.Signups || 0) / maxCodeSignups) * 100}%`, backgroundColor: provColor(selectedProvince) }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1.5 text-[10.5px]">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: channelColor(ch) }} />
                            {ch}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10.5px] text-[#888]">{(row.Province || "ON").toUpperCase()}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{(row.Signups || 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{(row["Paying cx"] || 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#2b5346]">{conversion.toFixed(1)}%</td>
                        {hasLtv && <>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">{money(avgLtv)}</td>
                          <td className="py-2.5 px-4 md:px-5 text-right font-mono tabular-nums text-[#888]">{money(row["Sum LTV 12"] || 0)}</td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCodes.length === 0 && (
                <div className="py-14 px-5 text-center">
                  <p className="text-sm font-semibold text-[#3d3d3d]">No codes match these filters</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 text-xs font-semibold text-[#2b5346] cursor-pointer hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <footer className="px-4 md:px-5 py-3 border-t border-[#ececea] bg-[#fafafa] flex items-center justify-between gap-3 text-[10px] font-mono text-[#888]">
              <span>{filteredCodes.length.toLocaleString()} of {provinceCodes.length.toLocaleString()} codes shown</span>
              <span className="tabular-nums">
                {filteredCodes.reduce((s, r) => s + (r.Signups || 0), 0).toLocaleString()} signups ·{" "}
                {filteredCodes.reduce((s, r) => s + (r["Paying cx"] || 0), 0).toLocaleString()} paying
              </span>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
