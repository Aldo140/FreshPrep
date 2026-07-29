#!/usr/bin/env node
// Builds public/data/looker-code-totals.json — per-code signups AND confirmed paying
// customers — from the two Looker "Code Level Report" exports.
//
// Why both sides come from here:
//
//   • Paying: the bundled signup DB can only tell us someone reached the "Paying
//     Customer" funnel step (their first promotional delivery). Looker's Paying
//     Customers means total revenue > $49 — they ordered BEYOND the promo week,
//     which is FreshPrep's actual definition of a Customer. Those differ a lot
//     (EVCALGARYMARATHON26: 23 vs 8) and the Looker figure is the reported one.
//
//   • Signups: taking the denominator from the same export as the numerator keeps
//     conversion a single-source ratio, per DATA_INTEGRITY_TRUTHS.md §1. It also
//     covers codes the built-in per-signup DB never captured. Spot-checked against
//     that DB where both exist and they agree exactly (EVCALGARYMARATHON26: 24 = 24).
//
// The BD event wrap-up workbook's own Sign ups / Paying / Conversion / LTV columns
// are deliberately NOT a source anywhere — hand-maintained and inconsistent.
//
// Usage:
//   node scripts/build-looker-totals.mjs <signup-side.csv> <paying-side.csv>
// Pass "-" for a side you don't have.

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [signupArg, payingArg] = process.argv.slice(2);
const outputPath = join(root, "public", "data", "looker-code-totals.json");

if (!signupArg && !payingArg) {
  console.error("Usage: node scripts/build-looker-totals.mjs <signup-side.csv> <paying-side.csv>");
  console.error('Pass "-" for a side you do not have.');
  process.exit(1);
}

function parseCsvRow(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let f = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { f += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else f += line[i++];
      }
      fields.push(f);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

const norm = h => h.trim().toLowerCase().replace(/\(.*?\)/g, "").replace(/[\s-]+/g, "_").replace(/_+$/g, "").trim();

function isRelevant(code, channel) {
  if (code.startsWith("EV") || code.startsWith("BD")) return true;
  const ch = (channel ?? "").replace(/[\s_-]/g, "").toLowerCase();
  return ch === "businessdevelopment" || ch === "events";
}

/** Sums a Code Level Report by code. */
function tally(path, codeCols, countCols, label) {
  const text = readFileSync(resolve(path), "utf8");
  const lines = text.split("\n").filter(l => l.trim());
  const header = parseCsvRow(lines[0]).map(norm);

  const iCode = codeCols.map(c => header.indexOf(c)).find(i => i !== -1);
  const iCount = countCols.map(c => header.indexOf(c)).find(i => i !== -1);
  const iChannel = header.indexOf("channel_updated");

  if (iCode === undefined || iCount === undefined) {
    console.error(`\n${path}`);
    console.error(`  Doesn't look like the ${label} Code Level Report.`);
    console.error(`  Expected one of [${codeCols}] and [${countCols}]. Found: ${header.join(", ")}`);
    process.exit(1);
  }

  const byCode = {};
  let scanned = 0, kept = 0;
  for (let r = 1; r < lines.length; r++) {
    const f = parseCsvRow(lines[r]);
    scanned++;
    const code = (f[iCode] ?? "").trim().toUpperCase();
    if (!code || code === "NULL") continue;
    const channel = iChannel >= 0 ? f[iChannel] : undefined;
    if (!isRelevant(code, channel)) continue;
    const n = Number(String(f[iCount] ?? "").replace(/[,\s]/g, "")) || 0;
    if (n <= 0) continue;
    byCode[code] = (byCode[code] ?? 0) + n;
    kept++;
  }
  return { byCode, scanned, kept, file: path.split("/").pop() };
}

const signups = signupArg && signupArg !== "-"
  ? tally(signupArg, ["signup_code"], ["new_signup", "new_signups"], "signup-side")
  : null;
const paying = payingArg && payingArg !== "-"
  ? tally(payingArg, ["code_used"], ["client_id"], "paying-side")
  : null;

const allCodes = Array.from(new Set([
  ...Object.keys(signups?.byCode ?? {}),
  ...Object.keys(paying?.byCode ?? {}),
])).sort();

const byCode = {};
for (const c of allCodes) {
  byCode[c] = {
    signups: signups?.byCode[c] ?? null,
    paying: paying?.byCode[c] ?? null,
  };
}

const payload = {
  generatedAt: new Date().toISOString(),
  signupSource: signups?.file ?? null,
  payingSource: paying?.file ?? null,
  codeCount: allCodes.length,
  totalSignups: Object.values(byCode).reduce((s, v) => s + (v.signups ?? 0), 0),
  totalPaying: Object.values(byCode).reduce((s, v) => s + (v.paying ?? 0), 0),
  byCode,
};

writeFileSync(outputPath, JSON.stringify(payload, null, 1));

if (signups) console.log(`signup-side: ${signups.scanned.toLocaleString()} rows → ${signups.kept.toLocaleString()} BD/Events rows`);
if (paying)  console.log(`paying-side: ${paying.scanned.toLocaleString()} rows → ${paying.kept.toLocaleString()} BD/Events rows`);
console.log(`${allCodes.length.toLocaleString()} codes · ${payload.totalSignups.toLocaleString()} signups · ${payload.totalPaying.toLocaleString()} paying`);
console.log(`Wrote ${outputPath} (${(JSON.stringify(payload).length / 1024).toFixed(0)} KB)`);
for (const c of ["EVCALGARYMARATHON26", "EVIBYYCMARATHON6", "BDVENNGO"]) {
  if (byCode[c]) console.log(`  spot check ${c}: ${byCode[c].signups} signups · ${byCode[c].paying} paying`);
}
