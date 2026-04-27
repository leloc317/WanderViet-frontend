import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import { PageHeader, StatCard, SearchBar, Pagination } from "../../components/ui/Widgets";
import { Badge, Tabs } from "../../components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const fmtVND = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";

const TYPE_CFG = {
  deposit:       { label: "Deposit",       color: "blue",   icon: "💳" },
  extra_charges: { label: "Extra Charges", color: "orange", icon: "➕" },
  full:          { label: "Full Pay",      color: "teal",   icon: "💵" },
  refund:        { label: "Refund",        color: "purple", icon: "↩️" },
};

const STATUS_CFG = {
  pending:   { label: "Pending",   color: "yellow" },
  success:   { label: "Success",   color: "green"  },
  failed:    { label: "Failed",    color: "red"    },
  refunded:  { label: "Refunded",  color: "purple" },
  cancelled: { label: "Cancelled", color: "slate"  },
};

const STATUS_TABS = [
  { key: "",          label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "success",   label: "Success"   },
  { key: "failed",    label: "Failed"    },
  { key: "refunded",  label: "Refunded"  },
  { key: "cancelled", label: "Cancelled" },
];

const TYPE_TABS = [
  { key: "",              label: "All Types"     },
  { key: "deposit",       label: "Deposit"       },
  { key: "extra_charges", label: "Extra Charges" },
  { key: "full",          label: "Full Pay"      },
  { key: "refund",        label: "Refund"        },
];

// ── PaymentDetailModal ─────────────────────────────────────────────────────────
function PaymentDetailModal({ payment, onClose }) {
  if (!payment) return null;

  const typeCfg   = TYPE_CFG[payment.type]   ?? { label: payment.type,   color: "slate", icon: "💳" };
  const statusCfg = STATUS_CFG[payment.status] ?? { label: payment.status, color: "slate" };

  const Row = ({ label, value }) => (
    <div className="flex justify-between gap-4 py-2.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-xs text-gray-900 dark:text-white font-medium text-right">{value || "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeCfg.icon}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white">Payment Detail</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Amount highlight */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtVND(payment.amount)}</p>
            </div>
            <div className="text-right space-y-1">
              <Badge label={typeCfg.label}   color={typeCfg.color}   size="sm" />
              <br />
              <Badge label={statusCfg.label} color={statusCfg.color} size="sm" dot />
            </div>
          </div>

          {/* Details */}
          <div>
            <Row label="Payment ID"    value={payment._id} />
            <Row label="Payer"         value={payment.payer ? `${payment.payer.name} · ${payment.payer.email}` : "—"} />
            <Row label="Booking Order" value={payment.bookingOrder?._id} />
            <Row label="Method"        value={payment.method} />
            <Row label="Base Amount"   value={fmtVND(payment.baseAmount)} />
            {payment.depositRate > 0 && (
              <Row label="Deposit Rate" value={`${(payment.depositRate * 100).toFixed(0)}%`} />
            )}
            <Row label="Description"   value={payment.description} />
            <Row label="Txn Ref"       value={payment.vnpayTxnRef} />
            <Row label="Order Info"    value={payment.vnpayOrderInfo} />
            <Row label="Created At"    value={fmtDate(payment.createdAt)} />
            <Row label="Paid At"       value={fmtDate(payment.paidAt)} />
            <Row label="Expired At"    value={fmtDate(payment.expiredAt)} />
          </div>

          {/* VNPay raw response */}
          {payment.vnpayResponse && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">VNPay Response</p>
              <pre className="text-[11px] bg-gray-50 dark:bg-slate-800 rounded-xl p-3 overflow-x-auto text-gray-700 dark:text-slate-300">
                {JSON.stringify(payment.vnpayResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminPaymentsPage() {
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [statusTab,  setStatusTab]  = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selected,   setSelected]   = useState(null);

  // Quick stats from current batch
  const successTotal = payments.filter(p => p.status === "success").reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter(p => p.status === "pending").length;

  const fetchPayments = useCallback(async (status = statusTab, type = typeFilter, p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get("/payments/admin", {
        params: { status: status || undefined, type: type || undefined, page: p, limit: 20 },
      });
      setPayments(data.data);
      setPagination(data.pagination);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusTab, typeFilter]);

  useEffect(() => { fetchPayments(statusTab, typeFilter, 1); }, [statusTab, typeFilter]);

  const handleStatusTab = (s) => { setStatusTab(s); setTypeFilter(""); };

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Monitor all payment transactions"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Records"   value={pagination.total}         icon="📋" color="blue"  />
        <StatCard label="Success (page)"  value={fmtVND(successTotal)}     icon="✅" color="green" />
        <StatCard label="Pending (page)"  value={pendingCount}             icon="⏳" color="amber" />
      </div>

      {/* Status Tabs */}
      <Tabs tabs={STATUS_TABS} active={statusTab} onChange={handleStatusTab} />

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2 mt-3 mb-4">
        {TYPE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTypeFilter(t.key); fetchPayments(statusTab, t.key, 1); }}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-colors
              ${typeFilter === t.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-2">💳</p>
          <p className="text-sm">No payments found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
                {["Type", "Amount", "Payer", "Booking", "Method", "Txn Ref", "Paid At", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const tc = TYPE_CFG[p.type]     ?? { label: p.type,   color: "slate", icon: "💳" };
                const sc = STATUS_CFG[p.status] ?? { label: p.status, color: "slate" };
                return (
                  <tr key={p._id}
                    className="border-b border-gray-100 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span>{tc.icon}</span>
                        <Badge label={tc.label} color={tc.color} size="sm" />
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                      {fmtVND(p.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{p.payer?.name ?? "—"}</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500">{p.payer?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                        {p.bookingOrder?._id?.slice(-8).toUpperCase() ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400 capitalize">{p.method}</td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-mono text-gray-500 dark:text-slate-400">{p.vnpayTxnRef ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {fmtDate(p.paidAt || p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={sc.label} color={sc.color} size="sm" dot />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(p)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={20}
          onChange={(p) => fetchPayments(statusTab, typeFilter, p)}
        />
      </div>

      <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} />
    </div>
  );
}