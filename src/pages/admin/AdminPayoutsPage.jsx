import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import { PageHeader, StatCard, Pagination } from "../../components/ui/Widgets";
import { Badge, Tabs } from "../../components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const fmtVND = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";

const STATUS_CFG = {
  pending:    { label: "Pending",    color: "yellow" },
  processing: { label: "Processing", color: "blue"   },
  completed:  { label: "Released",   color: "green"  },
  held:       { label: "Held",       color: "red"    },
  cancelled:  { label: "Cancelled",  color: "slate"  },
};

const STATUS_TABS = [
  { key: "",           label: "All"        },
  { key: "pending",    label: "Pending"    },
  { key: "processing", label: "Processing" },
  { key: "completed",  label: "Released"   },
  { key: "held",       label: "Held"       },
];

const RELEASE_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "vnpay",         label: "VNPay"         },
  { value: "manual",        label: "Manual"        },
];

// ── ReleaseModal ──────────────────────────────────────────────────────────────
function ReleaseModal({ payout, open, onClose, onDone }) {
  const [method, setMethod] = useState("bank_transfer");
  const [ref,    setRef]    = useState("");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (open) { setMethod("bank_transfer"); setRef(""); setNote(""); setError(""); }
  }, [open]);

  if (!open || !payout) return null;

  const handleRelease = async () => {
    setSaving(true); setError("");
    try {
      await api.patch(`/payouts/${payout._id}/release`, {
        releaseMethod: method, releaseRef: ref, note,
      });
      onDone("Release successful");
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Release failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Release Payout</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Summary */}
          <div className="bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-0.5">Releasing to</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
              {fmtVND(payout.netAmount)}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              → {payout.company?.name} · {payout.company?.email}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">Release Method</label>
            <div className="flex gap-2 flex-wrap">
              {RELEASE_METHODS.map(m => (
                <button key={m.value} onClick={() => setMethod(m.value)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-colors
                    ${method === m.value
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
              Reference / Transaction No <span className="text-gray-400">(optional)</span>
            </label>
            <input type="text" value={ref} onChange={e => setRef(e.target.value)}
              placeholder="Payment reference or transaction number"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2} placeholder="Additional notes..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleRelease} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 transition-colors">
            {saving ? "Processing…" : "Confirm Release"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HoldModal ─────────────────────────────────────────────────────────────────
function HoldModal({ payout, open, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => { if (open) { setReason(""); setError(""); } }, [open]);

  if (!open || !payout) return null;

  const handleHold = async () => {
    setSaving(true); setError("");
    try {
      await api.patch(`/payouts/${payout._id}/hold`, { heldReason: reason });
      onDone("🔒 Payout held successfully");
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Hold failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Hold Payout</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Holding {fmtVND(payout.netAmount)} for {payout.company?.name}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
              Reason <span className="text-gray-400">(optional)</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              rows={3} placeholder="Reason for holding (dispute, fraud check, ...)"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleHold} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-50 transition-colors">
            {saving ? "Holding…" : "Hold Payout"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PayoutRow ─────────────────────────────────────────────────────────────────
function PayoutRow({ payout, onRelease, onHold, onUnhold }) {
  const sc = STATUS_CFG[payout.status] ?? { label: payout.status, color: "slate" };
  const canRelease = ["pending", "processing"].includes(payout.status);
  const canHold    = payout.status !== "completed" && payout.status !== "held";
  const canUnhold  = payout.status === "held";

  return (
    <tr className="border-b border-gray-100 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-3">
        <p className="text-xs font-medium text-gray-900 dark:text-white">{payout.company?.name ?? "—"}</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500">{payout.company?.email}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-600 dark:text-slate-300 truncate max-w-[140px]">{payout.location?.name ?? "—"}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs font-bold text-gray-900 dark:text-white">{fmtVND(payout.netAmount)}</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500">
          Gross {fmtVND(payout.grossAmount)} · Fee {fmtVND(payout.commissionAmt)}
        </p>
      </td>
      <td className="px-4 py-3 text-[11px] text-gray-500 dark:text-slate-400">
        {(payout.commissionRate * 100).toFixed(0)}%
      </td>
      <td className="px-4 py-3">
        <Badge label={sc.label} color={sc.color} size="sm" dot />
        {payout.heldReason && (
          <p className="text-[10px] text-red-500 mt-0.5 max-w-[100px] truncate" title={payout.heldReason}>
            {payout.heldReason}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
        {fmtDate(payout.createdAt)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
        {fmtDate(payout.releasedAt)}
        {payout.releasedBy && (
          <p className="text-[10px] text-gray-300 dark:text-slate-600">by {payout.releasedBy?.name}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {canRelease && (
            <button onClick={() => onRelease(payout)}
              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap">
              Release
            </button>
          )}
          {canHold && (
            <button onClick={() => onHold(payout)}
              className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-500/30
                         text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors">
              Hold
            </button>
          )}
          {canUnhold && (
            <button onClick={() => onUnhold(payout)}
              className="text-xs px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-500/30
                         text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-400/10 transition-colors">
              Unhold
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminPayoutsPage() {
  const [payouts,    setPayouts]    = useState([]);
  const [summary,    setSummary]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState("");
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [toast,      setToast]      = useState("");

  // Modals
  const [releasing, setReleasing] = useState(null);
  const [holding,   setHolding]   = useState(null);

  const fetchPayouts = useCallback(async (status = activeTab, p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get("/payouts/admin", {
        params: { status: status || undefined, page: p, limit: 20 },
      });
      setPayouts(data.data);
      setSummary(data.summary ?? []);
      setPagination(data.pagination);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchPayouts(activeTab, 1); }, [activeTab]);

  const handleDone = (msg) => { showToast(msg); fetchPayouts(activeTab, page); };

  const handleUnhold = async (payout) => {
    try {
      await api.patch(`/payouts/${payout._id}/unhold`);
      showToast("✅ Unhold payout successful");
      fetchPayouts(activeTab, page);
    } catch (e) { showToast(e.response?.data?.message || "Unhold failed"); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  // Summary stat helpers
  const getStat = (status) => summary.find(s => s._id === status) ?? {};
  const pendingStat    = getStat("pending");
  const completedStat  = getStat("completed");
  const heldStat       = getStat("held");

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Release or hold payouts for Company"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Pending Payouts"
          value={pendingStat.count ?? 0}
          icon="⏳" color="amber"
          onClick={() => setActiveTab("pending")}
        />
        <StatCard
          label="Pending Amount"
          value={fmtVND(pendingStat.totalNet ?? 0)}
          icon="💸" color="blue"
        />
        <StatCard
          label="Released Total"
          value={fmtVND(completedStat.totalNet ?? 0)}
          icon="✅" color="green"
        />
        <StatCard
          label="Currently Held"
          value={heldStat.count ?? 0}
          icon="🔒" color="red"
          onClick={() => setActiveTab("held")}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab} />

      {/* Table */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">No payouts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
                  {["Company", "Location", "Net Amount", "Rate", "Status", "Created", "Released", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <PayoutRow
                    key={p._id}
                    payout={p}
                    onRelease={setReleasing}
                    onHold={setHolding}
                    onUnhold={handleUnhold}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={20}
          onChange={(p) => fetchPayouts(activeTab, p)}
        />
      </div>

      <ReleaseModal
        payout={releasing}
        open={!!releasing}
        onClose={() => setReleasing(null)}
        onDone={handleDone}
      />
      <HoldModal
        payout={holding}
        open={!!holding}
        onClose={() => setHolding(null)}
        onDone={handleDone}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]
                        bg-gray-900 dark:bg-slate-700 text-white text-sm
                        px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}