import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";
import AssignUnitsModal from "../../components/modals/AssignUnitsModal";
import CheckInModal     from "../../components/modals/CheckInModal";
import CheckOutModal    from "../../components/modals/CheckOutModal";

const fmtVND = (n) => `₫${Number(n ?? 0).toLocaleString("vi-VN")}`;

const STATUS_META = {
  holding:               { label:"Holding",          color:"text-yellow-600 dark:text-yellow-400",   bg:"bg-yellow-50 dark:bg-yellow-400/10" },
  confirmed:             { label:"Confirmed",         color:"text-blue-600 dark:text-blue-400",       bg:"bg-blue-50 dark:bg-blue-400/10" },
  checked_in:            { label:"Checked in",        color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-400/10" },
  partially_checked_out: { label:"Partial checkout",  color:"text-purple-600 dark:text-purple-400",   bg:"bg-purple-50 dark:bg-purple-400/10" },
  checked_out:           { label:"Checked out",       color:"text-orange-600 dark:text-orange-400",   bg:"bg-orange-50 dark:bg-orange-400/10" },
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

// ── Finalize Bill Modal ─────────────────────────────────────────────────────
function FinalizeBillModal({ order, unitBookings, onClose, onSuccess }) {
  const [loading,   setLoading]   = useState(false);
  const [preview,   setPreview]   = useState(null);
  const [fetching,  setFetching]  = useState(true);
  const [error,     setError]     = useState("");

  // Fetch preview from backend
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const { data } = await api.get(`/bookings/${order._id}/finalize-preview`);
        setPreview(data.data);
      } catch (e) {
        // Fallback: calculate client-side
        const h = order.hotelDetails;
        const basePrice = h?.totalPrice
          || (h?.pricePerUnit * (h?.nights ?? 1) * (h?.rooms ?? 1))
          || 0;

        const extrasByRoom = unitBookings.map(ub => ({
          roomNumber: ub.unit?.unitNumber ?? "Room",
          extras: ub.extraCharges ?? [],
          subtotal: (ub.extraCharges ?? []).reduce((s, e) =>
            s + (Number(e.totalPrice) || Number(e.amount) || 0), 0),
        }));

        const totalExtras = extrasByRoom.reduce((s, r) => s + r.subtotal, 0);
        const deposit     = order.deposit?.amount || 0;
        const remaining   = Math.max(0, basePrice + totalExtras - deposit);

        setPreview({ basePrice, extrasByRoom, totalExtras, totalPaid: deposit, remaining, totalBill: basePrice + totalExtras });
      } finally {
        setFetching(false);
      }
    };
    fetchPreview();
  }, [order._id]);

  const handleFinalize = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.post(`/bookings/${order._id}/finalize`);
      onSuccess(data.data);
    } catch (e) {
      setError(e.response?.data?.message ?? "Finalize failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                    p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl
                      max-h-[90vh] flex flex-col border dark:border-slate-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b
                        border-gray-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Finalize Bill</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {order.contactName} · #{order._id.slice(-8).toUpperCase()}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {fetching ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-200 dark:bg-slate-800 rounded-xl"/>)}
            </div>
          ) : preview ? (
            <>
              {/* Base price */}
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Base amount</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {fmtVND(preview.basePrice)}
                  </span>
                </div>
                {order.hotelDetails && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {order.hotelDetails.checkIn} → {order.hotelDetails.checkOut}
                    · {order.hotelDetails.rooms ?? 1} room(s)
                    · {order.hotelDetails.nights ?? 1} night(s)
                  </p>
                )}
              </div>

              {/* Extras per room */}
              {preview.extrasByRoom?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    Extra Charges by Room
                  </p>
                  {preview.extrasByRoom.map((room, i) => (
                    <div key={i} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2
                                      bg-gray-50 dark:bg-slate-800">
                        <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                          🛏️ Room {room.roomNumber}
                        </span>
                        <span className={`text-xs font-bold ${room.subtotal > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`}>
                          {room.subtotal > 0 ? `+${fmtVND(room.subtotal)}` : "No extras"}
                        </span>
                      </div>
                      {room.extras?.length > 0 && (
                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
                          {room.extras.map((e, j) => (
                            <div key={j} className="flex justify-between items-center px-3 py-2">
                              <span className="text-xs text-gray-600 dark:text-slate-400">
                                {e.label || e.name || "Extra"}
                                {e.quantity > 1 && ` ×${e.quantity}`}
                              </span>
                              <span className="text-xs font-medium text-gray-900 dark:text-white">
                                {fmtVND(Number(e.totalPrice) || Number(e.amount) || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Base amount</span>
                    <span className="text-sm text-gray-900 dark:text-white">{fmtVND(preview.basePrice)}</span>
                  </div>
                  {preview.totalExtras > 0 && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-gray-600 dark:text-slate-400">Total extras</span>
                      <span className="text-sm text-orange-600 dark:text-orange-400">+{fmtVND(preview.totalExtras)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Already paid (deposit)</span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">−{fmtVND(preview.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Remaining balance</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {fmtVND(preview.remaining)}
                    </span>
                  </div>
                </div>
              </div>

              {preview.remaining === 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200
                                dark:border-emerald-500/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    ✅ Fully paid — will complete immediately
                  </p>
                </div>
              )}

              {preview.remaining > 0 && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200
                                dark:border-blue-500/30 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">
                    💳 Payment link will be sent to guest
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Guest will receive a VNPay payment link for {fmtVND(preview.remaining)}.
                    Order completes once payment is confirmed.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">Could not load bill preview</p>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200
                            dark:border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl
                       text-sm font-medium text-gray-600 dark:text-slate-400
                       hover:bg-gray-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={handleFinalize} disabled={loading || fetching}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                       text-sm font-semibold transition-colors disabled:opacity-50">
            {loading ? "Processing..." : "Confirm & Finalize"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function StaffOrderDetailPage() {
  const { id: orderId } = useParams();
  const navigate        = useNavigate();
  const { user: authUser } = useAuth();

  const locationId = authUser?.staffInfo?.location?._id ?? authUser?.staffInfo?.location;

  const [order,          setOrder]          = useState(null);
  const [unitBookings,   setUnitBookings]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showAssign,     setShowAssign]     = useState(false);
  const [showCheckIn,    setShowCheckIn]    = useState(null);
  const [showCheckOut,   setShowCheckOut]   = useState(null);
  const [showFinalize,   setShowFinalize]   = useState(false);
  const [finalizeResult, setFinalizeResult] = useState(null);

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

  // Check if all rooms are checked out → show Finalize button
  // Show Finalize when ALL rooms are checked_out regardless of order status
  // (backend sets order to partially_checked_out or checked_in during the process)
  const allRoomsCheckedOut = isHotel
    && unitBookings.length > 0
    && unitBookings.every(ub => ub.status === "checked_out")
    && order.status !== "cancelled";

  // Debug: log current state
  console.log("[StaffOrder] status:", order.status,
    "| units:", unitBookings.map(u => u.status),
    "| allOut:", allRoomsCheckedOut);

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

      {/* Finalize Bill Banner — shows when all rooms checked out */}
      {allRoomsCheckedOut && !finalizeResult && (
        <div className="bg-blue-600 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white text-sm">All rooms checked out ✓</p>
            <p className="text-blue-200 text-xs mt-0.5">Ready to finalize bill and complete order</p>
          </div>
          <button onClick={() => setShowFinalize(true)}
            className="shrink-0 bg-white text-blue-600 text-sm font-semibold
                       px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
            Finalize Bill
          </button>
        </div>
      )}

      {/* Finalize result — show after success */}
      {finalizeResult && (
        <div className={`rounded-2xl p-4 mb-4 ${
          finalizeResult.paymentRequired
            ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30"
            : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
        }`}>
          {finalizeResult.paymentRequired ? (
            <>
              <p className="font-semibold text-amber-800 dark:text-amber-400 text-sm mb-1">
                💳 Payment link sent to guest
              </p>
              <p className="text-amber-700 dark:text-amber-400 text-xs">
                Remaining: <strong>{fmtVND(finalizeResult.remaining)}</strong> · Guest will pay via VNPay
              </p>
            </>
          ) : (
            <p className="font-semibold text-emerald-800 dark:text-emerald-400 text-sm">
              ✅ Order completed — fully paid
            </p>
          )}
        </div>
      )}

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
                const ubExtras = (ub.extraCharges ?? []).reduce((s, e) =>
                  s + (Number(e.totalPrice) || Number(e.amount) || 0), 0);
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${um.color}`}>{um.label}</span>
                        {ub.checkInAt && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">
                            · In: {new Date(ub.checkInAt).toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit" })}
                          </span>
                        )}
                        {ubExtras > 0 && ub.status === "checked_out" && (
                          <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                            · Extra: +{fmtVND(ubExtras)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {ub.status === "pending" && ["confirmed","checked_in","partially_checked_out"].includes(order.status) && (
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
                      {ub.status === "checked_out" && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Done</span>
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
          order={order} locationId={locationId}
          onClose={() => setShowAssign(false)}
          onSuccess={() => { setShowAssign(false); fetchData(); }}
        />
      )}
      {showCheckIn && (
        <CheckInModal
          unitBooking={showCheckIn} order={order}
          onClose={() => setShowCheckIn(null)}
          onSuccess={() => { setShowCheckIn(null); fetchData(); }}
        />
      )}
      {showCheckOut && (
        <CheckOutModal
          unitBooking={showCheckOut} order={order} locationId={locationId}
          onClose={() => setShowCheckOut(null)}
          onSuccess={() => { setShowCheckOut(null); fetchData(); }}
        />
      )}
      {showFinalize && (
        <FinalizeBillModal
          order={order} unitBookings={unitBookings}
          onClose={() => setShowFinalize(false)}
          onSuccess={(result) => {
            setShowFinalize(false);
            setFinalizeResult(result);
            fetchData();
          }}
        />
      )}
    </div>
  );
}