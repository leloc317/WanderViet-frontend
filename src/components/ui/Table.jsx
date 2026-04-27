import { useState } from "react";

function SortIcon({ direction }) {
  if (!direction) return <span className="text-gray-300 dark:text-slate-600 text-xs ml-1">↕</span>;
  return <span className="text-blue-500 dark:text-blue-400 text-xs ml-1">{direction === "asc" ? "↑" : "↓"}</span>;
}

function EmptyState({ text, icon }) {
  return (
    <tr>
      <td colSpan={999}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-4xl mb-3">{icon || "📭"}</span>
          <p className="text-sm text-gray-400 dark:text-slate-500">{text}</p>
        </div>
      </td>
    </tr>
  );
}

export function TableSkeleton({ cols = 5, rows = 8 }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse w-20"/>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-slate-800/50">
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full animate-pulse"
                       style={{ width:`${60+Math.random()*40}%`, animationDelay:`${i*40}ms` }}/>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Table({
  columns = [], data = [], loading = false,
  emptyText = "No data found", emptyIcon,
  onSort, rowKey = "_id", onRowClick, stickyHeader = false,
}) {
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (col) => {
    if (!col.sortable) return;
    const newDir = sortKey === col.key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(col.key); setSortDir(newDir);
    onSort?.(col.key, newDir);
  };

  const displayData = onSort ? data : sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null) return 1; if (bv == null) return -1;
        const cmp = typeof av === "string" ? av.localeCompare(bv, "vi") : av - bv;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  const alignCls = { left:"text-left", center:"text-center", right:"text-right" };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b border-gray-200 dark:border-slate-800
                          bg-gray-50 dark:bg-slate-900/60
                          ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
            {columns.map((col) => (
              <th key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => handleSort(col)}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide
                              text-gray-500 dark:text-slate-400 whitespace-nowrap
                              ${alignCls[col.align] ?? "text-left"}
                              ${col.sortable ? "cursor-pointer hover:text-gray-700 dark:hover:text-slate-200 select-none" : ""}`}>
                {col.label}
                {col.sortable && <SortIcon direction={sortKey === col.key ? sortDir : null}/>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-slate-800/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full animate-pulse"
                         style={{ width:`${50+Math.random()*40}%`, animationDelay:`${i*40}ms` }}/>
                  </td>
                ))}
              </tr>
            ))
          ) : displayData.length === 0 ? (
            <EmptyState text={emptyText} icon={emptyIcon}/>
          ) : (
            displayData.map((row, i) => (
              <tr key={row[rowKey] ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-100 dark:border-slate-800/50
                              hover:bg-gray-50 dark:hover:bg-slate-800/40
                              transition-colors
                              ${onRowClick ? "cursor-pointer" : ""}`}>
                {columns.map((col) => (
                  <td key={col.key}
                      className={`px-4 py-3 text-gray-700 dark:text-slate-300
                                  ${alignCls[col.align] ?? "text-left"}`}>
                    {col.render
                      ? col.render(row[col.key], row, i)
                      : (row[col.key] ?? <span className="text-gray-300 dark:text-slate-600">—</span>)
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}