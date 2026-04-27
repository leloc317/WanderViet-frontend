import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { PageHeader, StatCard, Pagination } from "../../components/ui/Widgets";
import { Badge } from "../../components/ui";

// ── Constants ─────────────────────────────────────────────────────────────────
const fmtVND  = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

const STATUS_CFG = {
  draft:          { label: "Draft",          color: "slate"  },
  pending_review: { label: "Pending Review", color: "yellow" },
  active:         { label: "Active",         color: "green"  },
  inactive:       { label: "Inactive",       color: "slate"  },
  rejected:       { label: "Rejected",       color: "red"    },
};

const CAT_LABELS = {
  food_tour: "🍜 Food Tour", sightseeing: "🏛️ Sightseeing",
  adventure: "🧗 Adventure",  cultural: "🎭 Cultural",
  relaxation: "🧘 Relaxation", shopping: "🛍️ Shopping", mixed: "🗺️ Mixed",
};

const STATUS_TABS = [
  { key: "",               label: "All"     },
  { key: "active",         label: "Active"  },
  { key: "draft",          label: "Draft"   },
  { key: "pending_review", label: "Pending" },
  { key: "rejected",       label: "Rejected"},
];

// ── TourCard ──────────────────────────────────────────────────────────────────
function TourCard({ tour, onEdit, onSubmit, onToggle, onDelete }) {
  const sc  = STATUS_CFG[tour.status] ?? { label: tour.status, color: "slate" };
  const img = tour.coverImage?.url;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Cover */}
      <div className="h-40 bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
        {img
          ? <img src={img} alt={tour.title} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🗺️</div>
        }
        <div className="absolute top-2 left-2">
          <Badge label={sc.label} color={sc.color} size="sm" dot/>
        </div>
        {tour.status === "active" && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {tour.upcomingDepartures ?? 0} lịch
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">{tour.title}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
          {CAT_LABELS[tour.category] ?? tour.category}
          {" · "}
          {tour.duration?.days}N{tour.duration?.nights}Đ
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {fmtVND(tour.pricePerPerson)}<span className="text-xs font-normal text-gray-400">/người</span>
            </p>
          </div>
          {tour.nearestDeparture && (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Gần nhất: {fmtDate(tour.nearestDeparture)}
            </p>
          )}
        </div>

        {/* Rejection reason */}
        {tour.status === "rejected" && tour.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/20 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-red-600 dark:text-red-400">↳ {tour.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {["draft","rejected"].includes(tour.status) && (
            <button onClick={() => onEdit(tour)}
              className="flex-1 py-1.5 text-xs border border-gray-200 dark:border-slate-700
                         rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-50
                         dark:hover:bg-slate-800 transition-colors">
              Edit
            </button>
          )}
          {["draft","rejected"].includes(tour.status) && (
            <button onClick={() => onSubmit(tour)}
              className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white
                         rounded-xl font-medium transition-colors">
              Submit
            </button>
          )}
          {["active","inactive"].includes(tour.status) && (
            <>
              <button onClick={() => onEdit(tour)}
                className="flex-1 py-1.5 text-xs border border-gray-200 dark:border-slate-700
                           rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-50
                           dark:hover:bg-slate-800 transition-colors">
                Edit
              </button>
              <button onClick={() => onToggle(tour)}
                className={`flex-1 py-1.5 text-xs rounded-xl font-medium transition-colors
                  ${tour.status === "active"
                    ? "border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}>
                {tour.status === "active" ? "Tắt" : "Bật"}
              </button>
            </>
          )}
          {tour.status === "active" && (
            <button onClick={() => onEdit(tour, "departures")}
              className="w-full py-1.5 text-xs bg-gray-900 dark:bg-slate-700 hover:bg-gray-800
                         dark:hover:bg-slate-600 text-white rounded-xl font-medium transition-colors">
              📅 Quản lý lịch khởi hành
            </button>
          )}
          {["draft","rejected"].includes(tour.status) && (
            <button onClick={() => onDelete(tour)}
              className="py-1.5 px-3 text-xs border border-red-200 dark:border-red-500/30
                         rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50
                         dark:hover:bg-red-400/10 transition-colors">
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TourFormModal ─────────────────────────────────────────────────────────────
function TourFormModal({ tour, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "mixed",
    pricePerPerson: "", childPrice: "",
    duration: { days: 1, nights: 0 },
    includes: [""], excludes: [""],
    meetingPoint: { address: "", note: "" },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!open) return;
    if (tour) {
      setForm({
        title:         tour.title         || "",
        description:   tour.description   || "",
        category:      tour.category      || "mixed",
        pricePerPerson: String(tour.pricePerPerson ?? ""),
        childPrice:    String(tour.childPrice    ?? ""),
        duration:      tour.duration      || { days: 1, nights: 0 },
        includes:      tour.includes?.length ? tour.includes : [""],
        excludes:      tour.excludes?.length ? tour.excludes : [""],
        meetingPoint:  tour.meetingPoint  || { address: "", note: "" },
      });
    } else {
      setForm({ title: "", description: "", category: "mixed", pricePerPerson: "", childPrice: "",
        duration: { days: 1, nights: 0 }, includes: [""], excludes: [""],
        meetingPoint: { address: "", note: "" } });
    }
    setError("");
  }, [open, tour]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.title || !form.pricePerPerson) { setError("Cần nhập tiêu đề và giá"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        pricePerPerson: Number(form.pricePerPerson),
        childPrice:     Number(form.childPrice || 0),
        includes:       form.includes.filter(Boolean),
        excludes:       form.excludes.filter(Boolean),
      };
      if (tour?._id) await api.put(`/tour-products/${tour._id}`, payload);
      else           await api.post("/tour-products", payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Lỗi khi lưu");
    } finally { setSaving(false); }
  };

  const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5";

  const ListEditor = ({ label, items, setItems }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => { const n=[...items]; n[i]=e.target.value; setItems(n); }}
              placeholder={`Mục ${i+1}`} className={inputCls}/>
            <button type="button" onClick={() => setItems(items.filter((_,j)=>j!==i))}
              className="w-9 text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, ""])}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Thêm</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {tour ? "Sửa Tour" : "Tạo Tour Mới"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Tiêu đề *</label>
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
              placeholder="VD: Đà Lạt 3 ngày 2 đêm" className={inputCls}/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Danh mục</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className={inputCls}>
                {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Số ngày</label>
                <input type="number" min={1} value={form.duration.days}
                  onChange={e=>setForm({...form,duration:{...form.duration,days:Number(e.target.value),nights:Math.max(0,Number(e.target.value)-1)}})}
                  className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Số đêm</label>
                <input type="number" min={0} value={form.duration.nights}
                  onChange={e=>setForm({...form,duration:{...form.duration,nights:Number(e.target.value)}})}
                  className={inputCls}/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Giá / người (VND) *</label>
              <input type="number" min={0} value={form.pricePerPerson}
                onChange={e=>setForm({...form,pricePerPerson:e.target.value})}
                placeholder="500000" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Giá trẻ em (VND)</label>
              <input type="number" min={0} value={form.childPrice}
                onChange={e=>setForm({...form,childPrice:e.target.value})}
                placeholder="Để trống = bằng người lớn" className={inputCls}/>
            </div>
          </div>

          <div>
            <label className={labelCls}>Mô tả</label>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
              rows={3} placeholder="Mô tả hành trình..." className={`${inputCls} resize-none`}/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ListEditor label="Đã bao gồm" items={form.includes}
              setItems={v=>setForm({...form,includes:v})}/>
            <ListEditor label="Không bao gồm" items={form.excludes}
              setItems={v=>setForm({...form,excludes:v})}/>
          </div>

          <div>
            <label className={labelCls}>Điểm tập trung</label>
            <input value={form.meetingPoint.address}
              onChange={e=>setForm({...form,meetingPoint:{...form.meetingPoint,address:e.target.value}})}
              placeholder="Địa chỉ điểm tập trung" className={inputCls}/>
            <input value={form.meetingPoint.note} className={`${inputCls} mt-2`}
              onChange={e=>setForm({...form,meetingPoint:{...form.meetingPoint,note:e.target.value}})}
              placeholder="Ghi chú (VD: Tập trung trước 30 phút)"/>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-2 justify-end shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Huỷ
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors">
            {saving ? "Đang lưu…" : tour ? "Lưu thay đổi" : "Tạo tour"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DepartureModal ────────────────────────────────────────────────────────────
function DepartureModal({ tour, open, onClose }) {
  const [departures, setDepartures] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [adding,     setAdding]     = useState(false);
  const [form, setForm] = useState({ departureDate: "", maxSlots: 10, priceOverride: "", note: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchDeps = useCallback(async () => {
    if (!tour) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/tour-products/${tour._id}/departures`, { params: { upcoming: true } });
      setDepartures(data.data.departures);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tour]);

  useEffect(() => { if (open) fetchDeps(); }, [open, fetchDeps]);
  useEffect(() => { if (!open) { setAdding(false); setError(""); } }, [open]);

  if (!open || !tour) return null;

  const handleAdd = async () => {
    if (!form.departureDate || !form.maxSlots) { setError("Cần nhập ngày và số chỗ"); return; }
    setSaving(true); setError("");
    try {
      await api.post(`/tour-products/${tour._id}/departures`, {
        departureDate: form.departureDate,
        maxSlots:      Number(form.maxSlots),
        priceOverride: form.priceOverride ? Number(form.priceOverride) : null,
        note:          form.note,
      });
      setForm({ departureDate: "", maxSlots: 10, priceOverride: "", note: "" });
      setAdding(false);
      fetchDeps();
    } catch (e) {
      setError(e.response?.data?.message || "Lỗi");
    } finally { setSaving(false); }
  };

  const handleCancel = async (dep) => {
    if (!confirm(`Huỷ lịch ${new Date(dep.departureDate).toLocaleDateString("vi-VN")}?`)) return;
    try {
      await api.delete(`/tour-products/${tour._id}/departures/${dep._id}`);
      fetchDeps();
    } catch (e) { alert(e.response?.data?.message || "Lỗi"); }
  };

  const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Lịch Khởi Hành</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500">{tour.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Add form */}
          {adding ? (
            <div className="bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/20 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Thêm lịch mới</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-slate-400 block mb-1">Ngày khởi hành *</label>
                  <input type="date" min={today} value={form.departureDate}
                    onChange={e=>setForm({...form,departureDate:e.target.value})} className={inputCls}/>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-slate-400 block mb-1">Số chỗ tối đa *</label>
                  <input type="number" min={1} value={form.maxSlots}
                    onChange={e=>setForm({...form,maxSlots:e.target.value})} className={inputCls}/>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-slate-400 block mb-1">
                  Giá override (để trống = {fmtVND(tour.pricePerPerson)})
                </label>
                <input type="number" min={0} value={form.priceOverride}
                  onChange={e=>setForm({...form,priceOverride:e.target.value})}
                  placeholder={String(tour.pricePerPerson)} className={inputCls}/>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-slate-400 block mb-1">Ghi chú</label>
                <input value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
                  placeholder="VD: Lịch đặc biệt dịp 30/4" className={inputCls}/>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setAdding(false)}
                  className="flex-1 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                  Huỷ
                </button>
                <button onClick={handleAdd} disabled={saving}
                  className="flex-1 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">
                  {saving ? "Đang lưu…" : "Thêm lịch"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700
                         text-sm text-gray-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-600
                         dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all">
              + Thêm lịch khởi hành
            </button>
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i=><div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse"/>)}
            </div>
          ) : departures.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-slate-500">
              <p className="text-2xl mb-1">📅</p>
              <p className="text-sm">Chưa có lịch khởi hành nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {departures.map(dep => {
                const available = dep.maxSlots - dep.bookedSlots - dep.heldSlots;
                const pct = Math.round((dep.bookedSlots / dep.maxSlots) * 100);
                return (
                  <div key={dep._id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {new Date(dep.departureDate).toLocaleDateString("vi-VN", { weekday:"short", day:"2-digit", month:"2-digit", year:"numeric" })}
                          {" → "}
                          {new Date(dep.returnDate).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit" })}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            👥 {dep.bookedSlots}/{dep.maxSlots} confirmed
                            {dep.heldSlots > 0 && ` · ${dep.heldSlots} holding`}
                          </span>
                          {dep.priceOverride && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              💰 {fmtVND(dep.priceOverride)}
                            </span>
                          )}
                        </div>
                        {dep.note && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 italic">{dep.note}</p>}
                        {/* Slot progress bar */}
                        <div className="h-1 bg-gray-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                          ${available === 0
                            ? "bg-red-100 dark:bg-red-400/10 text-red-600 dark:text-red-400"
                            : "bg-emerald-100 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                          }`}>
                          {available === 0 ? "Hết chỗ" : `${available} chỗ`}
                        </span>
                        {dep.bookedSlots === 0 && dep.heldSlots === 0 && (
                          <button onClick={() => handleCancel(dep)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors px-1">×</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompanyTourProductsPage() {
  const navigate = useNavigate();
  const [tours,      setTours]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("");
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [formModal,  setFormModal]  = useState({ open: false, tour: null });
  const [depModal,   setDepModal]   = useState({ open: false, tour: null });
  const [toast,      setToast]      = useState("");

  const fetchTours = useCallback(async (status = activeTab, p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get("/tour-products/company/mine", {
        params: { status: status || undefined, page: p, limit: 9 },
      });
      setTours(data.data.tours);
      setPagination(data.data.pagination);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchTours(activeTab, 1); }, [activeTab]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const handleSubmit = async (tour) => {
    if (!confirm(`Submit "${tour.title}" để Admin duyệt?`)) return;
    try {
      await api.patch(`/tour-products/${tour._id}/submit`);
      fetchTours(activeTab, page);
      showToast("✅ Đã submit, chờ Admin duyệt");
    } catch (e) { showToast(e.response?.data?.message || "Lỗi"); }
  };

  const handleToggle = async (tour) => {
    try {
      await api.patch(`/tour-products/${tour._id}/toggle-active`);
      fetchTours(activeTab, page);
      showToast(tour.status === "active" ? "Tour đã tắt" : "Tour đã bật");
    } catch (e) { showToast(e.response?.data?.message || "Lỗi"); }
  };

  const handleDelete = async (tour) => {
    if (!confirm(`Xoá "${tour.title}"?`)) return;
    try {
      await api.delete(`/tour-products/${tour._id}`);
      fetchTours(activeTab, page);
      showToast("Đã xóa tour");
    } catch (e) { showToast(e.response?.data?.message || "Lỗi"); }
  };

  const handleEdit = (tour, tab) => {
    if (tab === "departures") {
      setDepModal({ open: true, tour });
    } else {
      setFormModal({ open: true, tour });
    }
  };

  const activeTours   = tours.filter(t => t.status === "active").length;
  const pendingTours  = tours.filter(t => t.status === "pending_review").length;

  return (
    <div>
      <PageHeader
        title="Tour Products"
        subtitle="Quản lý các tour du lịch của công ty bạn"
        action={
          <button onClick={() => setFormModal({ open: true, tour: null })}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            + Tạo Tour
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Đang active"  value={activeTours}  icon="✅" color="green" />
        <StatCard label="Chờ duyệt"    value={pendingTours} icon="⏳" color="amber" />
        <StatCard label="Tổng"         value={pagination.total} icon="🗺️" color="blue" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border shrink-0 transition-colors
              ${activeTab === t.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i=><div key={i} className="h-72 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-2">🗺️</p>
          <p className="text-sm">Chưa có tour nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map(t => (
            <TourCard key={t._id} tour={t}
              onEdit={handleEdit}
              onSubmit={handleSubmit}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} totalPages={pagination.totalPages}
          total={pagination.total} limit={9}
          onChange={p => fetchTours(activeTab, p)}/>
      </div>

      <TourFormModal
        open={formModal.open}
        tour={formModal.tour}
        onClose={() => setFormModal({ open: false, tour: null })}
        onSaved={() => { fetchTours(activeTab, page); showToast("Đã lưu tour ✓"); }}
      />

      <DepartureModal
        open={depModal.open}
        tour={depModal.tour}
        onClose={() => setDepModal({ open: false, tour: null })}
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