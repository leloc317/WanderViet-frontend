import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../lib/axios";

const fmtVND  = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M₫` : `${Math.round(n/1000)}k₫`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const isExpired = (d) => d && new Date(d) < new Date();
const isLive    = (d1, d2) => d1 && d2 && new Date(d1) <= new Date() && new Date(d2) >= new Date();

const SCOPE_STYLE = {
  platform: { bg:"bg-blue-100 dark:bg-blue-500/20",   text:"text-blue-700 dark:text-blue-400",   label:"Platform" },
  company:  { bg:"bg-purple-100 dark:bg-purple-500/20", text:"text-purple-700 dark:text-purple-400", label:"Company"  },
  location: { bg:"bg-amber-100 dark:bg-amber-500/20",  text:"text-amber-700 dark:text-amber-400",  label:"Location" },
};

const BOOKING_TYPES = ["hotel","restaurant","cafe","entertainment","tour_product"];

// ── DiscountCard ──────────────────────────────────────────────────────────────
function DiscountCard({ d, onEdit, onToggle, onDelete }) {
  const scope   = SCOPE_STYLE[d.scope] ?? SCOPE_STYLE.platform;
  const live    = isLive(d.validFrom, d.validUntil);
  const expired = isExpired(d.validUntil);

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all
                     ${d.isActive && live ? "border-gray-200 dark:border-slate-800"
                       : "border-gray-100 dark:border-slate-800 opacity-60"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-base font-black text-gray-900 dark:text-white tracking-widest">
            {d.code}
          </code>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scope.bg} ${scope.text}`}>
            {scope.label}
          </span>
          {!d.isActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500">
              Inactive
            </span>
          )}
          {d.isActive && expired && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              Expired
            </span>
          )}
          {d.isActive && live && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              Live
            </span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(d)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50
                       dark:hover:bg-slate-800 transition-colors">
            Edit
          </button>
          <button onClick={() => onToggle(d)}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors
              ${d.isActive
                ? "border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                : "border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              }`}>
            {d.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mb-1">
        {d.type === "percentage" ? `${d.value}%` : fmtVND(d.value)} off
        {d.maxDiscount && <span className="text-sm font-normal text-gray-400 ml-1">(tối đa {fmtVND(d.maxDiscount)})</span>}
      </p>
      {d.description && <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{d.description}</p>}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
        <div className="text-gray-400 dark:text-slate-500">Hiệu lực</div>
        <div className="text-gray-700 dark:text-slate-300">{fmtDate(d.validFrom)} – {fmtDate(d.validUntil)}</div>

        <div className="text-gray-400 dark:text-slate-500">Áp dụng cho</div>
        <div className="text-gray-700 dark:text-slate-300 capitalize">
          {d.appliesTo?.length === BOOKING_TYPES.length ? "Tất cả" : d.appliesTo?.join(", ")}
        </div>

        {d.minOrderValue > 0 && <>
          <div className="text-gray-400 dark:text-slate-500">Đơn tối thiểu</div>
          <div className="text-gray-700 dark:text-slate-300">{fmtVND(d.minOrderValue)}</div>
        </>}

        <div className="text-gray-400 dark:text-slate-500">Đã dùng</div>
        <div className="text-gray-700 dark:text-slate-300">
          {d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : " / ∞"}
        </div>

        {d.scope === "platform" && <>
          <div className="text-gray-400 dark:text-slate-500">Opt-in</div>
          <div className="text-gray-700 dark:text-slate-300">
            {d.optInRequired
              ? `${d.optedInCompanies?.length ?? 0} công ty tham gia`
              : "Tự động áp dụng"}
          </div>
        </>}
      </div>

      {/* Progress bar for usage */}
      {d.usageLimit && (
        <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all"
               style={{ width: `${Math.min(100, (d.usageCount / d.usageLimit) * 100)}%` }}/>
        </div>
      )}
    </div>
  );
}

// ── DiscountForm (create/edit) ─────────────────────────────────────────────────
function DiscountForm({ initial, onSave, onClose }) {
  const isEdit = !!initial?._id;
  const today  = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    code:          initial?.code          ?? "",
    type:          initial?.type          ?? "percentage",
    value:         initial?.value         ?? "",
    maxDiscount:   initial?.maxDiscount   ?? "",
    scope:         initial?.scope         ?? "platform",
    description:   initial?.description   ?? "",
    minOrderValue: initial?.minOrderValue ?? "",
    usageLimit:    initial?.usageLimit    ?? "",
    perUserLimit:  initial?.perUserLimit  ?? 1,
    validFrom:     initial?.validFrom ? initial.validFrom.split("T")[0] : today,
    validUntil:    initial?.validUntil ? initial.validUntil.split("T")[0] : "",
    appliesTo:     initial?.appliesTo     ?? [...BOOKING_TYPES],
    optInRequired: initial?.optInRequired ?? false,
    isActive:      initial?.isActive      ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [locSearch,  setLocSearch]  = useState("");
  const [locResults, setLocResults] = useState([]);
  const [selectedLocs, setSelectedLocs] = useState(initial?.locations?.map(l => l._id ?? l) ?? []);
  const locTimer = useRef(null);

  // Search locations when scope = location
  useEffect(() => {
    if (form.scope !== "location") return;
    if (!locSearch.trim()) { setLocResults([]); return; }
    clearTimeout(locTimer.current);
    locTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/search/tourist_spot", { params: { q: locSearch, limit: 10 } });
        setLocResults(data.data?.results ?? data.data?.locations ?? []);
      } catch { setLocResults([]); }
    }, 300);
    return () => clearTimeout(locTimer.current);
  }, [locSearch, form.scope]);

  const toggleLoc = (id) => setSelectedLocs(prev =>
    prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
  );

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleApply = (type) => set("appliesTo",
    form.appliesTo.includes(type)
      ? form.appliesTo.filter(t => t !== type)
      : [...form.appliesTo, type]
  );

  const handleSubmit = async () => {
    if (!form.code || !form.value || !form.validFrom || !form.validUntil) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc"); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        locations:     form.scope === "location" ? selectedLocs : [],
        value:         Number(form.value),
        maxDiscount:   form.maxDiscount   ? Number(form.maxDiscount)   : null,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        usageLimit:    form.usageLimit    ? Number(form.usageLimit)    : null,
        perUserLimit:  Number(form.perUserLimit),
      };
      if (isEdit) {
        await api.put(`/discounts/${initial._id}`, payload);
      } else {
        await api.post("/discounts", payload);
      }
      onSave();
    } catch (e) {
      setError(e.response?.data?.message ?? "Lỗi lưu discount");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border dark:border-slate-700
                      shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200
                        dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {isEdit ? "Chỉnh sửa Discount" : "Tạo Discount mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}

          {/* Code + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Mã giảm giá *
              </label>
              <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
                disabled={isEdit}
                placeholder="SUMMER2025"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm font-mono
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Loại giảm *
              </label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="percentage">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (₫)</option>
              </select>
            </div>
          </div>

          {/* Value + Max */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
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
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                  Giảm tối đa (₫)
                </label>
                <input type="number" value={form.maxDiscount} onChange={e => set("maxDiscount", e.target.value)}
                  placeholder="100000"
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                             text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
              </div>
            )}
          </div>

          {/* Scope + Opt-in */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Phạm vi
              </label>
              <select value={form.scope} onChange={e => set("scope", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="platform">Platform (toàn hệ thống)</option>
                <option value="company">Company cụ thể</option>
                <option value="location">Location cụ thể</option>
              </select>
            </div>
            {form.scope === "platform" && (
              <div className="flex flex-col justify-end">
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                                rounded-xl px-3 py-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.optInRequired}
                      onChange={e => set("optInRequired", e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600"/>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">
                        Yêu cầu opt-in
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                        {form.optInRequired
                          ? "Company phải tự tham gia mới được áp dụng"
                          : "Tất cả company tự động tham gia"}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Location picker — hiện khi scope = location */}
          {form.scope === "location" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">
                Tìm & chọn locations
              </label>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800
                              border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 mb-2">
                <span className="text-gray-400 text-sm">🔍</span>
                <input value={locSearch} onChange={e => setLocSearch(e.target.value)}
                  placeholder="Tìm tên location..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white
                             placeholder:text-gray-400 outline-none"/>
              </div>
              {selectedLocs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedLocs.map(id => {
                    const loc = locResults.find(l => l._id === id);
                    return loc ? (
                      <span key={id} className="flex items-center gap-1 text-xs bg-blue-100
                                                dark:bg-blue-500/20 text-blue-700 dark:text-blue-400
                                                px-2 py-1 rounded-lg">
                        {loc.name}
                        <button type="button" onClick={() => toggleLoc(id)}
                          className="hover:text-red-500 ml-0.5">×</button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="border border-gray-100 dark:border-slate-800 rounded-xl max-h-40 overflow-y-auto">
                {locResults.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    {locSearch ? "Không tìm thấy" : "Nhập tên để tìm location"}
                  </p>
                ) : (
                  locResults.map(loc => (
                    <label key={loc._id}
                      className="flex items-center gap-2 cursor-pointer px-3 py-2
                                 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <input type="checkbox" checked={selectedLocs.includes(loc._id)}
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

          {/* Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Từ ngày *
              </label>
              <input type="date" value={form.validFrom} onChange={e => set("validFrom", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Đến ngày *
              </label>
              <input type="date" value={form.validUntil} onChange={e => set("validUntil", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Tổng lượt dùng
              </label>
              <input type="number" value={form.usageLimit} onChange={e => set("usageLimit", e.target.value)}
                placeholder="Không giới hạn"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Lượt/người
              </label>
              <input type="number" value={form.perUserLimit} onChange={e => set("perUserLimit", e.target.value)}
                min="1"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                Đơn tối thiểu (₫)
              </label>
              <input type="number" value={form.minOrderValue} onChange={e => set("minOrderValue", e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
          </div>

          {/* Applies to */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">
              Áp dụng cho
            </label>
            <div className="flex flex-wrap gap-2">
              {BOOKING_TYPES.map(type => (
                <button key={type} type="button" onClick={() => toggleApply(type)}
                  className={`px-3 py-1.5 text-xs rounded-xl border transition-colors font-medium
                    ${form.appliesTo.includes(type)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-blue-300"}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
              Mô tả
            </label>
            <input value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Giảm giá mùa hè..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-200
                        dark:border-slate-800 px-6 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600
                       dark:text-slate-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
            Huỷ
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                       text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo Discount"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [formOpen,  setFormOpen]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [filter,    setFilter]    = useState("all"); // all | live | inactive | expired

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/discounts", { params: { limit: 100 } });
      setDiscounts(data.data.discounts ?? []);
    } catch { setDiscounts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (d) => {
    try {
      await api.put(`/discounts/${d._id}`, { isActive: !d.isActive });
      load();
    } catch {}
  };

  const filtered = discounts.filter(d => {
    if (filter === "live")     return d.isActive && isLive(d.validFrom, d.validUntil);
    if (filter === "inactive") return !d.isActive;
    if (filter === "expired")  return isExpired(d.validUntil);
    return true;
  });

  const stats = {
    total:    discounts.length,
    live:     discounts.filter(d => d.isActive && isLive(d.validFrom, d.validUntil)).length,
    inactive: discounts.filter(d => !d.isActive).length,
    uses:     discounts.reduce((t, d) => t + (d.usageCount ?? 0), 0),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Discount Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Quản lý mã giảm giá và chiến dịch khuyến mãi
          </p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                     text-white text-sm font-bold rounded-xl transition-colors">
          + Tạo Discount
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:"Tổng",   value:stats.total,    color:"text-gray-900 dark:text-white" },
          { label:"Đang chạy", value:stats.live,  color:"text-emerald-600 dark:text-emerald-400" },
          { label:"Inactive", value:stats.inactive, color:"text-gray-400" },
          { label:"Lượt dùng", value:stats.uses,  color:"text-blue-600 dark:text-blue-400" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-gray-200
                                        dark:border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key:"all",      label:"Tất cả"    },
          { key:"live",     label:"Đang chạy" },
          { key:"inactive", label:"Inactive"  },
          { key:"expired",  label:"Hết hạn"   },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${filter === f.key ? "bg-blue-600 text-white font-semibold" : "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:border-blue-300"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-2">🎫</p>
          <p className="text-sm">Không có discount nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(d => (
            <DiscountCard key={d._id} d={d}
              onEdit={d => { setEditing(d); setFormOpen(true); }}
              onToggle={handleToggle}
              onDelete={() => {}}/>
          ))}
        </div>
      )}

      {formOpen && (
        <DiscountForm initial={editing}
          onSave={() => { setFormOpen(false); load(); }}
          onClose={() => setFormOpen(false)}/>
      )}
    </div>
  );
}