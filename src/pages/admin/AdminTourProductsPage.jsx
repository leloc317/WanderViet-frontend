import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import { PageHeader, StatCard, Tabs } from "../../components/ui/Widgets";
import { Badge } from "../../components/ui";

// ── Constants ─────────────────────────────────────────────────────────────────
const fmtVND  = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const STATUS_CFG = {
  pending_review: { label: "Pending",  color: "yellow" },
  active:         { label: "Active",   color: "green"  },
  inactive:       { label: "Inactive", color: "slate"  },
  rejected:       { label: "Rejected", color: "red"    },
  draft:          { label: "Draft",    color: "slate"  },
};

const CAT_ICON = {
  food_tour: "🍜", sightseeing: "🏛️", adventure: "🧗",
  cultural: "🎭", relaxation: "🧘", shopping: "🛍️", mixed: "🗺️",
};

const STATUS_TABS = [
  { key: "pending_review", label: "Pending Review" },
  { key: "active",         label: "Active"         },
  { key: "rejected",       label: "Rejected"       },
  { key: "",               label: "All"             },
];

// ── ApprovalModal ─────────────────────────────────────────────────────────────
function ApprovalModal({ tour, open, onClose, onDone }) {
  const [action, setAction]  = useState("approve");
  const [reason, setReason]  = useState("");
  const [saving, setSaving]  = useState(false);
  const [error,  setError]   = useState("");

  useEffect(() => { if (open) { setAction("approve"); setReason(""); setError(""); } }, [open]);

  if (!open || !tour) return null;

  const handleSubmit = async () => {
    if (action === "reject" && !reason.trim()) { setError("Cần nhập lý do từ chối"); return; }
    setSaving(true); setError("");
    try {
      await api.patch(`/tour-products/${tour._id}/approval`, { action, reason });
      onDone(action === "approve" ? "✅ Đã duyệt tour" : "❌ Đã từ chối tour");
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Lỗi");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Xét duyệt Tour</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tour summary */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{tour.title}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {tour.company?.name} · {fmtVND(tour.pricePerPerson)}/người · {tour.duration?.days}N{tour.duration?.nights}Đ
            </p>
          </div>

          {/* Action toggle */}
          <div className="flex gap-2">
            {[
              { val: "approve", label: "✅ Duyệt", cls: action === "approve" ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300" },
              { val: "reject",  label: "❌ Từ chối", cls: action === "reject" ? "bg-red-600 border-red-600 text-white" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300" },
            ].map(b => (
              <button key={b.val} onClick={() => setAction(b.val)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${b.cls}`}>
                {b.label}
              </button>
            ))}
          </div>

          {/* Rejection reason */}
          {action === "reject" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
                Lý do từ chối *
              </label>
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                rows={3} placeholder="Giải thích lý do để Company biết cách chỉnh sửa..."
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"/>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Huỷ
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors text-white
              ${action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
            {saving ? "Đang xử lý…" : action === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TourRow ───────────────────────────────────────────────────────────────────
function TourRow({ tour, onReview, onExpand, expanded }) {
  const sc  = STATUS_CFG[tour.status] ?? { label: tour.status, color: "slate" };
  const img = tour.coverImage?.url;
  const stops = tour.itinerary?.reduce((t, d) => t + d.stops.length, 0) ?? 0;

  return (
    <>
      <tr className="border-b border-gray-100 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
              {img
                ? <img src={img} alt="" className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center text-xl">
                    {CAT_ICON[tour.category] ?? "🗺️"}
                  </div>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                {tour.title}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {tour.duration?.days}N{tour.duration?.nights}Đ · {stops} địa điểm
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{tour.company?.name}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">{tour.company?.email}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtVND(tour.pricePerPerson)}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">/người</p>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 dark:text-slate-500">
          {fmtDate(tour.createdAt)}
        </td>
        <td className="px-4 py-3">
          <Badge label={sc.label} color={sc.color} size="sm" dot/>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => onExpand(tour._id)}
              className="text-xs text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {expanded ? "Thu gọn ▲" : "Chi tiết ▼"}
            </button>
            {tour.status === "pending_review" && (
              <button onClick={() => onReview(tour)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors font-medium">
                Xét duyệt
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded itinerary */}
      {expanded && (
        <tr className="border-b border-gray-100 dark:border-slate-800/50">
          <td colSpan={6} className="px-4 pb-4 pt-2">
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4">
              {/* Includes/Excludes */}
              {(tour.includes?.length > 0 || tour.excludes?.length > 0) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {tour.includes?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                        ✓ Bao gồm
                      </p>
                      <ul className="space-y-0.5">
                        {tour.includes.map((item, i) => (
                          <li key={i} className="text-xs text-gray-600 dark:text-slate-300">· {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excludes?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                        ✗ Không bao gồm
                      </p>
                      <ul className="space-y-0.5">
                        {tour.excludes.map((item, i) => (
                          <li key={i} className="text-xs text-gray-600 dark:text-slate-300">· {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Itinerary days */}
              {tour.itinerary?.map(day => (
                <div key={day.day} className="mb-3">
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Ngày {day.day}{day.title ? ` — ${day.title}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {day.stops?.map((stop, i) => {
                      const loc = stop.location;
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 text-[11px] bg-white dark:bg-slate-900
                                                  border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300
                                                  px-2.5 py-1 rounded-full">
                          <span>{i + 1}</span>
                          <span className="font-medium">{loc?.name ?? "Unknown"}</span>
                          {loc?.address?.city && (
                            <span className="text-gray-400">({loc.address.city})</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Rejection reason (if rejected) */}
              {tour.status === "rejected" && tour.rejectionReason && (
                <div className="mt-3 bg-red-50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/20 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    <span className="font-semibold">Lý do từ chối:</span> {tour.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminTourProductsPage() {
  const [tours,      setTours]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("pending_review");
  const [expanded,   setExpanded]   = useState(null);
  const [reviewing,  setReviewing]  = useState(null);
  const [toast,      setToast]      = useState("");
  const [counts,     setCounts]     = useState({ pending: 0, active: 0, rejected: 0 });

  const fetchTours = useCallback(async (status = activeTab) => {
    setLoading(true);
    try {
      if (status === "pending_review") {
        const { data } = await api.get("/tour-products/admin/pending");
        setTours(data.data.tours);
      } else {
        const { data } = await api.get("/tour-products", {
          params: { status: status || undefined, limit: 50 },
        });
        setTours(data.data.tours);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  const fetchCounts = async () => {
    try {
      const [p, a, r] = await Promise.all([
        api.get("/tour-products/admin/pending"),
        api.get("/tour-products", { params: { status: "active", limit: 1 } }),
        api.get("/tour-products", { params: { status: "rejected", limit: 1 } }),
      ]);
      setCounts({
        pending:  p.data.data.tours.length,
        active:   a.data.data.pagination.total,
        rejected: r.data.data.pagination.total,
      });
    } catch {}
  };

  useEffect(() => { fetchTours(activeTab); fetchCounts(); }, [activeTab]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const handleDone = (msg) => {
    showToast(msg);
    fetchTours(activeTab);
    fetchCounts();
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  return (
    <div>
      <PageHeader
        title="Tour Products"
        subtitle="Xét duyệt và quản lý tour sản phẩm của các Company"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Chờ duyệt"   value={counts.pending}  icon="⏳" color="amber"
          onClick={() => setActiveTab("pending_review")}/>
        <StatCard label="Đang active" value={counts.active}   icon="✅" color="green"
          onClick={() => setActiveTab("active")}/>
        <StatCard label="Đã từ chối"  value={counts.rejected} icon="❌" color="red"
          onClick={() => setActiveTab("rejected")}/>
      </div>

      {/* Alert for pending */}
      {counts.pending > 0 && activeTab !== "pending_review" && (
        <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20
                        rounded-2xl px-5 py-3 mb-5 flex items-center gap-3">
          <span className="text-amber-500">⚠️</span>
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            {counts.pending} tour đang chờ xét duyệt
          </p>
          <button onClick={() => setActiveTab("pending_review")}
            className="ml-auto text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium">
            Xem ngay →
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab}/>

      {/* Table */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"/>)}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <p className="text-3xl mb-2">🗺️</p>
            <p className="text-sm">Không có tour nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
                  {["Tour", "Company", "Giá", "Ngày tạo", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tours.map(t => (
                  <TourRow key={t._id} tour={t}
                    onReview={setReviewing}
                    onExpand={toggleExpand}
                    expanded={expanded === t._id}/>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ApprovalModal
        tour={reviewing}
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        onDone={handleDone}
      />

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