import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";
import useSocket from "../../hooks/useSocket";

const STATUS_META = {
  available:   { label:"Available",   dot:"bg-emerald-500", badge:"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  occupied:    { label:"Occupied",    dot:"bg-red-500",     badge:"bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  cleaning:    { label:"Cleaning",    dot:"bg-amber-500",   badge:"bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  maintenance: { label:"Maintenance", dot:"bg-gray-400",    badge:"bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
};

const TRANSITIONS = {
  available:   ["cleaning", "maintenance"],
  cleaning:    ["available", "maintenance"],
  maintenance: ["available", "cleaning"],
  occupied:    [],
};

// ── Status Dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({ unit, onUpdate }) {
  const [open,   setOpen]   = useState(false);
  const [target, setTarget] = useState(null);
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  const transitions = TRANSITIONS[unit.status] ?? [];
  if (transitions.length === 0) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await api.patch(`/units/${unit._id}/status`, {
        status:     target,
        statusNote: note.trim() || "Cập nhật bởi staff",
      });
      onUpdate(unit._id, target, note.trim() || "Cập nhật bởi staff");
      setOpen(false); setTarget(null); setNote("");
    } catch (e) {
      alert(e.response?.data?.message ?? "Cập nhật thất bại");
    } finally { setSaving(false); }
  };

  return (
    <div className="relative mt-2">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs
                     border border-gray-200 dark:border-slate-700 rounded-xl
                     text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800
                     hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <span>Đổi trạng thái</span>
          <span className="text-gray-400">▾</span>
        </button>
      ) : (
        <div className="border border-blue-300 dark:border-blue-600 rounded-xl
                        bg-white dark:bg-slate-800 p-3 space-y-2.5 shadow-lg">
          {/* Options */}
          <div className="flex flex-col gap-1.5">
            {transitions.map(s => {
              const meta = STATUS_META[s];
              const sel  = target === s;
              return (
                <button key={s} onClick={() => setTarget(s)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                              text-xs font-medium transition-all text-left
                              ${sel ? "bg-blue-600 text-white"
                                    : "hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200"}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${sel ? "bg-white" : meta.dot}`}/>
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Note */}
          {target && (
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)..." rows={2}
              className="w-full text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200
                         dark:border-slate-600 rounded-lg px-2.5 py-2 text-gray-700
                         dark:text-slate-200 placeholder:text-gray-400 resize-none
                         focus:outline-none focus:ring-1 focus:ring-blue-400"/>
          )}

          {/* Actions */}
          <div className="flex gap-1.5">
            <button onClick={() => { setOpen(false); setTarget(null); setNote(""); }}
              className="flex-1 py-1.5 text-xs border border-gray-200 dark:border-slate-600
                         text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-50
                         dark:hover:bg-slate-700 transition-colors">
              Huỷ
            </button>
            <button onClick={handleConfirm} disabled={!target || saving}
              className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-700
                         text-white rounded-lg font-semibold transition-colors disabled:opacity-40">
              {saving ? "..." : "Xác nhận"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StaffUnitsPage() {
  const { user }   = useAuth();
  const locationId = user?.staffInfo?.location?._id ?? user?.staffInfo?.location;

  const [units,        setUnits]   = useState([]);
  const [loading,      setLoading] = useState(true);
  const [filterStatus, setFilter]  = useState("");

  const fetchUnits = useCallback(async () => {
    if (!locationId) return;
    try {
      const { data } = await api.get("/units", { params: { locationId } });
      setUnits(data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [locationId]);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const handleUpdate = (unitId, newStatus, newNote) =>
    setUnits(prev => prev.map(u =>
      u._id === unitId ? { ...u, status: newStatus, statusNote: newNote } : u
    ));

  // Real-time: another staff changed a unit status
  useSocket("unit:status", useCallback(({ unitId, status, statusNote }) => {
    setUnits(prev => prev.map(u =>
      u._id === unitId ? { ...u, status, statusNote: statusNote ?? u.statusNote } : u
    ));
  }, []));

  const filtered = filterStatus ? units.filter(u => u.status === filterStatus) : units;
  const stats    = units.reduce((acc, u) => ({ ...acc, [u.status]: (acc[u.status] || 0) + 1 }), {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Units Board</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          {units.length} total · {stats.available ?? 0} available · {stats.occupied ?? 0} occupied
        </p>
      </div>

      {/* Stats filter pills */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <button key={status} onClick={() => setFilter(filterStatus === status ? "" : status)}
            className={`p-3 rounded-2xl border text-center transition-all
                        ${filterStatus === status
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                          : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300"}`}>
            <div className={`w-2 h-2 rounded-full ${meta.dot} mx-auto mb-1.5`}/>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats[status] ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{meta.label}</p>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i =>
            <div key={i} className="h-36 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">🛏️</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm">No units found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(unit => {
            const meta = STATUS_META[unit.status] ?? STATUS_META.available;
            return (
              <div key={unit._id}
                className="bg-white dark:bg-slate-900 border border-gray-200
                           dark:border-slate-800 rounded-2xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      Room {unit.unitNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                      {unit.roomType} · Floor {unit.floor ?? "-"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                   text-xs font-medium ${meta.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
                    {meta.label}
                  </span>
                </div>

                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                  👥 Up to {unit.capacity}
                </p>

                {unit.statusNote && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic truncate mb-1">
                    {unit.statusNote}
                  </p>
                )}

                {unit.status === "occupied" ? (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                    Guest checked in
                  </p>
                ) : (
                  <StatusDropdown unit={unit} onUpdate={handleUpdate}/>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}