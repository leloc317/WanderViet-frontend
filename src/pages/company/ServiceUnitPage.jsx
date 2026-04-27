import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";

const UNIT_TYPES = ["room","table","seat","slot","zone"];
const ROOM_TYPES = ["standard","superior","deluxe","suite","vip","penthouse","other"];
const BED_TYPES  = ["king","queen","double","twin","single","bunk","sofa_bed","tatami"];
const VIEW_TYPES = ["none","city","sea","pool","garden","mountain","courtyard"];
const UNIT_TYPE_ICON = { room:"🛏️", table:"🍽️", seat:"💺", slot:"🎫", zone:"🏠" };

// Which unit types make sense for each location category
const CATEGORY_UNIT_TYPES = {
  hotel:         ["room"],
  restaurant:    ["table","seat"],
  cafe:          ["seat","table"],
  tourist_spot:  ["slot","zone"],
  entertainment: ["slot","seat","zone"],
  shopping:      ["zone"],
  service:       ["slot","seat"],
  other:         ["room","table","seat","slot","zone"],
};
const STATUS_META = {
  available:   { label:"Available",   dot:"bg-emerald-500", badge:"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  occupied:    { label:"Occupied",    dot:"bg-red-500",     badge:"bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  cleaning:    { label:"Cleaning",    dot:"bg-amber-500",   badge:"bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  maintenance: { label:"Maintenance", dot:"bg-gray-400",    badge:"bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
};

const inputCls = `w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                  text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500`;

const DEFAULT_FORM = {
  unitNumber:"", unitType:"room", roomType:"standard", floor:"",
  capacity:2, pricePerUnit:"", originalPrice:"", description:"",
  bedType:"king", roomSize:"", viewType:"none",
  includesBreakfast:false, cancellationPolicy:"moderate",
  indoor:true, smokingAllowed:false, reservationRequired:false,
  startTime:"09:00", endTime:"10:00", duration:"", minAge:0,
};

// ─── Room image uploader (edit mode only) ────────────────────────────────────
function RoomImageUploader({ unitId, images, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("images", f));
      const { data } = await api.post(`/upload/units/${unitId}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.data.images);
    } catch (e) { alert(e.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleDelete = async (publicId) => {
    if (!confirm("Remove this photo?")) return;
    try {
      const { data } = await api.delete(`/upload/units/${unitId}/images/${encodeURIComponent(publicId)}`);
      onChange(data.data.images);
    } catch (e) { alert("Delete failed"); }
  };

  const handleSetPrimary = async (publicId) => {
    try {
      const { data } = await api.patch(`/upload/units/${unitId}/images/${encodeURIComponent(publicId)}/primary`);
      onChange(data.data.images);
    } catch (e) { alert("Failed"); }
  };

  return (
    <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-3">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
        Room photos
      </p>
      {/* Existing images */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img src={img.url} alt="" className="w-full h-full object-cover"/>
              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute top-1 left-1 bg-blue-600 text-white text-[9px]
                                font-bold px-1.5 py-0.5 rounded">
                  Main
                </div>
              )}
              {/* Actions on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-center justify-center gap-1">
                {!img.isPrimary && (
                  <button type="button" onClick={() => handleSetPrimary(img.public_id)}
                    title="Set as main photo"
                    className="bg-white/90 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">
                    Main
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(img.public_id)}
                  title="Delete"
                  className="bg-white/90 text-red-600 text-[10px] font-bold px-2 py-1 rounded">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Upload button */}
      <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed
                         cursor-pointer transition-colors text-sm font-medium
                         ${uploading
                           ? "border-gray-200 text-gray-400 cursor-not-allowed"
                           : "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600"}`}>
        <span>{uploading ? "Uploading..." : "📷 Add photos"}</span>
        <input type="file" multiple accept="image/*" className="hidden"
          disabled={uploading} onChange={handleUpload}/>
      </label>
      <p className="text-xs text-gray-400 dark:text-slate-500">
        JPG, PNG, WEBP · Max 5MB each · First photo = main photo
      </p>
    </div>
  );
}

function UnitFormModal({ initial, onSave, onClose, saving, location, existingNumbers = [] }) {
  const [form, setForm] = useState(initial ?? DEFAULT_FORM);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const isDuplicate = form.unitNumber.trim() &&
    existingNumbers.includes(form.unitNumber.trim()) &&
    form.unitNumber.trim() !== initial?.unitNumber;

  // Filter unit types based on location category
  const allowedTypes = location?.category
    ? (CATEGORY_UNIT_TYPES[location.category] || UNIT_TYPES)
    : UNIT_TYPES;

  // Auto-set unitType to first allowed type if current is not allowed
  useEffect(() => {
    if (allowedTypes.length === 1 && form.unitType !== allowedTypes[0]) {
      set("unitType", allowedTypes[0]);
    }
  }, [allowedTypes]);

  const typeLabel = { room:"Room", table:"Table", seat:"Seat", slot:"Slot", zone:"Zone" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {initial ? "Edit Room" : "Thêm đơn vị mới"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Unit Number *</label>
              <input value={form.unitNumber} onChange={e => set("unitNumber", e.target.value)}
                placeholder="101"
                className={`${inputCls} ${isDuplicate ? "border-red-400" : ""}`}/>
              {isDuplicate && (
                <p className="text-red-500 text-xs mt-1">⚠️ Unit number "{form.unitNumber}" already exists</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Floor</label>
              <input type="number" value={form.floor} onChange={e => set("floor", e.target.value)}
                placeholder="1" className={inputCls}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Unit Type *</label>
              {allowedTypes.length === 1 ? (
                <div className={inputCls + " flex items-center gap-2 cursor-default"}>
                  <span>{UNIT_TYPE_ICON[allowedTypes[0]]}</span>
                  <span className="capitalize">{allowedTypes[0]}</span>
                </div>
              ) : (
                <select value={form.unitType} onChange={e => set("unitType", e.target.value)} className={inputCls}>
                  {allowedTypes.map(t => (
                    <option key={t} value={t}>{UNIT_TYPE_ICON[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Capacity</label>
              <input type="number" min={1} value={form.capacity} onChange={e => set("capacity", Number(e.target.value))} className={inputCls}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Price / unit (VND)</label>
              <input type="number" min={0} value={form.pricePerUnit} onChange={e => set("pricePerUnit", e.target.value)} placeholder="500000" className={inputCls}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Original price (optional)</label>
              <input type="number" min={0} value={form.originalPrice} onChange={e => set("originalPrice", e.target.value)} placeholder="Before discount" className={inputCls}/>
            </div>
          </div>

          {form.unitType === "room" && (
            <div className="space-y-4 border-t border-gray-100 dark:border-slate-800 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Room details</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Room type</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROOM_TYPES.map(rt => (
                    <button key={rt} type="button" onClick={() => set("roomType", rt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors
                        ${form.roomType === rt ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
                      {rt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Bed type *</label>
                  <select value={form.bedType} onChange={e => set("bedType", e.target.value)} className={inputCls}>
                    {BED_TYPES.map(b => <option key={b} value={b}>{b.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Room size (m²)</label>
                  <input type="number" min={1} value={form.roomSize} onChange={e => set("roomSize", e.target.value)} placeholder="e.g. 35" className={inputCls}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">View</label>
                  <select value={form.viewType} onChange={e => set("viewType", e.target.value)} className={inputCls}>
                    {VIEW_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Cancellation</label>
                  <select value={form.cancellationPolicy} onChange={e => set("cancellationPolicy", e.target.value)} className={inputCls}>
                    <option value="flexible">Flexible</option>
                    <option value="moderate">Moderate</option>
                    <option value="strict">Strict</option>
                    <option value="non_refundable">Non-refundable</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.includesBreakfast} onChange={e => set("includesBreakfast", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                <span className="text-sm text-gray-700 dark:text-slate-300">Includes breakfast</span>
              </label>
            </div>
          )}

          {form.unitType === "table" && (
            <div className="space-y-3 border-t border-gray-100 dark:border-slate-800 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Table details</p>
              {[["indoor","Trong nhà"],["smokingAllowed","Cho phép hút thuốc"],["reservationRequired","Cần đặt trước"]].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                  <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          )}

          {form.unitType === "slot" && (
            <div className="space-y-4 border-t border-gray-100 dark:border-slate-800 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Slot details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Start time</label>
                  <input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} className={inputCls}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">End time</label>
                  <input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} className={inputCls}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Min age</label>
                  <input type="number" min={0} value={form.minAge} onChange={e => set("minAge", Number(e.target.value))} className={inputCls}/>
                </div>
              </div>
            </div>
          )}

          {/* Room images — only shown in edit mode (unit already exists) */}
          {initial?._id && form.unitType === "room" && (
            <RoomImageUploader unitId={initial._id} images={form.images || []}
              onChange={imgs => set("images", imgs)}/>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Description</label>
            <input value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Mô tả thêm về đơn vị này..." className={inputCls}/>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !form.unitNumber || isDuplicate}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                       transition-colors disabled:opacity-60">
            {saving ? "Saving..." : initial ? "Save Changes" : "Lưu đơn vị"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServiceUnitPage() {
  const { id: locationId } = useParams();
  const navigate = useNavigate();

  const [units,    setUnits]    = useState([]);
  const [location, setLocation] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [modal,    setModal]    = useState(null); // null | "add" | unit object
  const [filter,   setFilter]   = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [unitRes, locRes] = await Promise.all([
        api.get("/units", { params: { locationId } }),
        api.get(`/company/locations/${locationId}`),
      ]);
      setUnits(unitRes.data.data ?? []);
      setLocation(locRes.data.data?.location ?? null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [locationId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = {
        locationId,
        unitNumber:   form.unitNumber,
        unitType:     form.unitType,
        floor:        form.floor ? Number(form.floor) : undefined,
        capacity:     Number(form.capacity),
        pricePerUnit: form.pricePerUnit  ? Number(form.pricePerUnit)  : undefined,
        originalPrice:form.originalPrice ? Number(form.originalPrice) : undefined,
        description:  form.description,
        ...(form.unitType === "room" && {
          roomType:           form.roomType,
          bedType:            form.bedType,
          roomSize:           form.roomSize ? Number(form.roomSize) : undefined,
          viewType:           form.viewType,
          includesBreakfast:  form.includesBreakfast,
          cancellationPolicy: form.cancellationPolicy,
        }),
        ...(form.unitType === "table" && {
          indoor:              form.indoor,
          smokingAllowed:      form.smokingAllowed,
          reservationRequired: form.reservationRequired,
        }),
        ...(form.unitType === "slot" && {
          startTime: form.startTime,
          endTime:   form.endTime,
          minAge:    form.minAge,
        }),
      };

      if (modal && modal._id) {
        await api.put(`/units/${modal._id}`, payload);
      } else {
        await api.post("/units", payload);
      }
      setModal(null);
      fetchData();
    } catch (e) { alert(e.response?.data?.message ?? "Error saving room"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (unit) => {
    if (!confirm(`Delete room ${unit.unitNumber}?`)) return;
    try {
      await api.delete(`/units/${unit._id}`);
      setUnits(prev => prev.filter(u => u._id !== unit._id));
    } catch (e) { alert(e.response?.data?.message ?? "Error"); }
  };

  const handleStatusChange = async (unit, status) => {
    try {
      await api.patch(`/units/${unit._id}/status`, { status });
      setUnits(prev => prev.map(u => u._id === unit._id ? { ...u, status } : u));
    } catch (e) { alert(e.response?.data?.message ?? "Error"); }
  };

  // Stats
  const stats = units.reduce((acc, u) => { acc[u.status] = (acc[u.status]||0)+1; return acc; }, {});
  const filtered = filter ? units.filter(u => u.roomType === filter || u.status === filter) : units;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/company/locations")}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Room Management</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate">
            {location?.name ?? "Loading..."}
          </p>
        </div>
        <button onClick={() => setModal("add")}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
          + Add Room
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <div key={status} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3 text-center">
            <div className={`w-2 h-2 rounded-full ${meta.dot} mx-auto mb-1.5`}/>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats[status] ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{meta.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {["", ...ROOM_TYPES, ...Object.keys(STATUS_META)].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border transition-all capitalize
                        ${filter === f
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}>
            {f || "All"}
          </button>
        ))}
      </div>

      {/* Units grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🛏️</p>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No rooms yet</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Add your first room to get started</p>
          <button onClick={() => setModal("add")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            + Add Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(unit => {
            const meta = STATUS_META[unit.status] ?? STATUS_META.available;
            return (
              <div key={unit._id}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                      {unit.unitNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                      {unit.unitType === "room" ? unit.roomType : unit.unitType} · Floor {unit.floor ?? "-"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
                    {meta.label}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1 mb-3">
                  <p className="text-xs text-gray-500 dark:text-slate-400">👥 Up to {unit.capacity} guests</p>
                  {unit.pricePerUnit > 0 && (
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      💰 {Number(unit.pricePerUnit).toLocaleString("vi-VN")}₫/đêm
                    </p>
                  )}
                  {unit.statusNote && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 italic truncate">{unit.statusNote}</p>
                  )}
                </div>

                {/* Status change */}
                {unit.status !== "occupied" && (
                  <div className="mb-3">
                    <select value={unit.status}
                      onChange={e => handleStatusChange(unit, e.target.value)}
                      className="w-full text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200
                                 dark:border-slate-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-slate-300">
                      <option value="available">Available</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setModal({ ...unit, basePrice: unit.pricePerUnit ?? '', statusNote: unit.description ?? '' })}
                    className="flex-1 py-1.5 text-xs border border-gray-200 dark:border-slate-700
                               rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50
                               dark:hover:bg-slate-800 transition-colors">
                    Edit
                  </button>
                  {unit.status !== "occupied" && (
                    <button onClick={() => handleDelete(unit)}
                      className="flex-1 py-1.5 text-xs border border-red-200 dark:border-red-500/30
                                 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50
                                 dark:hover:bg-red-500/10 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <UnitFormModal
          initial={modal === "add" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
          location={location}
          existingNumbers={units.map(u => u.unitNumber)}
        />
      )}
    </div>
  );
}