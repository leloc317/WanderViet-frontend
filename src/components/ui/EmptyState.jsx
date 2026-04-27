// Reusable empty state component
export default function EmptyState({
  icon = "📭",
  title = "Nothing here yet",
  description = "",
  action = null, // { label, onClick }
  size = "md",   // "sm" | "md" | "lg"
}) {
  const sizes = {
    sm: { wrap:"py-8",  icon:"text-3xl", title:"text-sm",  desc:"text-xs" },
    md: { wrap:"py-16", icon:"text-4xl", title:"text-base",desc:"text-sm" },
    lg: { wrap:"py-24", icon:"text-5xl", title:"text-xl",  desc:"text-base" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`text-center ${s.wrap}`}>
      <div className={`${s.icon} mb-3`}>{icon}</div>
      <p className={`font-semibold text-gray-900 dark:text-white ${s.title} mb-1`}>{title}</p>
      {description && (
        <p className={`text-gray-500 dark:text-slate-400 ${s.desc} mb-4 max-w-xs mx-auto`}>
          {description}
        </p>
      )}
      {action && (
        <button onClick={action.onClick}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
                     text-sm font-semibold rounded-xl transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}