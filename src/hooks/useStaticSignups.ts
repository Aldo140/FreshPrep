import { useState, useCallback } from "react";
import { CustomerRecord } from "../types";

let _cache: CustomerRecord[] | null = null;
let _promise: Promise<CustomerRecord[]> | null = null;

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  const len = line.length;
  while (i < len) {
    if (line[i] === '"') {
      i++;
      let field = "";
      while (i < len) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else field += line[i++];
      }
      fields.push(field);
      if (i < len && line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

function parseStaticCsv(text: string): CustomerRecord[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const header = parseCsvRow(lines[0]);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => { idx[h.trim().toLowerCase().replace(/\s+/g, "_")] = i; });

  const iDate  = idx.signup_date         ?? 0;
  const iId    = idx.client_id           ?? 1;
  const iStat  = idx.current_status      ?? 2;
  const iCode  = idx.discount_code       ?? 3;
  const iChan  = idx.channel             ?? 4;
  const iEmail = idx.email               ?? 5;
  const iLast  = idx.last_step           ?? 6;
  const iProv  = idx.province            ?? 7;
  const iPay   = idx.first_paying_date   ?? 8;
  const iDays  = idx.days_till_paying    ?? 9;

  const records: CustomerRecord[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r].trim();
    if (!line) continue;
    const f = parseCsvRow(line);
    const signupDate = f[iDate]?.trim() ?? "";
    if (!signupDate) continue;
    const rawCode = f[iCode]?.trim().toUpperCase() ?? "";
    records.push({
      signup_date:       signupDate,
      client_id:         f[iId]?.trim()   ?? "",
      current_status:    f[iStat]?.trim() ?? "",
      discount_code:     rawCode.length > 0 && rawCode !== "NULL" ? rawCode : null,
      channel:           f[iChan]?.trim() ?? "",
      email:             f[iEmail]?.trim()  || undefined,
      last_step:         f[iLast]?.trim()   || undefined,
      province:          (f[iProv]?.trim() ?? "").toUpperCase(),
      first_paying_date: f[iPay]?.trim()  || undefined,
      days_till_paying:  f[iDays] ? (Number(f[iDays]) || undefined) : undefined,
    });
  }
  return records;
}

interface StaticSignupsState {
  rows: CustomerRecord[];
  loading: boolean;
  error: string | null;
}

export function useStaticSignups() {
  const [state, setState] = useState<StaticSignupsState>({
    rows:    _cache ?? [],
    loading: false,
    error:   null,
  });

  const load = useCallback(async () => {
    if (_cache !== null) {
      setState({ rows: _cache, loading: false, error: null });
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      if (!_promise) {
        _promise = fetch(`${import.meta.env.BASE_URL}data/signups.csv`)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then(text => parseStaticCsv(text));
      }
      const rows = await _promise;
      _cache = rows;
      setState({ rows, loading: false, error: null });
    } catch (err) {
      _promise = null;
      setState({ rows: [], loading: false, error: String(err) });
    }
  }, []);

  return { ...state, load };
}
