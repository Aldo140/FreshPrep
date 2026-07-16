import { useEffect, useState } from "react";

export interface EventScheduleEntry {
  name: string;
  province: string;
  date: string | null;
  team: string | null;
  totalSpend: number | null;
  cpa: number | null;
}

export type EventSchedule = Record<string, EventScheduleEntry>;

let _cache: EventSchedule | null = null;
let _promise: Promise<EventSchedule> | null = null;

/**
 * Loads the bundled BD event schedule table (built from the wrap-up
 * spreadsheet by scripts/build-event-schedule.mjs), keyed by promo code.
 */
export function useEventSchedule(): EventSchedule {
  const [schedule, setSchedule] = useState<EventSchedule>(_cache ?? {});

  useEffect(() => {
    if (_cache !== null) return;
    if (!_promise) {
      _promise = fetch(`${import.meta.env.BASE_URL}data/event-schedule.json`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<EventSchedule>;
        })
        .catch(() => ({} as EventSchedule)); // metadata is optional enrichment
    }
    let cancelled = false;
    _promise.then(data => {
      _cache = data;
      if (!cancelled) setSchedule(data);
    });
    return () => { cancelled = true; };
  }, []);

  return schedule;
}
