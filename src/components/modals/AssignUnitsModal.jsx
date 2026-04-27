import { useState, useEffect } from "react";
import api from "../../lib/axios";

const STATUS_DOT = {
  available:   "bg-emerald-500",
  occupied:    "bg-red-500",
  cleaning:    "bg-amber-500",
  maintenance: "bg-gray-400",
};

export default function AssignUnitsModal({ order, locationId, onClose, onSuccess }) {
  const [units,    setUnits]    = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const needed     = order.hotelDetails?.rooms ?? 1;
  const roomType   = order.hotelDetails?.roomType;
  const checkIn    = order.hotelDetails?.checkIn;
  const checkOut   = order.hotelDetails?.checkOut;

  useEffect(() => {
    api.get("/units", { params: { locationId } })
      .then(r => setUnits(r.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [locationId]);

  // Filter: chỉ show available + đúng roomType
  const available = units.filter(u =>
    u.status === "available" &&
    (!roomType || u.roomType === roomType)
  );
  const others = units.filter(u =>
    u.status !== "available" ||
    (roomType && u.roomType !== roomType)
  );

  const toggle = (unitId) => {
    setSelected(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : prev.length < needed
          ? [...prev, unitId]
          : prev
    );
  };

  const handleAssign = async () => {
    if (selected.length !== needed) {
      setError(`Please select exactly ${needed} room${needed > 1 ? "s" : ""}`);
      return;
    }
    setSaving(true); setError("");
    try {
      await api.post("/unit-bookings/assign", {
        orderId:     order._id,
        assignments: selected.map(unitId => ({ unitId })),
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message ?? "Failed to assign rooms");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                    bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg
                      max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Assign Rooms</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Select {needed} room{needed > 1 ? "s" : ""}
              {roomType && <span className="ml-1 capitalize">· {roomType} type</span>}
              {checkIn && <span className="ml-1">· {checkIn} → {checkOut}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 dark:text-slate-400">Selected</span>
            <span className={`text-xs font-bold ${selected.length === needed ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}>
              {selected.length} / {needed}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${selected.length === needed ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${(selected.length / needed) * 100}%` }}/>
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"/>)}
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">🛏️</p>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">No available rooms</p>
              {roomType && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">No {roomType} rooms available</p>}
            </div>
          ) : (
            <>
              {/* Available rooms */}
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-1">
                Available ({available.length})
              </p>
              {available.map(unit => {
                const isSelected = selected.includes(unit._id);
                const isDisabled = !isSelected && selected.length >= needed;
                return (
                  <button key={unit._id} onClick={() => toggle(unit._id)} disabled={isDisabled}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                                ${isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                  : isDisabled
                                    ? "border-gray-100 dark:border-slate-800 opacity-40 cursor-not-allowed"
                                    : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"}`}>
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                                    ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-slate-600"}`}>
                      {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    </div>

                    {/* Room info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">Room {unit.unitNumber}</p>
                        <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">{unit.roomType}</span>
                        {unit.floor && <span className="text-xs text-gray-400 dark:text-slate-500">· Floor {unit.floor}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-slate-400">👥 {unit.capacity}</span>
                        {unit.basePrice > 0 && (
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            💰 {Number(unit.basePrice).toLocaleString("vi-VN")}đ/night
                          </span>
                        )}
                        {unit.statusNote && <span className="text-xs text-gray-400 dark:text-slate-500 italic truncate">{unit.statusNote}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"/>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Available</span>
                    </div>
                  </button>
                );
              })}

              {/* Other rooms (disabled) */}
              {others.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-1 pt-2">
                    Unavailable ({others.length})
                  </p>
                  {others.map(unit => (
                    <div key={unit._id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100
                                 dark:border-slate-800 opacity-50">
                      <div className="w-5 h-5 rounded-md border-2 border-gray-200 dark:border-slate-700 shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 dark:text-slate-300 text-sm">
                          Room {unit.unitNumber}
                          <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 capitalize">{unit.roomType}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${STATUS_DOT[unit.status] ?? "bg-gray-400"}`}/>
                        <span className="text-xs text-gray-400 dark:text-slate-500 capitalize">{unit.status}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {error && (
          <div className="px-6 py-2 shrink-0">
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          </div>
        )}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-400 text-sm font-medium
                       hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleAssign}
            disabled={saving || selected.length !== needed}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-semibold transition-colors disabled:opacity-50">
            {saving ? "Assigning..." : `Assign ${selected.length}/${needed} Room${needed > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}