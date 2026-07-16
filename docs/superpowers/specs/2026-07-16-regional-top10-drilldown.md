# Regional Tab: Province Top-10 Events Drill-Down

**Date:** 2026-07-16
**Scope:** BD-only mode (built-in BD Events DB, no Looker upload) of the Regional tab.

## Problem

The Regional tab's province tiles (mobile) and cards (desktop) show aggregate
events/signups per province, but there is no way to see *which* events drove a
province's numbers without leaving the tab.

## Design (user-approved)

Clicking a province tile/card expands it **in place** (accordion) to reveal the
top 10 events for that province. Clicking again — or clicking another
province — collapses it. One province open at a time.

- **Attribution:** an event belongs to its `homeProvince` (majority signup
  province), matching how the tiles themselves are aggregated, so drill-down
  totals stay consistent with the tile totals.
- **Ranking:** `totalSignups` descending; ties broken by code A→Z. If a
  province has fewer than 10 events, show all of them ("Top N").
- **Row contents:** rank, event code, event month ("Jul 2026"), signup count,
  plus a thin bar scaled to the province's #1 event (province accent color).
- **Affordance:** chevron on each tile/card, rotated when expanded;
  `<button aria-expanded>` wraps the clickable header for accessibility.
- Applies to both the mobile tile list and the desktop card grid; the desktop
  grid cell simply grows when expanded.

## Non-goals

- No change to Looker-upload mode (`ProvinceIntelligence` path).
- No "view all events" pagination — top 10 only.
- No cross-province signup attribution (`signupsByProvince` is not used here).

## Implementation notes

All data needed already arrives via `eventStats: EventStats[]`
(`code`, `homeProvince`, `eventMonth`, `totalSignups`). One `useMemo` groups
events by home province and sorts; one `expandedProvince: string | null`
state drives the accordion. Single-file change: `RegionalTab.tsx`.

**Verification:** `npm run lint` (tsc) + manual check in the running app.
