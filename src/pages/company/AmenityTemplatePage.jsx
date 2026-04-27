import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";

const CATEGORIES = ["in_room","bathroom","entertainment","service","food","other"];
const CAT_ICON   = { in_room:"🛏️", bathroom:"🚿", entertainment:"📺", service:"🛎️", food:"🍽️", other:"⭐" };

function AmenityModal({ amenity, locationId, onClose, onSuccess }) {
  const isEdit = !!amenity;
  const [form, setForm] = useState({
    name:        amenity?.name        ?? "",
    icon:        amenity?.icon        ?? "⭐",
    category:    amenity?.category    ?? "other",
    isFree:      amenity?.isFree      ?? true,
    price:       amenity?.price       ?? 0,
    description: amenity?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Name required");
    setSaving(true); setError("");
    try {
      const payload = { ...form, locationId };
      if (isEdit) await api.put(`/amenities/${amenity._id}`, payload);
      else        await api.post("/amenities", payload);
      onSuccess();
    } catch (e) { setError(e.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const EMOJI_SHORTCUTS = ["🛏️","🚿","📺","🛎️","🍽️","☕","🌡️","❄️","💪","🎮","📶","🔒","🅿️","🌊","🏊"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white">{isEdit ? "Edit Amenity" : "Add Amenity"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Icon picker */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 block">Icon</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {EMOJI_SHORTCUTS.map(e => (
                <button key={e} onClick={() => set("icon", e)}
                  className={`w-9 h-9 rounded-lg text-lg border transition-all
                              ${form.icon === e ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-gray-200 dark:border-slate-700"}`}>
                  {e}
                </button>
              ))}
            </div>
            <input value={form.icon} onChange={e => set("icon", e.target.value)} placeholder="Custom emoji"
              className="w-24 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Air conditioning"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => set("category", c)}
                  className={`py-2 rounded-xl text-xs border capitalize transition-all
                              ${form.category === c ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                    : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
                  {CAT_ICON[c]} {c.replace("_"," ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 block">Pricing</label>
            <div className="flex gap-3">
              <button onClick={() => set("isFree", true)}
                className={`flex-1 py-2.5 rounded-xl text-sm border transition-all
                            ${form.isFree ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
                ✓ Free
              </button>
              <button onClick={() => set("isFree", false)}
                className={`flex-1 py-2.5 rounded-xl text-sm border transition-all
                            ${!form.isFree ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium"
                                           : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
                Paid
              </button>
            </div>
            {!form.isFree && (
              <input type="number" min="0" value={form.price} onChange={e => set("price", e.target.value)}
                placeholder="Price (₫)" className="w-full mt-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"/>
            )}
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

export default function AmenityTemplatePage() {
  const { id: locationId } = useParams();
  const navigate = useNavigate();
  const [amenities, setAmenities] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get("/amenities", { params: { locationId, includeInactive: false } });
      setAmenities(data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [locationId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this amenity?")) return;
    try { await api.delete(`/amenities/${id}`); fetch(); }
    catch (e) { alert(e.response?.data?.message ?? "Error"); }
  };

  const grouped = amenities.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/company/locations")} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Amenity Templates</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{amenities.length} amenities</p>
        </div>
        <button onClick={() => setModal("add")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">+ Add</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : amenities.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">✨</p>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No amenities yet</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Add amenities to assign to your rooms</p>
          <button onClick={() => setModal("add")} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">Add First Amenity</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 capitalize">
                {CAT_ICON[cat]} {cat.replace("_"," ")} ({items.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map(a => (
                  <div key={a._id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{a.icon}</span>
                      <div className="flex gap-1">
                        <button onClick={() => setModal(a)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white px-1.5">Edit</button>
                        <button onClick={() => handleDelete(a._id)} className="text-xs text-red-400 hover:text-red-600 px-1.5">×</button>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {a.isFree ? "Free" : `₫${a.price?.toLocaleString("vi-VN")}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AmenityModal
          amenity={modal === "add" ? null : modal}
          locationId={locationId}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); fetch(); }}
        />
      )}
    </div>
  );
}