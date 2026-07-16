#!/usr/bin/env node
// Refreshes the built-in BD Events DB from a new Looker export:
//   1. validates the export's columns,
//   2. computes the new date range + BD code count,
//   3. shows them and asks for confirmation,
//   4. copies the CSV to public/data/signups.csv and rewrites
//      src/config/builtinDb.ts (the single source of truth for those values).
//
// Usage: node scripts/update-builtin-db.mjs <looker-export.csv> [--yes]

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [input, ...flags] = process.argv.slice(2);
const skipConfirm = flags.includes("--yes");

if (!input) {
  console.error("Usage: node scripts/update-builtin-db.mjs <looker-export.csv> [--yes]");
  process.exit(1);
}

const REQUIRED = ["signup_date", "discount_code", "channel", "province"];

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

const text = readFileSync(resolve(input), "utf8");
const lines = text.split("\n").filter(l => l.trim());
const header = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
const missing = REQUIRED.filter(c => !header.includes(c));
if (missing.length) {
  console.error(`Export is missing required column(s): ${missing.join(", ")}`);
  console.error(`Found: ${header.join(", ")}`);
  process.exit(1);
}
const iDate = header.indexOf("signup_date");
const iCode = header.indexOf("discount_code");

const bdCodes = new Set();
let minTime = Infinity, maxTime = -Infinity;
for (let r = 1; r < lines.length; r++) {
  const f = parseCsvRow(lines[r]);
  const d = new Date(f[iDate]);
  if (!isNaN(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
    minTime = Math.min(minTime, d.getTime());
    maxTime = Math.max(maxTime, d.getTime());
  }
  const code = (f[iCode] ?? "").trim().toUpperCase();
  if (!code || code === "NULL") continue;
  // Advertised code count = distinct BD/EV-prefix codes (matches historical 681/688 numbers)
  if (code.startsWith("BD") || code.startsWith("EV")) bdCodes.add(code);
}
if (!isFinite(minTime)) {
  console.error("No parseable signup dates found — is this the right file?");
  process.exit(1);
}

const min = new Date(minTime), max = new Date(maxTime);
const fmt = (d, opts) => d.toLocaleDateString("en-CA", opts);
const fy = d => d.getMonth() + 1 >= 7 ? d.getFullYear() + 1 : d.getFullYear();
const fyStart = fy(min);
// A fiscal year that only just started (data ends in its July) doesn't count
// as covered — matches the historical "FY25–FY26 · 2 fiscal years" framing.
let fyEnd = fy(max);
if (max.getMonth() + 1 === 7 && fyEnd > fyStart) fyEnd -= 1;

const values = {
  codeCount: bdCodes.size,
  startLabel: fmt(min, { month: "short", day: "numeric", year: "numeric" }),
  endLabel: fmt(max, { month: "short", day: "numeric", year: "numeric" }),
  startMonthLabel: fmt(min, { month: "short", year: "numeric" }),
  endMonthLabel: fmt(max, { month: "short", year: "numeric" }),
  endShortLabel: fmt(max, { month: "short", day: "numeric" }),
  fiscalYears: fyStart === fyEnd ? `FY${fyEnd % 100}` : `FY${fyStart % 100}–FY${fyEnd % 100}`,
  fiscalYearCount: fyEnd - fyStart + 1,
};

console.log(`\nNew built-in DB version (${lines.length - 1} rows):`);
console.log(`  Date range:  ${values.startLabel} – ${values.endLabel}`);
console.log(`  BD codes:    ${values.codeCount}`);
console.log(`  Fiscal:      ${values.fiscalYears} (${values.fiscalYearCount} years)\n`);

async function confirm() {
  if (skipConfirm) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(res => rl.question("Apply this update? [y/N] ", res));
  rl.close();
  return answer.trim().toLowerCase().startsWith("y");
}

if (!(await confirm())) {
  console.log("Aborted — nothing changed.");
  process.exit(0);
}

copyFileSync(resolve(input), join(root, "public", "data", "signups.csv"));

const configPath = join(root, "src", "config", "builtinDb.ts");
let config = readFileSync(configPath, "utf8");
for (const [key, val] of Object.entries(values)) {
  const replacement = typeof val === "number" ? String(val) : `"${val}"`;
  const re = new RegExp(`(${key}:\\s*)("[^"]*"|\\d+)`);
  if (!re.test(config)) {
    console.error(`Could not find "${key}" in builtinDb.ts — update it manually.`);
    continue;
  }
  config = config.replace(re, `$1${replacement}`);
}
writeFileSync(configPath, config);

// Keep the docs truth file's version line in sync too
const truthsPath = join(root, "docs", "DATA_INTEGRITY_TRUTHS.md");
try {
  let truths = readFileSync(truthsPath, "utf8");
  truths = truths
    .replace(/covers codes from \*\*[^*]+\*\*/, `covers codes from **${values.startLabel} – ${values.endLabel}**`)
    .replace(/approximately \*\*\d+ unique BD\/EV codes\*\*/, `approximately **${values.codeCount} unique BD/EV codes**`)
    .replace(/\*Last updated: [^.]+\./, `*Last updated: ${values.endLabel}.`);
  writeFileSync(truthsPath, truths);
  console.log("Updated docs/DATA_INTEGRITY_TRUTHS.md");
} catch { /* docs file optional */ }

console.log("Updated public/data/signups.csv and src/config/builtinDb.ts");
console.log("Run `npm run lint && npm run build`, then commit the changed files.");
