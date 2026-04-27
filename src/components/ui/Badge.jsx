const COLOR_MAP = {
  green:  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20",
  red:    "bg-red-100 text-red-700 border-red-200 dark:bg-red-400/10 dark:text-red-400 dark:border-red-400/20",
  yellow: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20",
  blue:   "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20",
  slate:  "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-400/10 dark:text-slate-400 dark:border-slate-400/20",
  purple: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-400/10 dark:text-purple-400 dark:border-purple-400/20",
  orange: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-400/10 dark:text-orange-400 dark:border-orange-400/20",
  teal:   "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-400/10 dark:text-teal-400 dark:border-teal-400/20",
};

const DOT_MAP = {
  green: "bg-emerald-500", red: "bg-red-500", yellow: "bg-amber-500",
  blue: "bg-blue-500", slate: "bg-gray-400", purple: "bg-purple-500",
  orange: "bg-orange-500", teal: "bg-teal-500",
};

const SIZE_MAP = {
  sm: "px-1.5 py-0.5 text-[10px] gap-1",
  md: "px-2 py-0.5 text-xs gap-1.5",
  lg: "px-2.5 py-1 text-sm gap-1.5",
};

export function Badge({ label, color = "slate", size = "md", dot = false }) {
  return (
    <span className={`inline-flex items-center rounded-md font-medium border
                      ${COLOR_MAP[color] ?? COLOR_MAP.slate}
                      ${SIZE_MAP[size] ?? SIZE_MAP.md}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_MAP[color] ?? DOT_MAP.slate}`} />}
      {label}
    </span>
  );
}

const STATUS_CFG = {
  active:         { label: "Active",      color: "green"  },
  inactive:       { label: "Inactive",    color: "slate"  },
  suspended:      { label: "Suspended",   color: "yellow" },
  banned:         { label: "Banned",      color: "red"    },
  approved:       { label: "Approved",    color: "green"  },
  pending:        { label: "Pending",     color: "yellow" },
  pending_review: { label: "In Review",   color: "yellow" },
  rejected:       { label: "Rejected",    color: "red"    },
  draft:          { label: "Draft",       color: "slate"  },
  template:       { label: "Template",    color: "blue"   },
  running:        { label: "Running",     color: "teal"   },
  expired:        { label: "Expired",     color: "red"    },
};

export function StatusBadge({ status, size = "md" }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: "slate" };
  return <Badge label={cfg.label} color={cfg.color} size={size} dot />;
}

const ROLE_CFG = {
  admin:    { label: "Admin",   color: "purple" },
  staff:    { label: "Staff",   color: "blue"   },
  approved: { label: "AT",      color: "teal"   },
  company:  { label: "Company", color: "orange" },
  user:     { label: "User",    color: "slate"  },
};

export function RoleBadge({ role, size = "md" }) {
  const cfg = ROLE_CFG[role] ?? { label: role, color: "slate" };
  return <Badge label={cfg.label} color={cfg.color} size={size} />;
}

const CATEGORY_CFG = {
  restaurant:    { label: "🍽️ Restaurant",   color: "orange" },
  tourist_spot:  { label: "🏛️ Tourist Spot", color: "blue"   },
  hotel:         { label: "🏨 Hotel",         color: "teal"   },
  cafe:          { label: "☕ Cafe",           color: "yellow" },
  entertainment: { label: "🎡 Entertainment", color: "purple" },
  shopping:      { label: "🛍️ Shopping",      color: "green"  },
  service:       { label: "🔧 Service",        color: "slate"  },
  other:         { label: "📦 Other",          color: "slate"  },
  food_tour:     { label: "🍜 Food Tour",      color: "orange" },
  sightseeing:   { label: "🏛️ Sightseeing",   color: "blue"   },
  adventure:     { label: "🧗 Adventure",      color: "red"    },
  cultural:      { label: "🎭 Cultural",       color: "purple" },
  relaxation:    { label: "🧘 Relaxation",     color: "teal"   },
  mixed:         { label: "🗺️ Mixed",          color: "slate"  },
};

export function CategoryBadge({ category, size = "md" }) {
  const cfg = CATEGORY_CFG[category] ?? { label: category, color: "slate" };
  return <Badge label={cfg.label} color={cfg.color} size={size} />;
}