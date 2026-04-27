const BASE =
  `w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200
   bg-white border border-gray-200 text-gray-900 placeholder-gray-400
   focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
   disabled:opacity-50 disabled:cursor-not-allowed
   dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500
   dark:focus:ring-blue-400/30 dark:focus:border-blue-400`;

const BASE_ERROR =
  `w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200
   bg-white border border-red-400 text-gray-900 placeholder-gray-400
   focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400
   disabled:opacity-50 disabled:cursor-not-allowed
   dark:bg-slate-800 dark:border-red-500/60 dark:text-white dark:placeholder-slate-500
   dark:focus:ring-red-400/30 dark:focus:border-red-400`;

export function FormField({ label, error, hint, required = false, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-slate-500">{hint}</p>}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

export function Input({ error = false, className = "", ...props }) {
  return (
    <input className={`${error ? BASE_ERROR : BASE} ${className}`} {...props} />
  );
}

export function Select({ error = false, className = "", children, ...props }) {
  return (
    <select
      className={`${error ? BASE_ERROR : BASE}
                  cursor-pointer appearance-none
                  bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")]
                  bg-no-repeat bg-[right_12px_center] pr-8 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ error = false, className = "", ...props }) {
  return (
    <textarea
      className={`${error ? BASE_ERROR : BASE} resize-none leading-relaxed ${className}`}
      {...props}
    />
  );
}

export function Checkbox({ label, description, checked, onChange, disabled = false, className = "" }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3
                       border transition-all duration-150
                       ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                       ${checked
                         ? "bg-blue-50 border-blue-300 dark:bg-blue-500/5 dark:border-blue-500/40"
                         : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/80"}
                       ${className}`}>
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only"/>
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150
                         ${checked ? "bg-blue-600 border-blue-600" : "bg-transparent border-gray-300 dark:border-slate-600"}`}>
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </div>
      </div>
      <div>
        {label && <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>}
        {description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

export function RadioGroup({ options = [], value, onChange, layout = "vertical", disabled = false }) {
  return (
    <div className={`flex gap-2 ${layout === "horizontal" ? "flex-row flex-wrap" : "flex-col"}`}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <label key={opt.value}
            className={`flex items-start gap-3 cursor-pointer rounded-xl border px-4 py-3
                        transition-all duration-150
                        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                        ${isSelected
                          ? "bg-blue-50 border-blue-300 dark:bg-blue-500/5 dark:border-blue-500/40 text-gray-900 dark:text-white"
                          : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/80 text-gray-600 dark:text-slate-300"}`}>
            <div className="relative mt-0.5 shrink-0">
              <input type="radio" value={opt.value} checked={isSelected}
                onChange={() => !disabled && onChange(opt.value)} className="sr-only"/>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                               ${isSelected ? "border-blue-600 dark:border-blue-400" : "border-gray-300 dark:border-slate-600"}`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"/>}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              {opt.description && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{opt.description}</p>}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export function RangeInput({ minProps, maxProps, separator = "—" }) {
  return (
    <div className="flex items-center gap-2">
      <Input {...minProps} className="flex-1"/>
      <span className="text-gray-400 dark:text-slate-500 text-sm shrink-0">{separator}</span>
      <Input {...maxProps} className="flex-1"/>
    </div>
  );
}