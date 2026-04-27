import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";

const STATUS_META = {
  pending:    { label: "Pending",    color: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400" },
  completed:  { label: "Completed",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400" },
  held:       { label: "Held",       color: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400" },
  cancelled:  { label: "Cancelled",  color: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
};

const fmtVND  = (n) => `₫${Number(n || 0).toLocaleString("vi-VN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

export default function CompanyPayoutsPage() {
  const [payouts,  setPayouts]  = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("");
  const [page,     setPage]     = useState(1);
  const [pagination, setPag]    = useState({ total: 0, totalPages: 1 });

  const fetchPayouts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (tab) params.status = tab;
      const { data } = await api.get("/payouts/company", { params });
      setPayouts(data.data ?? []);
      setPag(data.pagination ?? { total: 0, totalPages: 1 });
      setSummary(data.summary ?? []);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchPayouts(1); }, [fetchPayouts]);

  // Tính summary stats
  const totalCompleted = summary.find(s => s._id === "completed")?.totalNet ?? 0;
  const totalPending   = summary.find(s => s._id === "pending")?.totalNet   ?? 0;
  const totalHeld      = summary.find(s => s._id === "held")?.totalNet      ?? 0;

  const TABS = [
    { key: "",          label: "Tất cả" },
    { key: "pending",   label: "Pending" },
    { key: "completed", label: "Completed" },
    { key: "held",      label: "Held" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payouts</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Lịch sử thanh toán từ WanderViet
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Đã nhận",    value: totalCompleted, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Đang chờ",   value: totalPending,   color: "text-amber-600 dark:text-amber-400" },
          { label: "Đang giữ",   value: totalHeld,      color: "text-red-600 dark:text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{fmtVND(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 border transition-all
                        ${tab === t.key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">Chưa có payout nào</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Payout sẽ được tạo sau khi booking hoàn thành
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map(p => {
            const meta = STATUS_META[p.status] ?? STATUS_META.pending;
            return (
              <div key={p._id}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Location */}
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {p.location?.name ?? "—"}
                      </p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Booking ID */}
                    <p className="text-xs text-gray-400 dark:text-slate-500 font-mono mb-2">
                      Booking #{p.bookingOrder?._id?.slice(-8).toUpperCase() ?? "—"}
                    </p>

                    {/* Breakdown */}
                    <div className="flex gap-4 text-xs text-gray-500 dark:text-slate-400">
                      <span>Doanh thu: <strong className="text-gray-700 dark:text-slate-300">{fmtVND(p.grossAmount)}</strong></span>
                      <span>Phí: <strong className="text-red-500">-{fmtVND(p.commissionAmt)}</strong></span>
                    </div>

                    {/* Released info */}
                    {p.status === "completed" && p.releasedAt && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        ✓ Đã nhận {fmtDate(p.releasedAt)}
                        {p.releaseRef && ` · Ref: ${p.releaseRef}`}
                      </p>
                    )}
                    {p.status === "held" && p.heldReason && (
                      <p className="text-xs text-red-500 mt-1">⚠️ {p.heldReason}</p>
                    )}
                  </div>

                  {/* Net amount */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {fmtVND(p.netAmount)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {fmtDate(p.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => fetchPayouts(page - 1)} disabled={page <= 1}
            className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                       dark:border-slate-700 disabled:opacity-40">← Prev</button>
          <span className="self-center text-sm text-gray-500">{page} / {pagination.totalPages}</span>
          <button onClick={() => fetchPayouts(page + 1)} disabled={page >= pagination.totalPages}
            className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                       dark:border-slate-700 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}