const VARIANT_MAP = {
  primary:   "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold shadow-sm",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white dark:border-slate-600",
  danger:    "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/15 dark:hover:bg-red-500/25 dark:text-red-400 dark:border-red-500/30",
  ghost:     "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300",
  success:   "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/30",
  link:      "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline-offset-4 hover:underline p-0",
};

const SIZE_MAP = {
  xs: "px-2.5 py-1 text-xs rounded-lg",
  sm: "px-3 py-1.5 text-xs rounded-xl",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-sm rounded-xl",
};

function Spinner({ size }) {
  const dim = size === "xs" || size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <svg className={`animate-spin ${dim}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  );
}

export function Button({
  variant = "primary", size = "md", loading = false,
  fullWidth = false, leftIcon, rightIcon, className = "", children, disabled, ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium
                  transition-all duration-150 select-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                  ${VARIANT_MAP[variant] ?? VARIANT_MAP.primary}
                  ${SIZE_MAP[size] ?? SIZE_MAP.md}
                  ${fullWidth ? "w-full" : ""}
                  ${className}`}
      {...props}
    >
      {loading ? <Spinner size={size} /> : leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

const ICON_SIZE_MAP = {
  xs: "w-6 h-6 text-xs rounded-lg",
  sm: "w-7 h-7 text-sm rounded-xl",
  md: "w-8 h-8 text-base rounded-xl",
  lg: "w-10 h-10 text-lg rounded-xl",
};

export function IconButton({ icon, variant = "ghost", size = "md", title, className = "", ...props }) {
  return (
    <button
      title={title}
      className={`inline-flex items-center justify-center shrink-0 transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${VARIANT_MAP[variant] ?? VARIANT_MAP.ghost}
                  ${ICON_SIZE_MAP[size] ?? ICON_SIZE_MAP.md}
                  ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}