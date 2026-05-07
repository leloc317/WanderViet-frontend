import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";

const fmtVND      = (n) => n ? `₫${Number(n).toLocaleString("vi-VN")}` : "—";
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { weekday:"long", day:"2-digit", month:"2-digit", year:"numeric" }) : "—";
const fmtShort    = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("vi-VN") : "—";

const STATUS_META = {
  holding:   { label:"Waiting for payment", color:"text-yellow-600 dark:text-yellow-400", bg:"bg-yellow-50 dark:bg-yellow-400/10", icon:"💳" },
  pending:   { label:"Waiting for confirmation", color:"text-amber-600 dark:text-amber-400", bg:"bg-amber-50 dark:bg-amber-400/10", icon:"⏳" },
  confirmed: { label:"Confirmed", color:"text-blue-600 dark:text-blue-400", bg:"bg-blue-50 dark:bg-blue-400/10", icon:"✅" },
  completed: { label:"Completed", color:"text-gray-600 dark:text-slate-300", bg:"bg-gray-50 dark:bg-slate-800", icon:"🏁" },
  cancelled: { label:"Cancelled", color:"text-red-600 dark:text-red-400", bg:"bg-red-50 dark:bg-red-400/10", icon:"❌" },
  no_show:   { label:"No Show", color:"text-red-600 dark:text-red-400", bg:"bg-red-50 dark:bg-red-400/10", icon:"🚫" },
};

const TOUR_STATUS_META = {
  booked:    { label:"Booked · Waiting to start", color:"text-blue-600 dark:text-blue-400",     bg:"bg-blue-50 dark:bg-blue-400/10",     icon:"🗓️" },
  ongoing:   { label:"Ongoing",            color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-400/10", icon:"🚀" },
  completed: { label:"Tour Completed",         color:"text-gray-600 dark:text-slate-300",    bg:"bg-gray-50 dark:bg-slate-800",       icon:"🏆" },
  failed:    { label:"Tour Failed",           color:"text-red-600 dark:text-red-400",       bg:"bg-red-50 dark:bg-red-400/10",       icon:"⚠️" },
};

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right ml-4 max-w-[60%]">{value}</span>
    </div>
  );
}

export default function CompanyTourBookingDetailPage() {
  const { orderId } = useParams();
  const navigate    = useNavigate();

  const [order,         setOrder]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen,    setRejectOpen]    = useState(false);
  const [rejectReason,  setRejectReason]  = useState("");
  const [failOpen,      setFailOpen]      = useState(false);
  const [failReason,    setFailReason]    = useState("");
  const [toast,         setToast]         = useState("");

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/bookings/${orderId}/detail`);
      setOrder(data.data);
    } catch (e) { console.error(e); navigate(-1); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const doAction = async (endpoint, body = {}) => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${orderId}/${endpoint}`, body);
      await fetchOrder();
      showToast("✅ Action successful");
    } catch (e) { showToast(e.response?.data?.message || "Action failed"); }
    finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
    </div>
  );
  if (!order) return null;

  const sc  = STATUS_META[order.status] ?? STATUS_META.pending;
  const ts  = order.tourStatus ? TOUR_STATUS_META[order.tourStatus] : null;
  const d   = order.tourProductDetails ?? {};
  const tp  = d.tourProduct;
  const dep = d.departure;
  const img = tp?.coverImage?.url;

  // Có thể bắt đầu tour khi trong vòng 24h trước departureDate
  const depDate      = dep?.departureDate ? new Date(dep.departureDate) : null;
  const hoursUntilDep = depDate ? (depDate - Date.now()) / (1000 * 60 * 60) : null;
  const canStartTour  = order.tourStatus === "booked" && hoursUntilDep !== null && hoursUntilDep <= 24 && hoursUntilDep > -72;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white">←</button>
          <h1 className="font-bold text-gray-900 dark:text-white flex-1">Tour Booking Detail</h1>
          <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
            #{orderId?.slice(-8).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">

        {/* Status */}
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 ${sc.bg}`}>
          <span className="text-3xl">{sc.icon}</span>
          <div>
            <p className={`font-bold text-lg ${sc.color}`}>{sc.label}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{fmtDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Tour lifecycle status — chỉ hiện khi là tour_product */}
        {ts && (
          <div className={`rounded-2xl px-5 py-3 flex items-center gap-3 ${ts.bg}`}>
            <span className="text-2xl">{ts.icon}</span>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${ts.color}`}>{ts.label}</p>
              {order.tourStartedAt && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Start: {fmtDateTime(order.tourStartedAt)}
                </p>
              )}
              {order.tourCompletedAt && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Completed: {fmtDateTime(order.tourCompletedAt)}
                </p>
              )}
              {order.tourStatus === "booked" && hoursUntilDep !== null && hoursUntilDep > 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Remaining: {Math.round(hoursUntilDep)}h until departure
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tour product */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {img
            ? <img src={img} alt="" className="w-full h-36 object-cover"/>
            : <div className="h-28 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <span className="text-5xl opacity-30">🗺️</span>
              </div>
          }
          <div className="p-4">
            <p className="font-bold text-gray-900 dark:text-white text-base">{tp?.title ?? "Tour Product"}</p>
            {tp?.duration && (
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                🗓️ {tp.duration.days} days {tp.duration.nights} nights
              </p>
            )}
          </div>
        </div>

        {/* Departure */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Departure Schedule
          </p>
          <InfoRow label="Departure" value={fmtDate(dep?.departureDate ?? d.departureDate)}/>
          <InfoRow label="Return"        value={fmtShort(dep?.returnDate ?? d.returnDate)}/>
          {dep && <InfoRow label="Slot Status" value={`${dep.bookedSlots ?? 0}/${dep.maxSlots ?? 0} booked`}/>}
        </div>

        {/* Booking details */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Booking Details
          </p>
          <InfoRow label="Adults"  value={`${d.adults ?? 1} people`}/>
          {(d.children ?? 0) > 0 && <InfoRow label="Children" value={`${d.children} people`}/>}
          <InfoRow label="Total Guests" value={`${(d.adults ?? 1) + (d.children ?? 0)} people`}/>
          <InfoRow label="Price/Person"  value={fmtVND(d.pricePerPerson)}/>
          {(d.children ?? 0) > 0 && d.childPrice > 0 && (
            <InfoRow label="Child Price" value={fmtVND(d.childPrice)}/>
          )}
          <div className="flex justify-between py-2.5 border-t border-gray-200 dark:border-slate-700 mt-1">
            <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Total Price</span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400">{fmtVND(d.totalPrice)}</span>
          </div>
          {d.specialReq && <InfoRow label="Special Request" value={d.specialReq}/>}
        </div>

        {/* Meeting point */}
        {(tp?.meetingPoint?.address || d.meetingPoint?.address) && (
          <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-2xl p-4">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">📍 Meeting Point</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {(tp?.meetingPoint ?? d.meetingPoint)?.address}
            </p>
            {(tp?.meetingPoint ?? d.meetingPoint)?.note && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                {(tp?.meetingPoint ?? d.meetingPoint).note}
              </p>
            )}
          </div>
        )}

        {/* Includes */}
        {(Array.isArray(tp?.includes) ? tp.includes : Array.isArray(d?.includes) ? d.includes : []).length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">✅ Includes</p>
            <ul className="space-y-1">
              {(Array.isArray(tp?.includes) ? tp.includes : Array.isArray(d?.includes) ? d.includes : []).map((item, i) => (
                <li key={i} className="text-sm text-emerald-700 dark:text-emerald-400">· {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Contact Information
          </p>
          <InfoRow label="Name"    value={order.contactName}/>
          <InfoRow label="Phone"    value={order.contactPhone}/>
          <InfoRow label="Email"  value={order.contactEmail}/>
          {order.user && (
            <div className="flex justify-between py-2.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
              <span className="text-sm text-gray-500 dark:text-slate-400">Booking score</span>
              <span className={`text-sm font-semibold
                ${(order.user.bookingScore ?? 100) >= 80 ? "text-emerald-600 dark:text-emerald-400"
                : (order.user.bookingScore ?? 100) >= 50 ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"}`}>
                {order.user.bookingScore ?? 100} / 100
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {order.userNote && (
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">User Note</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">"{order.userNote}"</p>
          </div>
        )}
        {order.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Rejection Reason</p>
            <p className="text-sm text-red-600 dark:text-red-300">{order.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        {order.status === "pending" && (
          <div className="flex gap-2">
            <button onClick={() => doAction("confirm")} disabled={actionLoading}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl
                         text-sm font-bold transition-colors disabled:opacity-50">
              ✅ Confirm Booking
            </button>
            <button onClick={() => setRejectOpen(true)} disabled={actionLoading}
              className="flex-1 py-3.5 border border-red-200 dark:border-red-500/30 text-red-600
                         dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50
                         dark:hover:bg-red-500/10 transition-colors disabled:opacity-50">
              ❌ Reject Booking
            </button>
          </div>
        )}

        {/* Tour product lifecycle actions — thay thế block confirmed cũ */}
        {order.bookingType === "tour_product" ? (
          <>
            {/* Booked — chờ khởi hành, chưa đến giờ */}
            {order.tourStatus === "booked" && !canStartTour && (
              <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30
                              bg-blue-50 dark:bg-blue-500/10 px-5 py-4 text-center">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  🗓️ Tour will start on{" "}
                  {depDate ? ` ${depDate.toLocaleDateString("vi-VN")}` : ""}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  The "Start Tour" button will appear within 24 hours of the departure time
                </p>
              </div>
            )}

            {/* Booked — đã đến giờ, có thể bắt đầu */}
            {order.tourStatus === "booked" && canStartTour && (
              <div className="flex gap-2">
                <button onClick={() => doAction("start-tour")} disabled={actionLoading}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl
                             text-sm font-bold transition-colors disabled:opacity-50">
                  🚀 Start Tour
                </button>
                <button onClick={() => setFailOpen(true)} disabled={actionLoading}
                  className="py-3.5 px-4 border border-red-200 dark:border-red-500/30 text-red-600
                             dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50
                             dark:hover:bg-red-500/10 transition-colors disabled:opacity-50">
                  ⚠️ Report Issue
                </button>
              </div>
            )}

            {/* Ongoing — đang diễn ra */}
            {order.tourStatus === "ongoing" && (
              <div className="flex gap-2">
                <button onClick={() => doAction("complete-tour")} disabled={actionLoading}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                             text-sm font-bold transition-colors disabled:opacity-50">
                  🏆 Complete Tour
                </button>
                <button onClick={() => setFailOpen(true)} disabled={actionLoading}
                  className="py-3.5 px-4 border border-red-200 dark:border-red-500/30 text-red-600
                             dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50
                             dark:hover:bg-red-500/10 transition-colors disabled:opacity-50">
                  ⚠️ Report Issue
                </button>
              </div>
            )}

            {/* Completed — readonly */}
            {order.tourStatus === "completed" && (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700
                              bg-gray-50 dark:bg-slate-800 px-5 py-4 text-center">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  🏆 Tour has been completed successfully
                </p>
              </div>
            )}

            {/* Failed */}
            {order.tourStatus === "failed" && (
              <div className="rounded-2xl border border-red-200 dark:border-red-500/30
                              bg-red-50 dark:bg-red-500/10 px-5 py-4">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                  ⚠️ Tour has encountered an issue and is marked as failed
                </p>
                <p className="text-sm text-red-500 dark:text-red-400">
                  {order.tourFailReason}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Non-tour booking: giữ nguyên logic cũ */
          order.status === "confirmed" && (
            <div className="flex gap-2">
              <button onClick={() => doAction("complete")} disabled={actionLoading}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                           text-sm font-bold transition-colors disabled:opacity-50">
                🏁 Complete
              </button>
              <button onClick={() => doAction("no-show")} disabled={actionLoading}
                className="flex-1 py-3.5 border border-gray-200 dark:border-slate-700 text-gray-500
                           dark:text-slate-400 rounded-xl text-sm font-medium hover:bg-gray-50
                           dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                🚫 No Show
              </button>
            </div>
          )
        )}
      </div>

      {/* Reject modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectOpen(false)}/>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-gray-200
                          dark:border-slate-700 rounded-2xl shadow-2xl p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Rejection Reason</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              rows={3} placeholder="Enter reason for rejection..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-red-500/30 mb-4"/>
            <div className="flex gap-2">
              <button onClick={() => setRejectOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700
                           text-gray-600 dark:text-slate-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button onClick={() => { setRejectOpen(false); doAction("reject", { rejectionReason: rejectReason }); }}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white
                           text-sm font-medium disabled:opacity-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fail tour modal */}
      {failOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFailOpen(false)}/>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-gray-200
                          dark:border-slate-700 rounded-2xl shadow-2xl p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Report Tour Issue</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
              This action will mark the tour as failed and notify the customer.
            </p>
            <textarea value={failReason} onChange={e => setFailReason(e.target.value)}
              rows={3} placeholder="Describe the issue (e.g., vehicle breakdown, venue closure...)"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-red-500/30 mb-4"/>
            <div className="flex gap-2">
              <button onClick={() => { setFailOpen(false); setFailReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700
                           text-gray-600 dark:text-slate-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!failReason.trim()) return;
                  setFailOpen(false);
                  doAction("fail-tour", { reason: failReason });
                }}
                disabled={actionLoading || !failReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white
                           text-sm font-medium disabled:opacity-50">
                Confirm Report Issue
              </button>
            </div>
          </div>
        </div>
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