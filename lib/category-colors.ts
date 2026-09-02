// Shared category color palette — used by the Dashboard's category chips and
// the Contacts page's filter tabs, so Family/Friends/Colleagues/Relatives/
// Others read as the same five colors no matter which screen you're on.
//
// `gradient` is the solid fill for a selected/"active" chip (same treatment
// as the dashboard stat tiles — always white text on top, so it's theme-
// agnostic). `outlineClassName` is for the unselected state: a colored
// border + colored text on a transparent/card background, using Tailwind's
// dark: variant (rather than a fixed hex) so each color keeps good contrast
// in both light and dark mode instead of washing out in one of them.
export const CATEGORY_COLORS: Record<string, { gradient: string; outlineClassName: string }> = {
  family: {
    gradient: "linear-gradient(150deg, #4f8ff7 0%, #2f65d9 100%)",
    outlineClassName: "border-blue-500/40 text-blue-600 dark:border-blue-400/40 dark:text-blue-400",
  },
  friends: {
    gradient: "linear-gradient(150deg, #22c55e 0%, #0e9f6e 100%)",
    outlineClassName: "border-emerald-500/40 text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-400",
  },
  colleagues: {
    gradient: "linear-gradient(150deg, #f5a623 0%, #d97706 100%)",
    outlineClassName: "border-amber-500/40 text-amber-600 dark:border-amber-400/40 dark:text-amber-400",
  },
  relatives: {
    gradient: "linear-gradient(150deg, #ec4899 0%, #be185d 100%)",
    outlineClassName: "border-pink-500/40 text-pink-600 dark:border-pink-400/40 dark:text-pink-400",
  },
  others: {
    gradient: "linear-gradient(150deg, #94a3b8 0%, #64748b 100%)",
    outlineClassName: "border-slate-500/40 text-slate-600 dark:border-slate-400/40 dark:text-slate-400",
  },
};
