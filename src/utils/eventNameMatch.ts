/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reverse lookup: free-text event name → best-guess discount code(s).
 *
 * Two independent signals, because neither alone is sufficient:
 *
 *  1. The event NAME from the BD wrap-up schedule. Word-level overlap, not character
 *     edit distance — "Calgary Reno Show" vs "Calgary Bike Show" are a tiny edit
 *     distance apart but mean different things, so tokens are the right unit.
 *
 *  2. The CODE TEXT itself. Codes routinely encode keywords the event name doesn't:
 *     EVSERVUS ← "Calgary Marathon Expo" (Servus is the venue), EVSUNFEST5 ←
 *     "Inglelwood Sunfest", EVLILAC ← "Lilac Fest". Searching for the word a BD rep
 *     actually remembers only works if the code is searched too.
 *
 * Signal 2 only ever ADDS candidates or reinforces one signal 1 already found — it
 * can't demote a good name match.
 */
import { editDistance } from "./fuzzy";
import { EventSchedule, EventScheduleEntry } from "../hooks/useEventSchedule";

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "&", "at", "in", "on", "for",
  // Near-universal in this dataset — they carry no discriminating power and, left in,
  // they let "show" alone pull in dozens of unrelated events via the code signal.
  "show", "shows", "expo", "event", "events", "fest", "festival", "market",
]);

/**
 * Abbreviations that codes use but a prefix rule would never find (YYC for Calgary,
 * MTL for Montreal). Prefix matching covers the rest generically.
 */
const ABBREVIATIONS: Record<string, string[]> = {
  calgary: ["CAL", "CGY", "YYC"],
  edmonton: ["EDM", "YEG"],
  toronto: ["TOR", "YYZ", "TO"],
  vancouver: ["VAN", "YVR"],
  montreal: ["MTL", "YUL"],
  ottawa: ["OTT"],
  victoria: ["VIC"],
  kelowna: ["KEL"],
  abbotsford: ["ABBY", "ABBOT"],
  lethbridge: ["LETH"],
  saskatoon: ["SASK"],
  winnipeg: ["WPG"],
  womens: ["WOMEN"],
  women: ["WOMEN"],
  marathon: ["MARATHON", "RUN"],
  teachers: ["TEACHER"],
  convention: ["CONV"],
  renovation: ["RENO"],
  home: ["HOME", "HS"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/).filter(t => t.length > 0 && !STOPWORDS.has(t));
}

// Two tokens are "the same word" if identical, or close enough to be a typo or
// pluralization ("women" vs "womens", "expo" vs "expos").
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  const dist = editDistance(a, b);
  return dist <= 1 || (dist <= 2 && Math.max(a.length, b.length) >= 6);
}

/** Dice-coefficient-style token overlap, 0..100, with a substring bonus. */
function scoreNameMatch(query: string, candidate: string): number {
  const qTokens = tokenize(query);
  const cTokens = tokenize(candidate);
  if (qTokens.length === 0 || cTokens.length === 0) return 0;

  const cRemaining = [...cTokens];
  let matched = 0;
  for (const qt of qTokens) {
    const idx = cRemaining.findIndex(ct => tokensMatch(qt, ct));
    if (idx !== -1) { matched++; cRemaining.splice(idx, 1); }
  }

  let score = (2 * matched) / (qTokens.length + cTokens.length) * 100;

  const qNorm = normalize(query);
  const cNorm = normalize(candidate);
  if (qNorm === cNorm) score = 100;
  else if (cNorm.includes(qNorm) || qNorm.includes(cNorm)) score = Math.min(99, score + 10);

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Scores query words against the code's own text. Strips the BD/EV prefix and any
 * trailing year/discount digits, then looks for each query word as a substring.
 * Requires at least one high-confidence hit so short/common words can't drag in
 * unrelated codes on their own.
 */
function scoreCodeMatch(qTokens: string[], code: string): number {
  const body = code.toUpperCase().replace(/^(?:BD|EV)/, "").replace(/\d+$/, "");
  if (body.length < 3) return 0;

  let strong = 0;
  let matched = 0;
  for (const t of qTokens) {
    if (t.length < 3) continue;
    const T = t.toUpperCase();
    let hit = false;

    if (T.length >= 4 && body.includes(T)) hit = true;                      // whole word in the code
    else if ((ABBREVIATIONS[t] ?? []).some(a => body.includes(a))) hit = true; // known abbreviation
    else if (T.length >= 6 && body.includes(T.slice(0, 4))) hit = true;     // generic 4-char stem

    if (hit) { matched++; strong++; }
  }

  if (strong === 0) return 0;
  const meaningful = qTokens.filter(t => t.length >= 3).length || 1;
  // Capped below a perfect name match: the code is corroborating evidence, and a
  // code-only hit should never outrank an exact name match.
  return Math.round(Math.min(92, (matched / meaningful) * 100));
}

export interface EventNameGroup {
  name: string;
  score: number;
  codes: (EventScheduleEntry & { code: string })[];
  /** Which signal found this — surfaced so a code-only guess is legible as such. */
  matchedVia: "name" | "code" | "both";
}

export interface EventNameQueryResult {
  query: string;
  groups: EventNameGroup[]; // top candidates, highest score first
}

const MIN_SCORE = 30;

/**
 * Matches free-text event-name queries against the BD event schedule, grouping codes
 * that share an event name (a recurring annual event reuses the name across several
 * year-specific codes) and returning the top candidate groups per query.
 */
export function matchEventNames(
  queries: string[],
  schedule: EventSchedule,
  maxGroupsPerQuery = 4,
): EventNameQueryResult[] {
  const byName = new Map<string, (EventScheduleEntry & { code: string })[]>();
  for (const [code, entry] of Object.entries(schedule)) {
    const key = normalize(entry.name);
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push({ ...entry, code });
  }
  const uniqueNames = Array.from(byName.entries()).map(([, entries]) => ({
    name: entries[0].name,
    entries,
  }));

  return queries.map(query => {
    const trimmed = query.trim();
    if (!trimmed) return { query, groups: [] };
    const qTokens = tokenize(trimmed);

    const scored = uniqueNames.map(({ name, entries }) => {
      const nameScore = scoreNameMatch(trimmed, name);
      // Best code hit within the group — one matching code is enough to surface the event
      const codeScore = entries.reduce((best, e) => Math.max(best, scoreCodeMatch(qTokens, e.code)), 0);

      // The code signal can lift a candidate but never demote a strong name match;
      // agreement between the two is worth a small bonus.
      let score = Math.max(nameScore, codeScore);
      if (nameScore >= MIN_SCORE && codeScore >= MIN_SCORE) score = Math.min(100, score + 6);

      const matchedVia: EventNameGroup["matchedVia"] =
        nameScore >= MIN_SCORE && codeScore >= MIN_SCORE ? "both"
        : codeScore > nameScore ? "code"
        : "name";

      return { name, score: Math.round(score), entries, matchedVia };
    })
      .filter(g => g.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, maxGroupsPerQuery);

    return {
      query: trimmed,
      groups: scored.map(g => ({
        name: g.name,
        score: g.score,
        codes: g.entries,
        matchedVia: g.matchedVia,
      })),
    };
  });
}
