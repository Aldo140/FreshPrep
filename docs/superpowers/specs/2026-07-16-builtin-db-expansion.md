# Built-in DB Expansion (7 features)

**Date:** 2026-07-16 · **Approved:** user said "yes to all" to the proposed expansion list.

The built-in DB (public/data/signups.csv) is the full 10-column Looker export,
but the app only used signups/province/channel from it. This batch surfaces the
rest and adds tooling.

## Shipped

1. **Conversion from built-in data** — `EventStats` gains `payingSignups`,
   `conversionRate`, `medianDaysToPay` (from `last_step`/`first_paying_date`/
   `days till paying`). Shown in the code-lookup card (6-stat grid), top-10
   province drill-down rows, and province tiles/cards. "Upload Looker for
   conversion" copy corrected — upload is now only needed for LTV.
2. **Retention snapshot** — `statusCounts` (active/paused/closed) per event,
   shown as chips in the lookup card.
3. **Organic baseline** — `provinceTotals` (all-channel vs BD counts per
   province) from the same CSV; desktop province cards show "BD = X% of all
   {prov} signups".
4. **New-vs-existing flag** — `preExistingAccounts`: signups whose account was
   created >90 days before the event's peak month (existing customers redeeming
   the code, e.g. the EVSTAMPEDE26 55-vs-56 case). Noted in the lookup card.
5. **YoY code families** — codes sharing an alpha stem after stripping trailing
   digits (EVSTAMPEDE10 ↔ EVSTAMPEDE26, stem ≥5 chars) are cross-linked as
   "Event history" in the lookup card; clicking jumps between editions.
6. **Event schedule join** — `scripts/build-event-schedule.mjs` extracts the
   wrap-up sheets of the schedule xlsx (data/) into
   public/data/event-schedule.json (511 codes; 448 with spend). Loaded by
   `useEventSchedule`; the lookup card shows real event name, date, team, total
   spend, $/signup, $/paying customer; search results show event names.
7. **DB refresh tooling** — version values (code count, date range, fiscal
   years) now live only in `src/config/builtinDb.ts`; UploadFlow, BdFlowPicker,
   CustomerUploadModal import from it. `scripts/update-builtin-db.mjs
   <export.csv>` validates, computes, confirms, then updates the CSV, the
   config, and docs/DATA_INTEGRITY_TRUTHS.md. Advertised code count = distinct
   BD/EV-prefix codes (688 today), verified to reproduce shipped values.

## Definitions locked in

- Paying = `last_step == "Paying Customer"` or a real `first_paying_date`.
- Pre-existing account = created >90 days before peak-month start.
- Advertised code count (BD/EV prefix, 688) ≠ internal searchable count
  (`isBdRow`: EV prefix OR BusinessDevelopment channel, 727) — both correct,
  different questions.
- A fiscal year whose data only reaches into its July doesn't count as covered.

**Verification:** `npm run lint`, `npm run build`, preview server serves app +
event-schedule.json; update script dry-run reproduces 688 / Jul 1 2024 –
Jul 15 2026 / FY25–FY26 exactly.
