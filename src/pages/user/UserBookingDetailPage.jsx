import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import useSocket from "../../hooks/useSocket";

const fmtDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "—";
const fmtVND  = (n) => n ? `₫${Number(n).toLocaleString("vi-VN")}` : null;

const STATUS_CONFIG = {
  pending:               { label:"Pending Confirmation", color:"text-amber-600 dark:text-amber-400",   bg:"bg-amber-50 dark:bg-amber-400/10",   icon:"⏳" },
  holding:               { label:"Awaiting Payment",     color:"text-yellow-600 dark:text-yellow-400", bg:"bg-yellow-50 dark:bg-yellow-400/10", icon:"💳" },
  confirmed:             { label:"Confirmed",             color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-400/10", icon:"✅" },
  checked_in:            { label:"Checked In",            color:"text-blue-600 dark:text-blue-400",     bg:"bg-blue-50 dark:bg-blue-400/10",     icon:"🏨" },
  partially_checked_out: { label:"Partial Checkout",      color:"text-purple-600 dark:text-purple-400", bg:"bg-purple-50 dark:bg-purple-400/10", icon:"🔄" },
  completed:             { label:"Completed",              color:"text-gray-600 dark:text-slate-300",    bg:"bg-gray-50 dark:bg-slate-800",       icon:"🏁" },
  cancelled:             { label:"Cancelled",              color:"text-gray-500 dark:text-slate-400",    bg:"bg-gray-50 dark:bg-slate-800",       icon:"❌" },
  no_show:               { label:"No Show",                color:"text-red-600 dark:text-red-400",       bg:"bg-red-50 dark:bg-red-400/10",       icon:"🚫" },
  rejected:              { label:"Rejected",               color:"text-red-600 dark:text-red-400",       bg:"bg-red-50 dark:bg-red-400/10",       icon:"✕"  },
};

const TOUR_STATUS_CONFIG = {
  booked:    { label:"Awaiting Departure", color:"text-blue-600 dark:text-blue-400",      bg:"bg-blue-50 dark:bg-blue-400/10",      icon:"🗓️" },
  ongoing:   { label:"Đang diễn ra",  color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-400/10", icon:"🚀" },
  completed: { label:"Tour hoàn thành", color:"text-gray-600 dark:text-slate-300",   bg:"bg-gray-50 dark:bg-slate-800",        icon:"🏆" },
  failed:    { label:"Tour gặp sự cố", color:"text-red-600 dark:text-red-400",       bg:"bg-red-50 dark:bg-red-400/10",        icon:"⚠️" },
};

const TYPE_ICON = { restaurant:"🍽️", hotel:"🏨", entertainment:"🎡", tour:"🗺️", tour_product:"🗺️" };

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function UserBookingDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Countdown cho holding
  const [secsLeft, setSecsLeft] = useState(null);
  useEffect(() => {
    if (!order || order.status !== "holding" || !order.heldUntil) return;
    const calc = () => Math.max(0, Math.floor((new Date(order.heldUntil) - Date.now()) / 1000));
    setSecsLeft(calc());
    const timer = setInterval(() => setSecsLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [order]);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/bookings/${id}/detail`);
      setOrder(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Real-time: booking status changed
  useSocket("booking:status", useCallback(({ orderId, status }) => {
    if (orderId?.toString() === id) {
      setOrder(prev => prev ? { ...prev, status } : prev);
    }
  }, [id]));

  // Real-time: payment success — refetch to get latest
  useSocket("payment:success", useCallback(({ bookingId }) => {
    if (bookingId?.toString() === id) fetchOrder();
  }, [id, fetchOrder]));

  const handleCancel = async () => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      fetchOrder();
    } catch(e) { alert(e.response?.data?.message || "Error"); }
    finally { setCancelling(false); }
  };

  const fmtCountdown = (s) => {
    if (s === null || s === undefined) return null;
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2,"0")}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-3xl mb-3">🔍</p>
        <p className="text-gray-500 dark:text-slate-400">Booking not found</p>
        <button onClick={() => navigate("/profile/bookings")} className="mt-3 text-blue-600 text-sm hover:underline">← Back to bookings</button>
      </div>
    </div>
  );

  const sc     = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const ts     = order.tourStatus ? TOUR_STATUS_CONFIG[order.tourStatus] : null;
  const t      = order.bookingType;
  const d      = (t === "tour_product" ? order.tourProductDetails : order[`${t}Details`]) ?? {};
  const loc    = order.location;
  const img    = loc?.images?.find(i => i.isPrimary)?.url || loc?.images?.[0]?.url
              || order.tourProductDetails?.tourProduct?.coverImage?.url;
  const canCancel = ["pending","holding","confirmed"].includes(order.status)
    && !["ongoing","completed"].includes(order.tourStatus);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Floating back button */}
      <div className="max-w-lg mx-auto px-5 pt-5">
        <button onClick={() => navigate("/profile/bookings")}
          className="inline-flex items-center gap-1.5 text-xs font-medium
                     text-gray-500 dark:text-slate-400
                     bg-white dark:bg-slate-800
                     border border-gray-200 dark:border-slate-700
                     px-3 py-1.5 rounded-full shadow-sm
                     hover:text-blue-600 dark:hover:text-blue-400
                     hover:border-blue-300 dark:hover:border-blue-500
                     transition-all">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
          </svg>
          My Bookings
        </button>
      </div>

      <div className="max-w-lg mx-auto px-5 py-4 space-y-4">

        {/* Status banner */}
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 ${sc.bg}`}>
          <span className="text-2xl">{sc.icon}</span>
          <div>
            <p className={`font-bold ${sc.color}`}>{sc.label}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">
              #{id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Tour lifecycle badge — chỉ hiện với tour_product */}
        {ts && (
          <div className={`rounded-2xl px-5 py-3 flex items-center gap-3 ${ts.bg}`}>
            <span className="text-xl">{ts.icon}</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${ts.color}`}>{ts.label}</p>
              {order.tourStartedAt && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Bắt đầu: {fmtDate(order.tourStartedAt)}
                </p>
              )}
              {order.tourCompletedAt && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Hoàn thành: {fmtDate(order.tourCompletedAt)}
                </p>
              )}
              {order.tourStatus === "failed" && order.tourFailReason && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                  Lý do: {order.tourFailReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Payment countdown */}
        {order.status === "holding" && secsLeft !== null && secsLeft > 0 && (
          <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Payment required</p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                  Expires in <strong>{fmtCountdown(secsLeft)}</strong>
                </p>
              </div>
              <button onClick={() => navigate(`/booking/payment/${id}`)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold">
                Pay Now →
              </button>
            </div>
          </div>
        )}
        {order.status === "holding" && secsLeft === 0 && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">⏰ Payment window expired. This booking will be cancelled shortly.</p>
          </div>
        )}

        {/* Location / Tour product header */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {/* Cover image or gradient fallback */}
          {img
            ? <img src={img} alt={loc?.name} className="w-full h-44 object-cover"/>
            : t === "tour_product"
              ? (
                <div className="w-full h-44 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
                               flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                  {/* Decorative circles */}
                  <div className="absolute w-40 h-40 rounded-full bg-white/5 -top-10 -right-10"/>
                  <div className="absolute w-24 h-24 rounded-full bg-white/5 bottom-4 left-4"/>
                  <span className="text-5xl relative z-10">🗺️</span>
                  <p className="text-white font-bold text-base text-center px-6 relative z-10 line-clamp-2 drop-shadow">
                    {order.tourProductDetails?.tourProduct?.title
                     || d?.tourProduct?.title
                     || "Tour Package"}
                  </p>
                </div>
              )
              : null
          }
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{TYPE_ICON[t]}</span>
              <p className="font-bold text-gray-900 dark:text-white">
                {t === "tour_product"
                  ? (order.tourProductDetails?.tourProduct?.title
                     || d?.tourProduct?.title
                     || "Tour Package")
                  : loc?.name}
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {t === "tour_product"
                ? `🏢 ${order.company?.name ?? ""}`
                : `📍 ${loc?.address?.city || loc?.address?.full || ""}`}
            </p>
          </div>
        </div>

        {/* Booking details */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            {t === "tour_product" ? "Tour Details"
             : t === "hotel" ? "Room Booking Details"
             : t === "restaurant" ? "Table Booking Details"
             : t === "entertainment" ? "Ticket Details"
             : "Booking Details"}
          </p>
          {t === "restaurant" && <>
            <InfoRow label="Date & Time" value={`${d.date} at ${d.time}`}/>
            <InfoRow label="Party size"  value={`${d.partySize} people`}/>
            <InfoRow label="Seating"     value={d.seatingPref !== "no_preference" ? d.seatingPref : null}/>
            <InfoRow label="Special req" value={d.specialReq}/>
          </>}
          {t === "hotel" && <>
            <InfoRow label="Check-in"   value={d.checkIn}/>
            <InfoRow label="Check-out"  value={d.checkOut}/>
            <InfoRow label="Duration"   value={d.nights ? `${d.nights} night${d.nights > 1 ? "s" : ""}` : null}/>
            <InfoRow label="Rooms"      value={d.rooms ? `${d.rooms} room${d.rooms > 1 ? "s" : ""}` : null}/>
            <InfoRow label="Guests"     value={`${d.adults ?? 1} adults, ${d.children ?? 0} children`}/>
            <InfoRow label="Room type"  value={d.roomType}/>
            <InfoRow label="Special req" value={d.specialReq}/>
          </>}
          {t === "entertainment" && <>
            <InfoRow label="Date"     value={`${d.date} ${d.time}`}/>
            <InfoRow label="Tickets"  value={`${d.quantity}× ${d.ticketType || "Standard"}`}/>
            <InfoRow label="Special" value={d.specialReq}/>
          </>}
          {t === "tour" && <>
            <InfoRow label="Departure" value={d.date}/>
            <InfoRow label="Group"     value={`${d.adults} adults, ${d.children} children`}/>
            <InfoRow label="Type"      value={d.groupType?.replace(/_/g," ")}/>
            <InfoRow label="Special"  value={d.specialReq}/>
          </>}
          {t === "tour_product" && <>
            <InfoRow label="Departure"
              value={d.departureDate ? new Date(d.departureDate).toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}) : null}/>
            <InfoRow label="Return"
              value={d.returnDate ? new Date(d.returnDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : null}/>
            <InfoRow label="Guests"     value={`${d.adults ?? 1} adult${(d.adults ?? 1) !== 1 ? "s" : ""}, ${d.children ?? 0} child`}/>
            <InfoRow label="Price/person" value={d.pricePerPerson ? `₫${Number(d.pricePerPerson).toLocaleString("vi-VN")}` : null}/>
            <InfoRow label="Total" value={d.totalPrice ? `₫${Number(d.totalPrice).toLocaleString("vi-VN")}` : null}/>
            <InfoRow label="Special req."   value={d.specialReq}/>
          </>}
          {t === "tour_product" && d.meetingPoint?.address && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-1.5">📍 Meeting Point</p>
              <p className="text-sm text-gray-700 dark:text-slate-300">{d.meetingPoint.address}</p>
              {d.meetingPoint.note && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{d.meetingPoint.note}</p>}
            </div>
          )}
          {t === "tour_product" && d.includes?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">✅ Included</p>
              <ul className="space-y-0.5">
                {(Array.isArray(d.includes) ? d.includes : []).map((item, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-slate-300">· {item}</li>
                ))}
              </ul>
            </div>
          )}
          {order.userNote && <InfoRow label="Your note" value={order.userNote}/>}
        </div>

        {/* Contact info */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Contact</p>
          <InfoRow label="Name"   value={order.contactName}/>
          <InfoRow label="Phone"  value={order.contactPhone}/>
          <InfoRow label="Email"  value={order.contactEmail}/>
        </div>

        {/* Company note / rejection reason */}
        {order.companyNote && (
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Message from venue</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">"{order.companyNote}"</p>
          </div>
        )}
        {order.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Rejection reason</p>
            <p className="text-sm text-red-600 dark:text-red-300">{order.rejectionReason}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Timeline</p>
          <InfoRow label="Booked"    value={fmtDate(order.createdAt)}/>
          {order.confirmedAt && <InfoRow label="Confirmed" value={fmtDate(order.confirmedAt)}/>}
        </div>

        {/* Cancel button */}
        {canCancel && (
          <button onClick={handleCancel} disabled={cancelling}
            className="w-full py-3.5 rounded-2xl border border-red-200 dark:border-red-500/30
                       text-red-600 dark:text-red-400 font-medium text-sm
                       hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50">
            {cancelling ? "Cancelling..." : "Cancel Booking"}
          </button>
        )}
      </div>
    </div>
  );
}