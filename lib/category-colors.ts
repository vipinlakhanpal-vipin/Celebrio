// Shared category color palette — used by the Dashboard's category chips and
// the Contacts page's filter tabs, so Family/Friends/Colleagues/Relatives/
// Others read as the same five colors no matter which screen you're on.
//
// `gradient` is the solid fill (same treatment as the dashboard stat tiles —
// always white text on top, so it's theme-agnostic), used for every tab/chip
// all the time, not just a selected one. `ring` is the matching solid hex
// (the gradient's own lighter stop) used for the focus/selection ring on the
// Contacts page, where a tab needs some way to show it's the active filter
// even though every tab is already the same solid color.
export const CATEGORY_COLORS: Record<string, { gradient: string; ring: string }> = {
  family: {
    gradient: "linear-gradient(150deg, #4f8ff7 0%, #2f65d9 100%)",
    ring: "#4f8ff7",
  },
  friends: {
    gradient: "linear-gradient(150deg, #22c55e 0%, #0e9f6e 100%)",
    ring: "#22c55e",
  },
  colleagues: {
    gradient: "linear-gradient(150deg, #f5a623 0%, #d97706 100%)",
    ring: "#f5a623",
  },
  relatives: {
    gradient: "linear-gradient(150deg, #ec4899 0%, #be185d 100%)",
    ring: "#ec4899",
  },
  others: {
    gradient: "linear-gradient(150deg, #94a3b8 0%, #64748b 100%)",
    ring: "#94a3b8",
  },
};
