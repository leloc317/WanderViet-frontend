import { useState } from "react";
import api from "../../lib/axios";

export default function CheckInModal({ unitBooking, order, onClose, onSuccess }) {
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const unit = unitBooking.unit;

  const handleCheckIn = async () => {
    setSaving(true); setError("");
    try {
      await api.post(`/unit-bookings/${unitBooking._id}/checkin`, { checkInNote: note });
      onSuccess();
    } catch (e) { setError(e.response?.data?.message ?? "Check-in failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl
                      border dark:border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Check-in — Room {unit?.unitNumber}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 capitalize">{unit?.roomType} · Floor {unit?.floor ?? "-"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl">×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Guest info */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Guest Info
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Name</span>
              <span className="font-medium text-gray-900 dark:text-white">{order.contactName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Phone</span>
              <span className="font-medium text-gray-900 dark:text-white">{order.contactPhone}</span>
            </div>
            {order.hotelDetails && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Check-in</span>
                  <span className="font-medium text-gray-900 dark:text-white">{order.hotelDetails.checkIn}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Check-out</span>
                  <span className="font-medium text-gray-900 dark:text-white">{order.hotelDetails.checkOut}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Guests</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {order.hotelDetails.adults} adults, {order.hotelDetails.children} children
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Amenities */}
          {unit?.amenities?.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                Room Amenities
              </p>
              <div className="flex flex-wrap gap-2">
                {unit.amenities.map(a => (
                  <span key={a._id} className="text-xs bg-white dark:bg-slate-800 border border-emerald-200
                                               dark:border-slate-700 rounded-full px-2.5 py-1 text-gray-700 dark:text-slate-300">
                    {a.icon} {a.name}
                    {!a.isFree && ` · ${a.price?.toLocaleString("vi-VN")}đ`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Special requests */}
          {order.hotelDetails?.specialReq && (
            <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Special Request</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">{order.hotelDetails.specialReq}</p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Check-in Note (optional)
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Any notes about the room or guest..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm
                       font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={handleCheckIn} disabled={saving}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm
                       font-semibold transition-colors disabled:opacity-60">
            {saving ? "Checking in..." : "✓ Confirm Check-in"}
          </button>
        </div>
      </div>
    </div>
  );
}