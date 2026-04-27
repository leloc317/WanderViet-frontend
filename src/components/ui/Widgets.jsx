import { useState, useCallback } from "react";

// ─── StatCard ─────────────────────────────────────────────────────────────────
const STAT_COLORS = {
  amber:  "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  green:  "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  blue:   "bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
  red:    "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-400/10 dark:text-purple-400",
  teal:   "bg-teal-50 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400",
};

export function StatCard({ label, value, icon, color = "amber", trend, onClick }) {
  const cfg = STAT_COLORS[color] ?? STAT_COLORS.amber;
  const trendPos = trend?.startsWith("+");
  return (
    <div onClick={onClick}
         className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                     rounded-2xl p-5 flex items-center gap-4
                     ${onClick ? "cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 transition-colors" : ""}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${cfg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 dark:text-slate-400 text-xs font-medium truncate">{label}</p>
        <p className="text-gray-900 dark:text-white text-2xl font-bold leading-tight">{value ?? "—"}</p>
        {trend && (
          <p className={`text-xs font-medium mt-0.5 ${trendPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {trend} vs last month
          </p>
        )}
      </div>
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = "Search...", width = "w-64" }) {
  return (
    <div className={`relative ${width}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 text-sm pointer-events-none">
        🔍
      </span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                   text-gray-900 dark:text-white rounded-xl pl-9 pr-9 py-2.5 text-sm
                   placeholder-gray-400 dark:placeholder-slate-500
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                   dark:focus:ring-blue-400/30 dark:focus:border-blue-400
                   transition-all duration-200"/>
      {value && (
        <button onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500
                     hover:text-gray-700 dark:hover:text-slate-300 transition-colors text-lg leading-none">
          ×
        </button>
      )}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumb && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 mb-1.5">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, limit, onChange }) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    const delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        pages.push(i);
      } else if (i === page - delta - 1 || i === page + delta + 1) {
        pages.push("...");
      }
    }
    return pages;
  };

  const from = (page - 1) * (limit || 15) + 1;
  const to   = Math.min(page * (limit || 15), total || 0);

  const btnBase = `rounded-lg text-sm transition-colors`;
  const btnPage = `w-8 h-8 ${btnBase}`;
  const btnNav  = `px-2.5 py-1.5 ${btnBase}`;
  const inactive = "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700";
  const disabled = "opacity-40 cursor-not-allowed";

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-gray-400 dark:text-slate-500">
        {total != null ? `${from}–${to} of ${total}` : `Page ${page} of ${totalPages}`}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className={`${btnNav} ${page <= 1 ? disabled : inactive}`}>
          ←
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="px-1 text-gray-400 dark:text-slate-600 text-sm">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p)}
              className={`${btnPage} ${p === page
                ? "bg-blue-600 text-white font-bold"
                : inactive}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className={`${btnNav} ${page >= totalPages ? disabled : inactive}`}>
          →
        </button>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs = [], active, onChange, variant = "pill" }) {
  if (variant === "underline") {
    return (
      <div className="flex border-b border-gray-200 dark:border-slate-800 mb-4
                      overflow-x-auto scrollbar-none -mx-4 sm:mx-0 px-4 sm:px-0">
        {tabs.map(({ key, label, count }) => (
          <button key={key} onClick={() => onChange(key)}
            className={`shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium
                        transition-all border-b-2 -mb-px whitespace-nowrap
                        ${active === key
                          ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                          : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"}`}>
            {label}
            {count != null && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                                ${active === key
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-slate-800/50 rounded-xl p-1 w-fit mb-4">
      {tabs.map(({ key, label, count }) => (
        <button key={key} onClick={() => onChange(key)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${active === key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"}`}>
          {label}
          {count != null && (
            <span className={`ml-1.5 text-xs ${active === key ? "text-blue-100" : "text-gray-400 dark:text-slate-500"}`}>
              ({count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const TOAST_STYLE = {
  success: { icon: "✅", bar: "bg-emerald-500" },
  error:   { icon: "❌", bar: "bg-red-500"     },
  warning: { icon: "⚠️", bar: "bg-amber-500"   },
  info:    { icon: "ℹ️", bar: "bg-blue-500"    },
};

export function Toast({ toasts = [], onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const cfg = TOAST_STYLE[t.type] ?? TOAST_STYLE.info;
        return (
          <div key={t.id}
               className="pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-sm
                          bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                          rounded-xl px-4 py-3 shadow-xl">
            <div className={`w-1 self-stretch rounded-full shrink-0 ${cfg.bar}`}/>
            <span className="text-base shrink-0">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              {t.title && <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.title}</p>}
              <p className="text-sm text-gray-600 dark:text-slate-300">{t.message}</p>
            </div>
            <button onClick={() => onDismiss(t.id)}
              className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white
                         transition-colors text-lg leading-none shrink-0 mt-0.5">
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

let _id = 0;
export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  const show = useCallback((message, type = "info", title) => {
    const id = ++_id;
    setToasts((p) => [...p, { id, message, type, title }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss, duration]);

  const toast = {
    success: (msg, title) => show(msg, "success", title),
    error:   (msg, title) => show(msg, "error",   title),
    warning: (msg, title) => show(msg, "warning", title),
    info:    (msg, title) => show(msg, "info",    title),
  };
  return { toasts, toast, dismiss };
}