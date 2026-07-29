#!/usr/bin/env node
// Extracts per-code event metadata (name, team, costs) from the BD event
// schedule workbook into public/data/event-schedule.json, keyed by promo code.
//
// Usage: node scripts/build-event-schedule.mjs [path-to-xlsx]
// Default input: data/2026 BC_AB_ON_QC Event Schedule.xlsx

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = process.argv[2]
  ?? join(root, "data", readdirSync(join(root, "data")).find(f => f.endsWith(".xlsx")) ?? "");
const outputPath = join(root, "public", "data", "event-schedule.json");

// Sheets that hold wrap-up tables, and the home province each implies
const SHEET_PROVINCE = [
  [/^AB EVENT Wrap Ups$/i, "AB"],
  [/^BC EVENT Wrap Ups$/i, "BC"],
  [/^ON EVENT Wrap Ups$/i, "ON"],
  [/^QC EVENT Wrap Ups/i, "QC"],
  [/^Sheet13$/i, "AB"], // Edmonton Reno Show wrap-ups
];

const norm = s => String(s ?? "").trim().toLowerCase();

function findCol(header, ...names) {
  for (let i = 0; i < header.length; i++) {
    const h = norm(header[i]);
    if (names.some(n => h === n || h.startsWith(n))) return i;
  }
  return -1;
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const wb = XLSX.read(readFileSync(inputPath), { type: "buffer" });
const entries = {};
let rowsScanned = 0;

for (const sheetName of wb.SheetNames) {
  const match = SHEET_PROVINCE.find(([re]) => re.test(sheetName.trim()));
  if (!match) continue;
  const province = match[1];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });

  // Header row = the one containing a "Promo Code" column
  const headerIdx = rows.findIndex(r => r.some(c => norm(c).startsWith("promo code")));
  if (headerIdx === -1) continue;
  const header = rows[headerIdx];

  const iCode   = findCol(header, "promo code");
  const iName   = findCol(header, "event", "events:");
  const iDate   = findCol(header, "date");
  const iTeam   = findCol(header, "team");
  const iSpend  = findCol(header, "total spend");
  const iEvSp   = findCol(header, "event spend", "event cost");
  const iStaff  = findCol(header, "staff & expenses spend", "staff spend");
  const iCpa    = findCol(header, "cpa");
  // NOTE: this workbook's Sign ups / Paying Customers / Customer Conversion / LTV
  // columns are deliberately NOT extracted. They're hand-maintained, inconsistently
  // filled across provinces, and disagree with the system-of-record exports. Signups
  // come from the built-in per-signup DB, paying customers from the Looker export
  // (public/data/paying-customers.json), and LTV from a user-supplied Client LTV
  // file — never from here. Only descriptive fields and cost survive.

  for (const row of rows.slice(headerIdx + 1)) {
    rowsScanned++;
    const code = String(row[iCode] ?? "").trim().toUpperCase();
    // Real promo codes: one token, letters+digits, no spaces
    if (!/^[A-Z][A-Z0-9]{3,}$/.test(code)) continue;
    const name = String(row[iName] ?? "").trim();
    if (!name || /TOTALS?$/i.test(name)) continue;

    const entry = {
      name,
      province,
      date: String(row[iDate] ?? "").trim() || null,
      team: iTeam >= 0 ? String(row[iTeam] ?? "").trim() || null : null,
      totalSpend: toNum(row[iSpend]) ?? (
        (toNum(row[iEvSp]) ?? 0) + (toNum(row[iStaff]) ?? 0) || null
      ),
      cpa: toNum(row[iCpa]),
    };

    // Prefer the entry that has spend data if a code appears twice
    if (!entries[code] || (entries[code].totalSpend == null && entry.totalSpend != null)) {
      entries[code] = entry;
    }
  }
}

const fromWrapUps = Object.keys(entries).length;

// ── Secondary harvest: B2B partnership sheets ─────────────────────────────────
// These pair a company name with a promo code but aren't event wrap-ups, so they
// never appear above — yet they're exactly the name↔code mappings someone searching
// "Brunswick" or "St Leonards" needs. The code is embedded in free text ("New -
// BDSLCS140"), so pull any BD/EV token out of the row and take column 0 as the name.
const B2B_SHEETS = [
  [/^B2B QCON$/i, "ON"],
  [/^QC B2B$/i, "QC"],
];

for (const sheetName of wb.SheetNames) {
  const match = B2B_SHEETS.find(([re]) => re.test(sheetName.trim()));
  if (!match) continue;
  const province = match[1];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });

  for (const row of rows) {
    rowsScanned++;
    const name = String(row[0] ?? "").trim();
    if (!name || name.length < 3 || /^(company|year|green|notes)/i.test(name)) continue;

    // Any standalone BD/EV code anywhere in the row
    let found = null;
    for (const cell of row) {
      const m = String(cell ?? "").toUpperCase().match(/\b((?:BD|EV)[A-Z0-9]{2,})\b/);
      if (m) { found = m[1]; break; }
    }
    if (!found || entries[found]) continue; // never override a wrap-up entry

    entries[found] = {
      name,
      province,
      date: null,
      team: null,
      totalSpend: null,
      cpa: null,
    };
  }
}

writeFileSync(outputPath, JSON.stringify(entries, null, 1));
const total = Object.keys(entries).length;
console.log(`Scanned ${rowsScanned} rows → ${total} codes with metadata`);
console.log(`  ${fromWrapUps} from event wrap-ups · ${total - fromWrapUps} from B2B partnership sheets`);
console.log(`Wrote ${outputPath}`);
const sample = Object.entries(entries).slice(0, 3);
for (const [c, e] of sample) console.log(` ${c}: ${JSON.stringify(e)}`);
