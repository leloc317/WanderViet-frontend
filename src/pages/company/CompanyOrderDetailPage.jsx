import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import AssignUnitsModal from "../../components/modals/AssignUnitsModal";
import CheckInModal     from "../../components/modals/CheckInModal";
import CheckOutModal    from "../../components/modals/CheckOutModal";

const STATUS_META = {
  pending:               { label:"Pending",          color:"text-amber-600 dark:text-amber-400",   bg:"bg-amber-50 dark:bg-amber-400/10" },
  holding:               { label:"Holding",          color:"text-yellow-600 dark:text-yellow-400", bg:"bg-yellow-50 dark:bg-yellow-400/10" },
  confirmed:             { label:"Confirmed",        color:"text-blue-600 dark:text-blue-400",     bg:"bg-blue-50 dark:bg-blue-400/10" },
  checked_in:            { label:"Checked in",       color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-400/10" },
  partially_checked_out: { label:"Partial checkout", color:"text-purple-600 dark:text-purple-400", bg:"bg-purple-50 dark:bg-purple-400/10" },
  completed:             { label:"Completed",        color:"text-gray-600 dark:text-slate-300",    bg:"bg-gray-50 dark:bg-slate-800" },
  cancelled:             { label:"Cancelled",        color:"text-red-600 dark:text-red-400",       bg:"bg-red-50 dark:bg-red-400/10" },
  no_show:               { label:"No show",          color:"text-red-600 dark:text-red-400",       bg:"bg-red-50 dark:bg-red-400/10" },
};

const UNIT_STATUS_META = {
  pending:     { label:"Pending",      color:"text-gray-500 dark:text-slate-400",     dot:"bg-gray-400" },
  checked_in:  { label:"Checked in",  color:"text-emerald-600 dark:text-emerald-400", dot:"bg-emerald-500" },
  checked_out: { label:"Checked out", color:"text-blue-600 dark:text-blue-400",       dot:"bg-blue-500" },
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function BookingDetails({ order }) {
  const t = order.bookingType;
  const d = order[`${t}Details`] ?? {};
  const rows = [];

  if (t === "hotel") {
    rows.push(
      { label: "Check-in",   value: d.checkIn },
      { label: "Check-out",  value: d.checkOut },
      { label: "Nights",     value: d.nights ? `${d.nights} night${d.nights > 1 ? "s" : ""}` : null },
      { label: "Rooms",      value: d.rooms ? `${d.rooms} room${d.rooms > 1 ? "s" : ""}` : null },
      { label: "Room type",  value: d.roomType },
      { label: "Guests",     value: d.adults || d.children ? `${d.adults ?? 0} adults, ${d.children ?? 0} children` : null },
      { label: "Special",    value: d.specialReq },
    );
  } else if (t === "restaurant") {
    rows.push(
      { label: "Date",       value: d.date },
      { label: "Time",       value: d.time },
      { label: "Party size", value: d.partySize ? `${d.partySize} people` : null },
      { label: "Seating",    value: d.seatingPref !== "no_preference" ? d.seatingPref : null },
      { label: "Special",    value: d.specialReq },
    );
  } else if (t === "entertainment") {
    rows.push(
      { label: "Date",       value: d.date },
      { label: "Time",       value: d.time },
      { label: "Ticket",     value: d.ticketType },
      { label: "Quantity",   value: d.quantity ? `${d.quantity} ticket${d.quantity > 1 ? "s" : ""}` : null },
      { label: "Special",    value: d.specialReq },
    );
  } else if (t === "tour") {
    rows.push(
      { label: "Date",       value: d.date },
      { label: "Group type", value: d.groupType?.replace(/_/g, " ") },
      { label: "Adults",     value: d.adults },
      { label: "Children",   value: d.children },
      { label: "Special",    value: d.specialReq },
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
        Booking Details
      </p>
      {rows.map(r => r.value ? <InfoRow key={r.label} {...r} /> : null)}
    </div>
  );
}

export default function CompanyOrderDetailPage() {
  const { locationId, orderId } = useParams();
  const navigate = useNavigate();

  const [order,        setOrder]        = useState(null);
  const [unitBookings, setUnitBookings] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  const [showAssign,  setShowAssign]  = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(null);  // unitBooking object
  const [showCheckOut,setShowCheckOut]= useState(null);  // unitBooking object

  const fetchData = useCallback(async () => {
    try {
      const [orderRes, ubRes] = await Promise.all([
        api.get(`/bookings/${orderId}/detail`),
        api.get(`/unit-bookings`, { params: { orderId } }),
      ]);
      setOrder(orderRes.data.data);
      setUnitBookings(ubRes.data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await api.patch(`/bookings/${orderId}/confirm`);
      fetchData();
    } catch (e) { alert(e.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleReject = async () => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setSaving(true);
    try {
      await api.patch(`/bookings/${orderId}/reject`, { reason });
      fetchData();
    } catch (e) { alert(e.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
    </div>
  );

  if (!order) return (
    <div className="text-center py-20">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-gray-500 dark:text-slate-400">Order not found</p>
    </div>
  );

  const meta         = STATUS_META[order.status] ?? { label: order.status, color: "text-gray-500", bg: "bg-gray-50" };
  const isHotel      = order.bookingType === "hotel";
  const canConfirm   = order.status === "pending" || order.status === "holding";
  const canAssign    = order.status === "confirmed" && isHotel;
  const hasAssigned  = unitBookings.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/company/bookings/${locationId}`)}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors text-xl">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {order.contactName}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
            #{orderId.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Actions bar */}
      {(canConfirm || canAssign) && (
        <div className="flex gap-3 mb-5">
          {canConfirm && (
            <>
              <button onClick={handleConfirm} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm
                           font-semibold transition-colors disabled:opacity-60">
                ✓ Confirm
              </button>
              <button onClick={handleReject} disabled={saving}
                className="flex-1 py-2.5 border border-red-300 dark:border-red-800 text-red-600
                           dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50
                           dark:hover:bg-red-400/10 transition-colors disabled:opacity-60">
                ✕ Reject
              </button>
            </>
          )}
          {canAssign && !hasAssigned && (
            <button onClick={() => setShowAssign(true)}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl
                         text-sm font-semibold transition-colors">
              🛏️ Assign Rooms
            </button>
          )}
          {canAssign && hasAssigned && (
            <button onClick={() => setShowAssign(true)}
              className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600
                         dark:text-slate-400 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Re-assign
            </button>
          )}
        </div>
      )}

      {/* Contact */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Guest Contact
        </p>
        <InfoRow label="Name"   value={order.contactName} />
        <InfoRow label="Phone"  value={order.contactPhone} />
        <InfoRow label="Email"  value={order.contactEmail} />
        <InfoRow label="Age"    value={order.age} />
        <InfoRow label="Gender" value={order.gender} />
        {order.userNote && <InfoRow label="Note" value={order.userNote} />}
      </div>

      {/* Booking details */}
      <BookingDetails order={order} />

      {/* Unit Bookings (hotel) */}
      {isHotel && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Room Assignments ({unitBookings.length})
            </p>
            {unitBookings.length > 0 && (
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {unitBookings.filter(u => u.status === "checked_out").length}/{unitBookings.length} checked out
              </span>
            )}
          </div>

          {unitBookings.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
              No rooms assigned yet
            </p>
          ) : (
            <div className="space-y-2">
              {unitBookings.map(ub => {
                const uMeta = UNIT_STATUS_META[ub.status] ?? UNIT_STATUS_META.pending;
                return (
                  <div key={ub._id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${uMeta.dot}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Room {ub.unit?.unitNumber}
                        <span className="ml-2 text-xs text-gray-500 dark:text-slate-400 capitalize">
                          {ub.unit?.roomType}
                        </span>
                        {ub.unit?.floor && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-slate-500">
                            · Floor {ub.unit.floor}
                          </span>
                        )}
                      </p>
                      <span className={`text-xs ${uMeta.color}`}>{uMeta.label}</span>
                      {ub.checkInAt && (
                        <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">
                          · In: {new Date(ub.checkInAt).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                      {ub.actualCheckOut && (
                        <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">
                          · Out: {new Date(ub.actualCheckOut).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                    {/* Check-in / Check-out buttons */}
                    <div className="shrink-0">
                      {ub.status === "pending" && (
                        <button onClick={() => setShowCheckIn(ub)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white
                                     rounded-lg text-xs font-medium transition-colors">
                          Check-in
                        </button>
                      )}
                      {ub.status === "checked_in" && (
                        <button onClick={() => setShowCheckOut(ub)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white
                                     rounded-lg text-xs font-medium transition-colors">
                          Check-out
                        </button>
                      )}
                      {ub.status === "checked_out" && ub.totalExtra > 0 && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          +{ub.totalExtra.toLocaleString("vi-VN")}đ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Company note */}
      {order.companyNote && (
        <div className="bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/20
                        rounded-2xl px-4 py-3 text-sm text-blue-700 dark:text-blue-400 mb-4">
          📝 {order.companyNote}
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Timeline
        </p>
        <InfoRow label="Created"   value={new Date(order.createdAt).toLocaleString("vi-VN")} />
        {order.confirmedAt && <InfoRow label="Confirmed" value={new Date(order.confirmedAt).toLocaleString("vi-VN")} />}
      </div>

      {/* Modals */}
      {showAssign && (
        <AssignUnitsModal
          order={order}
          locationId={locationId}
          onClose={() => setShowAssign(false)}
          onSuccess={() => { setShowAssign(false); fetchData(); }}
        />
      )}
      {showCheckIn && (
        <CheckInModal
          unitBooking={showCheckIn}
          order={order}
          onClose={() => setShowCheckIn(null)}
          onSuccess={() => { setShowCheckIn(null); fetchData(); }}
        />
      )}
      {showCheckOut && (
        <CheckOutModal
          unitBooking={showCheckOut}
          order={order}
          locationId={locationId}
          onClose={() => setShowCheckOut(null)}
          onSuccess={() => { setShowCheckOut(null); fetchData(); }}
        />
      )}
    </div>
  );
}