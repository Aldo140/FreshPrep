import * as XLSX from "xlsx";
import { CustomerRecord } from "../types";

type SheetRow = Record<string, unknown>;

const COLUMN_MAP: Record<string, string[]> = {
  signup_date:       ["signup_date", "signup date", "signupdate", "date", "created_at", "created at"],
  client_id:         ["client_id", "client id", "clientid", "customer_id", "customer id", "customerid", "id"],
  current_status:    ["current_status", "current status", "status"],
  discount_code:     ["discount_code", "discount code", "code", "promo code", "promocode", "promo_code"],
  channel:           ["channel", "source", "acquisition_channel", "acquisition channel"],
  province:          ["province", "prov", "region", "state"],
  first_paying_date: ["first_paying_date", "first paying date", "firstpayingdate", "paying_date", "first paid"],
  days_till_paying:  ["days till paying", "days_till_paying", "daystillpaying", "days to paying", "days_to_paying"],
};

function resolveHeader(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [key, aliases] of Object.entries(COLUMN_MAP)) {
    if (key === clean || aliases.includes(clean)) return key;
  }
  return null;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  return String(v).trim();
}

function toNum(v: unknown): number | undefined {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

export function parseCustomerFile(file: File): Promise<CustomerRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Empty file");

        const workbook = XLSX.read(data, { type: "binary" });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

        let headerRowIndex = 0;
        let maxMatches = 0;
        for (let i = 0; i < Math.min(5, allRows.length); i++) {
          const matches = (allRows[i] as unknown[]).filter(
            h => h && resolveHeader(String(h)) !== null
          ).length;
          if (matches > maxMatches) { maxMatches = matches; headerRowIndex = i; }
        }

        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "", range: headerRowIndex }) as SheetRow[];
        if (rawRows.length === 0) throw new Error("No data rows found");

        const firstRaw = rawRows[0];
        const headerMap: Record<string, string> = {};
        for (const col of Object.keys(firstRaw)) {
          const resolved = resolveHeader(col);
          if (resolved) headerMap[col] = resolved;
        }

        const records: CustomerRecord[] = rawRows.map(row => {
          const get = (key: string): unknown => {
            for (const [col, normalized] of Object.entries(headerMap)) {
              if (normalized === key) return row[col];
            }
            return "";
          };

          const code = toStr(get("discount_code"));
          return {
            signup_date:       toStr(get("signup_date")),
            client_id:         toStr(get("client_id")),
            current_status:    toStr(get("current_status")),
            discount_code:     code.length > 0 ? code.toUpperCase() : null,
            channel:           toStr(get("channel")),
            province:          toStr(get("province")).toUpperCase(),
            first_paying_date: toStr(get("first_paying_date")) || undefined,
            days_till_paying:  toNum(get("days_till_paying")),
          };
        }).filter(r => r.signup_date.length > 0);

        resolve(records);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsBinaryString(file);
  });
}
