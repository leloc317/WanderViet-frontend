import { useEffect } from "react";

function useEscapeKey(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
}

function useLockScroll(open) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
}

const SIZE_MAP = {
  sm:   "max-w-sm",
  md:   "max-w-lg",
  lg:   "max-w-2xl",
  xl:   "max-w-4xl",
  full: "max-w-[95vw]",
};

export function Modal({ open, onClose, title, children, footer, size = "md", closeOnBackdrop = true }) {
  useEscapeKey(open, onClose);
  useLockScroll(open);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
           onClick={closeOnBackdrop ? onClose : undefined}/>

      {/* Panel */}
      <div className={`relative flex flex-col w-full max-h-[90vh] shadow-2xl rounded-2xl
                       bg-white border border-gray-200
                       dark:bg-slate-900 dark:border-slate-700
                       ${SIZE_MAP[size] ?? SIZE_MAP.md}`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
            <h3 className="font-semibold text-base text-gray-900 dark:text-white">{title}</h3>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none
                         text-gray-400 hover:text-gray-700 hover:bg-gray-100
                         dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800
                         transition-all duration-150">
              ×
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer, width = "480px", side = "right" }) {
  useEscapeKey(open, onClose);
  useLockScroll(open);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div style={{ width }}
           className={`absolute top-0 bottom-0 flex flex-col shadow-2xl
                       bg-white border-gray-200
                       dark:bg-slate-900 dark:border-slate-700
                       ${side === "right"
                         ? "right-0 border-l rounded-l-2xl"
                         : "left-0 border-r rounded-r-2xl"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <h3 className="font-semibold text-base text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none
                       text-gray-400 hover:text-gray-700 hover:bg-gray-100
                       dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800
                       transition-all duration-150">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, title = "Confirm", message = "Are you sure?",
  confirmLabel = "Confirm", confirmVariant = "danger", onConfirm, loading = false,
}) {
  useEscapeKey(open, onClose);
  const variantCls = {
    danger:  "bg-red-600 hover:bg-red-700 text-white",
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  };
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                      rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          {confirmVariant === "danger" && (
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-xl shrink-0">
              ⚠️
            </div>
          )}
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm bg-gray-100 hover:bg-gray-200 text-gray-700
                       dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${variantCls[confirmVariant] ?? variantCls.danger}`}>
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}