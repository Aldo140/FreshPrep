import { AnalysisFlow, ReportPage } from "../types";

export type Relevance = "full" | "partial";

/**
 * Defines how relevant each tab is for each analysis flow.
 * "partial" = tab is accessible but data is scoped to a subset, not the full picture.
 * "full"    = tab is fully meaningful for this flow.
 *
 * To mark a new tab as partial for a flow: change its entry here.
 * The tab bar, overview nav cards, and tab body all read from this map.
 */
export const TAB_RELEVANCE: Record<ReportPage, Record<AnalysisFlow, Relevance>> = {
  overview:    { all: "full", paste: "full",    compare: "full"    },
  performance: { all: "full", paste: "full",    compare: "full"    },
  revenue:     { all: "full", paste: "full",    compare: "full"    },
  regional:    { all: "full", paste: "partial", compare: "partial" },
  data:        { all: "full", paste: "full",    compare: "full"    },
  issues:      { all: "full", paste: "full",    compare: "full"    },
};

/**
 * Contextual explanation shown inside a tab when its relevance is "partial".
 * Only define an entry here if the tab has a partial state.
 */
export const PARTIAL_REASON: Partial<Record<ReportPage, string>> = {
  regional:
    "Regional data is most useful when analyzing your full dataset — it shows where signups are coming from across all campaigns. For a complete provincial view, go back and choose Full Dataset.",
};
