import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";
import AssignUnitsModal from "../../components/modals/AssignUnitsModal";
import CheckInModal      from "../../components/modals/CheckInModal";
import CheckOutModal     from "../../components/modals/CheckOutModal";

const STATUS_META = {
  holding:               { label:"Holding",          color:"text-yellow-600 dark:text-yellow-400",   bg:"bg-yellow-50 dark:bg-yellow-400/10" },
  confirmed:             { label:"Confirmed",         color:"text-blue-600 dark:text-blue-400",       bg:"bg-blue-50 dark:bg-blue-400/10" },
  checked_in:            { label:"Checked in",        color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-400/10" },
  partially_checked_out: { label:"Partial checkout",  color:"text-purple-600 dark:text-purple-400",   bg:"bg-purple-50 dark:bg-purple-400/10" },
  completed:             { label:"Completed",         color:"text-gray-600 dark:text-slate-300",      bg:"bg-gray-50 dark:bg-slate-800" },
  cancelled:             { label:"Cancelled",         color:"text-red-600 dark:text-red-400",         bg:"bg-red-50 dark:bg-red-400/10" },
};

const UNIT_META = {
  pending:     { label:"Pending",      dot:"bg-gray-400",    color:"text-gray-500 dark:text-slate-400" },
  checked_in:  { label:"Checked in",  dot:"bg-emerald-500", color:"text-emerald-600 dark:text-emerald-400" },
  checked_out: { label:"Checked out", dot:"bg-blue-500",    color:"text-blue-600 dark:text-blue-400" },
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

export default function StaffOrderDetailPage() {
  const { id: orderId } = useParams();
  const { user }        = useNavigate ? useAuth() : { user: null };
  const navigate        = useNavigate();
  const { user: authUser } = useAuth();

  const locationId = authUser?.staffInfo?.location?._id ?? authUser?.staffInfo?.location;

  const [order,        setOrder]        = useState(null);
  const [unitBookings, setUnitBookings] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showAssign,   setShowAssign]   = useState(false);
  const [showCheckIn,  setShowCheckIn]  = useState(null);
  const [showCheckOut, setShowCheckOut] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [orderRes, ubRes] = await Promise.all([
        api.get(`/bookings/${orderId}/detail`),
        api.get("/unit-bookings", { params: { orderId } }),
      ]);
      setOrder(orderRes.data.data);
      setUnitBookings(ubRes.data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
    </div>
  );

  if (!order) return (
    <div className="text-center py-20">
      <p className="text-3xl mb-3">🔍</p>
      <p className="text-gray-500 dark:text-slate-400">Order not found</p>
      <button onClick={() => navigate("/staff/bookings")} className="mt-3 text-sm text-blue-600 hover:underline">← Back</button>
    </div>
  );

  const meta    = STATUS_META[order.status] ?? { label: order.status, color: "text-gray-500", bg: "bg-gray-50" };
  const isHotel = order.bookingType === "hotel";
  const d       = order[`${order.bookingType}Details`] ?? {};

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/staff/bookings")}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{order.contactName}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
            #{orderId.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Guest info */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Guest</p>
        <InfoRow label="Name"  value={order.contactName} />
        <InfoRow label="Phone" value={order.contactPhone} />
        <InfoRow label="Email" value={order.contactEmail} />
        {order.userNote && <InfoRow label="Note" value={order.userNote} />}
      </div>

      {/* Booking details */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          {order.bookingType?.charAt(0).toUpperCase() + order.bookingType?.slice(1)} Details
        </p>
        {isHotel && <>
          <InfoRow label="Check-in"  value={d.checkIn} />
          <InfoRow label="Check-out" value={d.checkOut} />
          <InfoRow label="Rooms"     value={`${d.rooms ?? 1} × ${d.roomType ?? "standard"}`} />
          <InfoRow label="Guests"    value={`${d.adults ?? 1} adults, ${d.children ?? 0} children`} />
        </>}
        {order.bookingType === "restaurant" && <>
          <InfoRow label="Date"       value={`${d.date} ${d.time}`} />
          <InfoRow label="Party size" value={`${d.partySize} people`} />
          <InfoRow label="Seating"    value={d.seatingPref !== "no_preference" ? d.seatingPref : null} />
        </>}
        {order.bookingType === "entertainment" && <>
          <InfoRow label="Date"    value={`${d.date} ${d.time}`} />
          <InfoRow label="Tickets" value={`${d.quantity}× ${d.ticketType || "Standard"}`} />
        </>}
        {d.specialReq && <InfoRow label="Special req" value={d.specialReq} />}
      </div>

      {/* Assign button */}
      {isHotel && order.status === "confirmed" && (
        <div className="mb-4">
          {unitBookings.length === 0 ? (
            <button onClick={() => setShowAssign(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
              🛏️ Assign Rooms
            </button>
          ) : (
            <button onClick={() => setShowAssign(true)}
              className="w-full py-3 border border-gray-200 dark:border-slate-700 text-gray-600
                         dark:text-slate-400 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
              Re-assign Rooms
            </button>
          )}
        </div>
      )}

      {/* Unit Bookings */}
      {isHotel && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Rooms ({unitBookings.length})
            </p>
            <div className="flex items-center gap-2">
              {unitBookings.length > 0 && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {unitBookings.filter(u => u.status === "checked_out").length}/{unitBookings.length} checked out
                </span>
              )}
              {order.status === "confirmed" && unitBookings.every(u => u.status === "pending") && (
                <button onClick={() => setShowAssign(true)}
                  className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                  {unitBookings.length > 0 ? "Re-assign" : "Assign"}
                </button>
              )}
            </div>
          </div>

          {unitBookings.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">🛏️</p>
              <p className="text-sm text-gray-400 dark:text-slate-500">No rooms assigned yet</p>
              <button onClick={() => setShowAssign(true)}
                className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                + Assign rooms now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {unitBookings.map(ub => {
                const um = UNIT_META[ub.status] ?? UNIT_META.pending;
                return (
                  <div key={ub._id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${um.dot}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Room {ub.unit?.unitNumber}
                        <span className="ml-2 text-xs text-gray-500 dark:text-slate-400 capitalize">
                          {ub.unit?.roomType}
                        </span>
                        {ub.unit?.floor && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-slate-500">· Floor {ub.unit.floor}</span>
                        )}
                      </p>
                      <span className={`text-xs ${um.color}`}>{um.label}</span>
                      {ub.checkInAt && (
                        <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">
                          · In: {new Date(ub.checkInAt).toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit" })}
                        </span>
                      )}
                    </div>
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
                        <span className="text-xs text-red-500 font-medium">
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

      {/* Non-hotel check-in/out */}
      {!isHotel && ["confirmed","checked_in"].includes(order.status) && unitBookings.length > 0 && (
        <div className="flex gap-3 mb-4">
          {unitBookings[0]?.status === "pending" && (
            <button onClick={() => setShowCheckIn(unitBookings[0])}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
              ✓ Check-in Guest
            </button>
          )}
          {unitBookings[0]?.status === "checked_in" && (
            <button onClick={() => setShowCheckOut(unitBookings[0])}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
              Check-out Guest
            </button>
          )}
        </div>
      )}

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