import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";

const CATEGORIES = ["time","damage","consumption","service","cleaning","other"];
const UNITS      = ["flat","per_hour","per_item","per_night","per_person"];
const CAT_META   = {
  time:        { icon:"⏰", label:"Time-based"  },
  damage:      { icon:"💥", label:"Damage"       },
  consumption: { icon:"🧴", label:"Consumption"  },
  service:     { icon:"🛎️",  label:"Service"      },
  cleaning:    { icon:"🧹", label:"Cleaning"     },
  other:       { icon:"📋", label:"Other"        },
};

const fmtVND = (n) => `₫${Number(n).toLocaleString("vi-VN")}`;

// ── Preset charges theo loại hình dịch vụ ────────────────────────────────────
const PRESETS = {
  hotel: {
    label: "🏨 Khách sạn",
    items: [
      { name:"Late checkout fee (2-6h)",  category:"time",        unit:"flat",     basePrice:200000, description:"Phí trả phòng muộn 2-6h (50% giá phòng)" },
      { name:"Late checkout fee (>6h)",   category:"time",        unit:"flat",     basePrice:400000, description:"Phí trả phòng muộn >6h (full 1 đêm)" },
      { name:"Minibar consumption",        category:"consumption", unit:"flat",     basePrice:150000, description:"Đồ uống & snack từ minibar" },
      { name:"Room service",              category:"service",     unit:"flat",     basePrice:50000,  description:"Phí giao đồ ăn tại phòng" },
      { name:"Laundry (per item)",        category:"service",     unit:"per_item", basePrice:30000,  description:"Giặt ủi theo món" },
      { name:"Extra bed",                 category:"service",     unit:"per_night",basePrice:300000, description:"Giường phụ thêm" },
      { name:"Broken item",              category:"damage",      unit:"flat",     basePrice:500000, description:"Đền bù đồ vật hỏng/vỡ" },
      { name:"Deep cleaning",             category:"cleaning",    unit:"flat",     basePrice:200000, description:"Vệ sinh chuyên sâu khi phòng bẩn nặng" },
      { name:"Lost key card",             category:"damage",      unit:"flat",     basePrice:100000, description:"Mất thẻ từ" },
      { name:"Pet fee",                   category:"other",       unit:"per_night",basePrice:200000, description:"Phí mang theo thú cưng" },
    ],
  },
  restaurant: {
    label: "🍽️ Nhà hàng",
    items: [
      { name:"Corkage fee",               category:"service",     unit:"flat",     basePrice:200000, description:"Phí mang rượu từ ngoài vào" },
      { name:"Private room fee",          category:"service",     unit:"flat",     basePrice:500000, description:"Phí thuê phòng riêng" },
      { name:"Cake cutting fee",          category:"service",     unit:"flat",     basePrice:100000, description:"Phí cắt bánh" },
      { name:"Decoration setup",         category:"service",     unit:"flat",     basePrice:300000, description:"Trang trí bàn tiệc" },
      { name:"Extra service charge",      category:"service",     unit:"flat",     basePrice:50000,  description:"Phí phục vụ thêm" },
      { name:"Overtime charge (per hour)",category:"time",        unit:"per_hour", basePrice:200000, description:"Phí ngồi quá giờ" },
    ],
  },
  entertainment: {
    label: "🎡 Giải trí",
    items: [
      { name:"Equipment damage",          category:"damage",      unit:"flat",     basePrice:500000, description:"Hỏng thiết bị" },
      { name:"Extra time (per hour)",     category:"time",        unit:"per_hour", basePrice:100000, description:"Thêm giờ sử dụng" },
      { name:"Cleaning fee",              category:"cleaning",    unit:"flat",     basePrice:100000, description:"Vệ sinh sau sử dụng" },
      { name:"Lost item fee",             category:"damage",      unit:"flat",     basePrice:200000, description:"Mất đồ cho mượn" },
    ],
  },
};

// ── Quick Setup Modal ─────────────────────────────────────────────────────────
function QuickSetupModal({ locationId, existingNames, onClose, onSuccess }) {
  const [selectedType, setSelectedType] = useState("hotel");
  const [selected,     setSelected]     = useState({});
  const [saving,       setSaving]       = useState(false);

  const preset = PRESETS[selectedType];

  // Auto-select tất cả khi chọn type, bỏ qua cái đã tồn tại
  useEffect(() => {
    const initial = {};
    preset.items.forEach((item, i) => {
      if (!existingNames.includes(item.name)) initial[i] = true;
    });
    setSelected(initial);
  }, [selectedType]);

  const toggleAll = () => {
    const nonExisting = preset.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !existingNames.includes(item.name));
    const allSelected = nonExisting.every(({ i }) => selected[i]);
    const next = { ...selected };
    nonExisting.forEach(({ i }) => { next[i] = !allSelected; });
    setSelected(next);
  };

  const handleCreate = async () => {
    const toCreate = preset.items
      .filter((_, i) => selected[i])
      .map(item => ({ ...item }));

    if (toCreate.length === 0) return;
    setSaving(true);
    try {
      await api.post("/charges/bulk", { locationId, charges: toCreate });
      onSuccess(toCreate.length);
    } catch (e) { alert(e.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                    p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-3xl
                      sm:rounded-2xl border dark:border-slate-700 shadow-2xl
                      max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b
                        border-gray-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">⚡ Quick Setup</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Thêm nhanh các charge template phổ biến
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl">×</button>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 px-5 pt-4 pb-2 shrink-0">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} onClick={() => setSelectedType(key)}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors
                ${selectedType === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Select all */}
        <div className="px-5 py-2 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {selectedCount} được chọn
          </span>
          <button onClick={toggleAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            {Object.values(selected).filter(Boolean).length ===
             preset.items.filter((item) => !existingNames.includes(item.name)).length
              ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {preset.items.map((item, i) => {
            const exists = existingNames.includes(item.name);
            const meta   = CAT_META[item.category] ?? CAT_META.other;
            return (
              <label key={i}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer
                            ${exists
                              ? "border-gray-100 dark:border-slate-800 opacity-40 cursor-not-allowed"
                              : selected[i]
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"}`}>
                <input type="checkbox" checked={!!selected[i]} disabled={exists}
                  onChange={() => !exists && setSelected(p => ({ ...p, [i]: !p[i] }))}
                  className="mt-0.5 w-4 h-4 rounded accent-blue-600 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </span>
                    {exists && (
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        (đã có)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{item.description}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {meta.icon} {meta.label} · {fmtVND(item.basePrice)}/{item.unit.replace("_"," ")}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl
                       text-sm text-gray-600 dark:text-slate-400">
            Huỷ
          </button>
          <button onClick={handleCreate} disabled={saving || selectedCount === 0}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                       text-sm font-semibold disabled:opacity-50">
            {saving ? "Đang tạo..." : `Tạo ${selectedCount} template`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChargeModal({ charge, locationId, onClose, onSuccess }) {
  const isEdit = !!charge;
  const [form, setForm] = useState({
    name:        charge?.name        ?? "",
    category:    charge?.category    ?? "other",
    unit:        charge?.unit        ?? "flat",
    basePrice:   charge?.basePrice   ?? 0,
    description: charge?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.basePrice) return setError("Name và price required");
    setSaving(true); setError("");
    try {
      const payload = { ...form, locationId };
      if (isEdit) await api.put(`/charges/${charge._id}`, payload);
      else        await api.post("/charges", payload);
      onSuccess();
    } catch (e) { setError(e.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white">{isEdit ? "Edit Charge" : "Add Charge"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Late checkout fee"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => set("category", c)}
                  className={`py-2 rounded-xl text-xs border transition-all
                              ${form.category === c ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                    : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
                  {CAT_META[c].icon} {CAT_META[c].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Charge Unit</label>
              <select value={form.unit} onChange={e => set("unit", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none">
                {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Base Price (₫) *</label>
              <input type="number" min="0" value={form.basePrice} onChange={e => set("basePrice", e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white resize-none focus:outline-none"/>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-600 dark:text-slate-400">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving..." : isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChargeTemplatePage() {
  const { id: locationId } = useParams();
  const navigate = useNavigate();
  const [charges,     setCharges]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [quickSetup,  setQuickSetup]  = useState(false);
  const [toast,       setToast]       = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/charges", { params: { locationId, includeInactive: true } });
      setCharges(data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [locationId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (c) => {
    try {
      await api.put(`/charges/${c._id}`, { isActive: !c.isActive });
      showToast(c.isActive ? "⏸ Template đã tắt" : "✅ Template đã bật");
      load();
    } catch (e) { alert(e.response?.data?.message ?? "Error"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xoá vĩnh viễn template này?")) return;
    try { await api.delete(`/charges/${id}`); load(); }
    catch (e) { alert(e.response?.data?.message ?? "Error"); }
  };

  const displayed = showInactive ? charges : charges.filter(c => c.isActive);
  const inactiveCount = charges.filter(c => !c.isActive).length;

  const grouped = displayed.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  const existingNames = charges.filter(c => c.isActive).map(c => c.name);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/company/locations")}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Charge Templates</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {charges.filter(c => c.isActive).length} active
            {inactiveCount > 0 && ` · ${inactiveCount} inactive`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <button onClick={() => setShowInactive(p => !p)}
              className={`px-3 py-2 text-xs rounded-xl font-medium transition-colors border
                ${showInactive
                  ? "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600"
                  : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300"}`}>
              {showInactive ? "Ẩn inactive" : `Hiện inactive (${inactiveCount})`}
            </button>
          )}
          <button onClick={() => setQuickSetup(true)}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold">
            ⚡ Quick Setup
          </button>
          <button onClick={() => setModal("add")}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            + Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : charges.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">💳</p>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No charge templates</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
            Tạo nhanh các template phổ biến hoặc thêm thủ công
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setQuickSetup(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold">
              ⚡ Quick Setup
            </button>
            <button onClick={() => setModal("add")}
              className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl text-sm">
              + Add Manual
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                {CAT_META[cat]?.icon} {CAT_META[cat]?.label} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map(c => (
                  <div key={c._id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl px-4 py-3
                               flex items-center justify-between transition-opacity
                               ${c.isActive
                                 ? "border-gray-200 dark:border-slate-800"
                                 : "border-gray-100 dark:border-slate-800 opacity-50"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {c.name}
                        </p>
                        {!c.isActive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                                           bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 shrink-0">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {fmtVND(c.basePrice)} / {c.unit.replace("_"," ")}
                      </p>
                      {c.description && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 italic truncate">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-3">
                      <button onClick={() => setModal(c)}
                        className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white
                                   px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg">
                        Edit
                      </button>
                      <button onClick={() => handleToggleActive(c)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors
                          ${c.isActive
                            ? "border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            : "border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"}`}>
                        {c.isActive ? "Tắt" : "Bật"}
                      </button>
                      <button onClick={() => handleDelete(c._id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2.5 py-1.5
                                   border border-red-200 dark:border-red-800 rounded-lg">
                        Xoá
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ChargeModal
          charge={modal === "add" ? null : modal}
          locationId={locationId}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load(); }}
        />
      )}

      {quickSetup && (
        <QuickSetupModal
          locationId={locationId}
          existingNames={existingNames}
          onClose={() => setQuickSetup(false)}
          onSuccess={(count) => {
            setQuickSetup(false);
            load();
            showToast(`✅ Đã tạo ${count} charge template`);
          }}
        />
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