import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";

const fmtVND  = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M₫` : `${Math.round(n/1000)}k₫`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const isLive  = (d1, d2) => d1 && d2 && new Date(d1) <= new Date() && new Date(d2) >= new Date();
const isExpired = (d) => d && new Date(d) < new Date();
const BOOKING_TYPES = ["hotel","restaurant","cafe","entertainment","tour_product"];

// ── My Discount Card ──────────────────────────────────────────────────────────
function MyDiscountCard({ d, onEdit, onToggle }) {
  const live    = isLive(d.validFrom, d.validUntil);
  const expired = isExpired(d.validUntil);

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-5
                     ${d.isActive && live ? "border-gray-200 dark:border-slate-800" : "border-gray-100 dark:border-slate-800 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <code className="font-black text-gray-900 dark:text-white tracking-widest text-base">
          {d.code}
        </code>
        <div className="flex gap-1 shrink-0">
          {d.isActive && live && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Live</span>
          )}
          {expired && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">Hết hạn</span>
          )}
          {!d.isActive && !expired && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-gray-100 dark:bg-slate-800 text-gray-400">Tắt</span>
          )}
        </div>
      </div>

      <p className="text-xl font-black text-blue-600 dark:text-blue-400 mb-1">
        {d.type === "percentage" ? `${d.value}%` : fmtVND(d.value)} off
        {d.maxDiscount && <span className="text-xs font-normal text-gray-400 ml-1">tối đa {fmtVND(d.maxDiscount)}</span>}
      </p>
      {d.description && <p className="text-xs text-gray-400 mb-3">{d.description}</p>}

      <div className="text-xs text-gray-400 dark:text-slate-500 space-y-1 mb-4">
        <p>📅 {fmtDate(d.validFrom)} – {fmtDate(d.validUntil)}</p>
        <p>🔢 Đã dùng: {d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : ""} lượt</p>
        {d.minOrderValue > 0 && <p>💰 Đơn tối thiểu: {fmtVND(d.minOrderValue)}</p>}
      </div>

      <div className="flex gap-2">
        <button onClick={() => onEdit(d)}
          className="flex-1 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl
                     text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
          Chỉnh sửa
        </button>
        <button onClick={() => onToggle(d)}
          className={`flex-1 py-2 text-xs rounded-xl transition-colors
            ${d.isActive
              ? "border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50"
              : "border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"}`}>
          {d.isActive ? "Tắt" : "Bật"}
        </button>
      </div>
    </div>
  );
}

// ── Platform Campaign Card ────────────────────────────────────────────────────
function CampaignCard({ d, isOptedIn, onOptIn }) {
  const live = isLive(d.validFrom, d.validUntil);
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <code className="font-black text-gray-900 dark:text-white tracking-widest">{d.code}</code>
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full
                           bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">Platform</span>
        </div>
        {live && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                  bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Live</span>}
      </div>
      <p className="text-xl font-black text-blue-600 dark:text-blue-400 mb-1">
        {d.type === "percentage" ? `${d.value}%` : fmtVND(d.value)} off
      </p>
      {d.description && <p className="text-xs text-gray-400 mb-3">{d.description}</p>}
      <p className="text-xs text-gray-400 mb-4">📅 {fmtDate(d.validFrom)} – {fmtDate(d.validUntil)}</p>

      {isOptedIn ? (
        <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 dark:bg-emerald-500/10
                        border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
          <span className="text-emerald-600 text-sm">✓</span>
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Đã tham gia — discount này sẽ áp dụng cho location của bạn
          </span>
        </div>
      ) : (
        <button onClick={() => onOptIn(d._id)}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                     text-xs font-bold transition-colors">
          Tham gia chiến dịch
        </button>
      )}
    </div>
  );
}

// ── Create/Edit Form ──────────────────────────────────────────────────────────
function DiscountForm({ initial, locations, onSave, onClose }) {
  const isEdit = !!initial?._id;
  const today  = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    code:          initial?.code          ?? "",
    type:          initial?.type          ?? "percentage",
    value:         initial?.value         ?? "",
    maxDiscount:   initial?.maxDiscount   ?? "",
    scope:         initial?.scope         ?? "company",
    selectedLocs:  initial?.locations?.map(l => l._id ?? l) ?? [],
    description:   initial?.description   ?? "",
    minOrderValue: initial?.minOrderValue ?? "",
    usageLimit:    initial?.usageLimit    ?? "",
    perUserLimit:  initial?.perUserLimit  ?? 1,
    validFrom:     initial?.validFrom ? initial.validFrom.split("T")[0] : today,
    validUntil:    initial?.validUntil ? initial.validUntil.split("T")[0] : "",
    appliesTo:     initial?.appliesTo     ?? [...BOOKING_TYPES],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [locSearch,  setLocSearch]  = useState("");
  const [locResults, setLocResults] = useState(locations ?? []);
  const locTimer = useRef(null);

  // Search locations when typing (falls back to company's own locations)
  useEffect(() => {
    if (!locSearch.trim()) { setLocResults(locations ?? []); return; }
    clearTimeout(locTimer.current);
    locTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/search/hotel", { params: { q: locSearch, limit: 10 } });
        const hits = data.data?.results ?? data.data?.locations ?? [];
        // Merge with company locations, company locations first
        const companyIds = new Set((locations ?? []).map(l => l._id));
        const companyHits = (locations ?? []).filter(l =>
          l.name?.toLowerCase().includes(locSearch.toLowerCase())
        );
        const otherHits = hits.filter(l => !companyIds.has(l._id));
        setLocResults([...companyHits, ...otherHits].slice(0, 15));
      } catch { setLocResults(locations ?? []); }
    }, 300);
    return () => clearTimeout(locTimer.current);
  }, [locSearch, locations]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleApply = (type) => set("appliesTo",
    form.appliesTo.includes(type) ? form.appliesTo.filter(t => t !== type) : [...form.appliesTo, type]
  );
  const toggleLoc = (id) => set("selectedLocs",
    form.selectedLocs.includes(id) ? form.selectedLocs.filter(l => l !== id) : [...form.selectedLocs, id]
  );

  const handleSubmit = async () => {
    if (!form.code?.trim()) { setError("Discount code is required"); return; }
    if (!form.value || Number(form.value) <= 0) { setError("Value must be greater than 0"); return; }
    if (form.type === "percentage" && Number(form.value) > 100) { setError("Percentage cannot exceed 100%"); return; }
    if (!form.validFrom || !form.validUntil) { setError("Start and end dates are required"); return; }
    if (form.validFrom >= form.validUntil) { setError("End date must be after start date"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        locations:     form.scope === "location" ? form.selectedLocs : [],
        value:         Number(form.value),
        maxDiscount:   form.maxDiscount   ? Number(form.maxDiscount)   : null,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        usageLimit:    form.usageLimit    ? Number(form.usageLimit)    : null,
        perUserLimit:  Number(form.perUserLimit),
      };
      if (isEdit) { await api.put(`/discounts/${initial._id}`, payload); }
      else        { await api.post("/discounts", payload); }
      onSave();
    } catch (e) { setError(e.response?.data?.message ?? "Lỗi lưu"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border dark:border-slate-700
                      shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200
                        dark:border-slate-800 px-5 py-4 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {isEdit ? "Sửa Discount" : "Tạo Discount mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mã *</label>
              <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
                disabled={isEdit} placeholder="SUMMER25"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm font-mono
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Loại *</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="percentage">Phần trăm (%)</option>
                <option value="fixed">Số tiền (₫)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Giá trị * {form.type === "percentage" ? "(%)" : "(₫)"}
              </label>
              <input type="number" value={form.value} onChange={e => set("value", e.target.value)}
                placeholder={form.type === "percentage" ? "10" : "50000"}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            {form.type === "percentage" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tối đa (₫)</label>
                <input type="number" value={form.maxDiscount} onChange={e => set("maxDiscount", e.target.value)}
                  placeholder="Không giới hạn"
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                             text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
              </div>
            )}
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phạm vi áp dụng</label>
            <div className="flex gap-2">
              {["company","location"].map(s => (
                <button key={s} type="button" onClick={() => set("scope", s)}
                  className={`flex-1 py-2 text-xs rounded-xl border font-medium transition-colors
                    ${form.scope === s ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 dark:border-slate-700 text-gray-500 hover:border-blue-300"}`}>
                  {s === "company" ? "Toàn company" : "Location cụ thể"}
                </button>
              ))}
            </div>
          </div>

          {/* Location picker — with search */}
          {form.scope === "location" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">
                Tìm & chọn locations
              </label>

              {/* Search input */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800
                              border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 mb-2">
                <span className="text-gray-400 text-sm">🔍</span>
                <input
                  value={locSearch}
                  onChange={e => setLocSearch(e.target.value)}
                  placeholder="Tìm tên location..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white
                             placeholder:text-gray-400 outline-none"
                />
              </div>

              {/* Selected badges */}
              {form.selectedLocs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.selectedLocs.map(id => {
                    const loc = locResults.find(l => l._id === id)
                             ?? (locations ?? []).find(l => l._id === id);
                    return loc ? (
                      <span key={id} className="flex items-center gap-1 text-xs bg-blue-100
                                                dark:bg-blue-500/20 text-blue-700 dark:text-blue-400
                                                px-2 py-1 rounded-lg">
                        {loc.name}
                        <button onClick={() => toggleLoc(id)} className="hover:text-red-500 ml-0.5">×</button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Results list */}
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-100
                              dark:border-slate-800 rounded-xl">
                {locResults.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Không tìm thấy location</p>
                ) : (
                  locResults.map(loc => (
                    <label key={loc._id}
                      className="flex items-center gap-2 cursor-pointer px-3 py-2
                                 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <input type="checkbox" checked={form.selectedLocs.includes(loc._id)}
                        onChange={() => toggleLoc(loc._id)}
                        className="w-4 h-4 rounded accent-blue-600 shrink-0"/>
                      <span className="text-sm text-gray-800 dark:text-slate-200 truncate">{loc.name}</span>
                      {loc.address?.city && (
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{loc.address.city}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Từ ngày *</label>
              <input type="date" value={form.validFrom} onChange={e => set("validFrom", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Đến ngày *</label>
              <input type="date" value={form.validUntil} onChange={e => set("validUntil", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tổng lượt</label>
              <input type="number" value={form.usageLimit} onChange={e => set("usageLimit", e.target.value)}
                placeholder="∞"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Lượt/người</label>
              <input type="number" min="1" value={form.perUserLimit} onChange={e => set("perUserLimit", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Đơn tối thiểu</label>
              <input type="number" value={form.minOrderValue} onChange={e => set("minOrderValue", e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
          </div>

          {/* Applies to */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Áp dụng cho loại booking</label>
            <div className="flex flex-wrap gap-2">
              {BOOKING_TYPES.map(type => (
                <button key={type} type="button" onClick={() => toggleApply(type)}
                  className={`px-3 py-1.5 text-xs rounded-xl border transition-colors
                    ${form.appliesTo.includes(type) ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 dark:border-slate-700 text-gray-500 hover:border-blue-300"}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mô tả</label>
            <input value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Mô tả ngắn về chương trình..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-200
                        dark:border-slate-800 px-5 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600
                       dark:text-slate-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
            Huỷ
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                       text-sm font-semibold disabled:opacity-50">
            {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CompanyDiscountsPage() {
  const { user } = useAuth();
  const [myDiscounts,   setMyDiscounts]   = useState([]);
  const [campaigns,     setCampaigns]     = useState([]);
  const [myLocations,   setMyLocations]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState("mine"); // mine | campaigns
  const [formOpen,      setFormOpen]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [optingIn,      setOptingIn]      = useState(null);
  const [toast,         setToast]         = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, campRes, locRes] = await Promise.all([
        api.get("/discounts", { params: { limit: 100 } }),
        api.get("/discounts/public"),
        api.get("/company/locations").catch(() => ({ data: { data: { locations: [] } } })),
      ]);
      // My discounts = those created by this company (backend already filters by createdBy)
      const myAll = dRes.data.data?.discounts ?? [];
      setMyDiscounts(myAll);
      // Platform campaigns = from public endpoint (created by admin, scope=platform)
      setCampaigns(campRes.data.data?.discounts ?? []);
      setMyLocations(locRes.data.data?.locations ?? []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (d) => {
    try {
      await api.put(`/discounts/${d._id}`, { isActive: !d.isActive });
      load();
    } catch (e) { showToast(e.response?.data?.message ?? "Lỗi"); }
  };

  const handleOptIn = async (id) => {
    setOptingIn(id);
    try {
      await api.post(`/discounts/${id}/opt-in`);
      showToast("✅ Đã tham gia chiến dịch");
      load();
    } catch (e) { showToast(e.response?.data?.message ?? "Lỗi opt-in"); }
    finally { setOptingIn(null); }
  };

  const myOptedIn = (d) => d.optedInCompanies?.some(c => c === d.createdBy?._id);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Discount & Voucher</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Tạo mã giảm giá cho location của bạn hoặc tham gia chiến dịch platform
          </p>
        </div>
        {tab === "mine" && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl">
            + Tạo Discount
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {[
          { key:"mine",      label:`Discount của tôi (${myDiscounts.length})` },
          { key:"campaigns", label:`Platform Campaigns (${campaigns.length})`   },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium
              ${tab === t.key
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
        </div>
      ) : tab === "mine" ? (
        myDiscounts.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-slate-500">
            <p className="text-4xl mb-3">🎫</p>
            <p className="font-medium mb-1">Chưa có discount nào</p>
            <p className="text-sm">Tạo mã giảm giá để thu hút khách hàng</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myDiscounts.map(d => (
              <MyDiscountCard key={d._id} d={d}
                onEdit={d => { setEditing(d); setFormOpen(true); }}
                onToggle={handleToggle}/>
            ))}
          </div>
        )
      ) : (
        campaigns.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-slate-500">
            <p className="text-4xl mb-3">📢</p>
            <p className="text-sm">Hiện không có chiến dịch platform nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20
                            rounded-2xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              💡 Tham gia chiến dịch platform giúp discount tự động áp dụng cho booking tại location của bạn,
              tăng tỷ lệ chuyển đổi mà không cần user nhập mã.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campaigns.map(d => (
                <CampaignCard key={d._id} d={d}
                  isOptedIn={
                    !d.optInRequired ||
                    d.optedInCompanies?.some(c =>
                      (c._id ?? c)?.toString() === user?._id?.toString()
                    )
                  }
                  onOptIn={handleOptIn}/>
              ))}
            </div>
          </div>
        )
      )}

      {formOpen && (
        <DiscountForm initial={editing} locations={myLocations}
          onSave={() => { setFormOpen(false); load(); }}
          onClose={() => setFormOpen(false)}/>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        bg-gray-900 dark:bg-slate-700 text-white text-sm
                        px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}