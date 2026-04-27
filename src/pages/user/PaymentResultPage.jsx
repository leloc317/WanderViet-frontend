import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/axios";

const fmtVND  = (n) => n ? `₫${Number(n).toLocaleString("en-US")}` : "—";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
const TYPE_LABEL = { hotel:"Hotel", restaurant:"Restaurant", entertainment:"Entertainment", tour:"Tour", tour_product:"Tour Package" };

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-xs font-medium text-gray-900 dark:text-white text-right max-w-[55%]">{value}</span>
    </div>
  );
}

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const [order, setOrder] = useState(null);

  const status    = searchParams.get("status");
  const bookingId = searchParams.get("bookingId");
  const code      = searchParams.get("code");
  const isSuccess = status === "success";

  useEffect(() => {
    if (bookingId) {
      api.get(`/bookings/${bookingId}/detail`)
        .then(r => setOrder(r.data.data))
        .catch(() => {});
    }
  }, [bookingId]);

  // Extract booking details based on type
  const getDetails = () => {
    if (!order) return null;
    const t = order.bookingType;
    const d = order[`${t}Details`] || order.tourProductDetails;
    if (!d) return null;

    const rows = [];
    if (t === "hotel") {
      if (d.checkIn)  rows.push({ label:"Check-in",  value: d.checkIn });
      if (d.checkOut) rows.push({ label:"Check-out", value: d.checkOut });
      if (d.nights)   rows.push({ label:"Duration",  value: `${d.nights} night${d.nights>1?"s":""}` });
      if (d.roomType) rows.push({ label:"Room",      value: d.roomType });
      if (d.adults)   rows.push({ label:"Guests",    value: `${d.adults} adult${d.adults>1?"s":""}${d.children>0?`, ${d.children} children`:""}` });
    } else if (t === "restaurant") {
      if (d.date)       rows.push({ label:"Date",       value: d.date });
      if (d.time)       rows.push({ label:"Time",       value: d.time });
      if (d.partySize)  rows.push({ label:"Party size", value: `${d.partySize} people` });
    } else if (t === "entertainment") {
      if (d.date)       rows.push({ label:"Date",       value: d.date });
      if (d.time)       rows.push({ label:"Time",       value: d.time });
      if (d.quantity)   rows.push({ label:"Tickets",    value: `${d.quantity}× ${d.ticketType || "Standard"}` });
    } else if (t === "tour_product") {
      if (d.departureDate) rows.push({ label:"Departure", value: fmtDate(d.departureDate) });
      if (d.adults)        rows.push({ label:"Guests",    value: `${d.adults} adult${d.adults>1?"s":""}${d.children>0?`, ${d.children} children`:""}` });
    }
    return rows;
  };

  const details = getDetails();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border
                      border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden">

        {isSuccess ? (
          <>
            {/* Success header */}
            <div className="bg-emerald-50 dark:bg-emerald-500/10 px-6 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full
                              flex items-center justify-center mx-auto mb-4 text-3xl">
                ✅
              </div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                Booking Confirmed!
              </h1>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                A confirmation email has been sent to you.
              </p>
            </div>

            {/* Booking info */}
            <div className="px-6 py-5">
              {order && (
                <>
                  {/* Location / service */}
                  <div className="flex items-center gap-3 mb-4">
                    {(() => {
                      const loc = order.location;
                      const img = loc?.images?.find(i=>i.isPrimary)?.url || loc?.images?.[0]?.url;
                      return img ? (
                        <img src={img} alt={loc?.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"/>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-500/20
                                        flex items-center justify-center text-2xl shrink-0">
                          🏨
                        </div>
                      );
                    })()}
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {order.location?.name
                          || order.tourProductDetails?.tourProduct?.title
                          || "Booking confirmed"}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {order.location?.address?.city || TYPE_LABEL[order.bookingType] || ""}
                      </p>
                    </div>
                  </div>

                  {/* Booking details */}
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 mb-4">
                    <InfoRow label="Booking ID"
                      value={`#${order._id?.slice(-8).toUpperCase()}`}/>
                    <InfoRow label="Status"
                      value={order.status === "confirmed" ? "✅ Confirmed" : `⏳ ${order.status}`}/>
                    {details?.map((r, i) => <InfoRow key={i} label={r.label} value={r.value}/>)}
                    {order.totalAmount > 0 && (
                      <InfoRow label="Total paid"
                        value={<span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {fmtVND(order.totalAmount)}
                        </span>}/>
                    )}
                  </div>

                  {/* Address */}
                  {order.location?.address?.full && (
                    <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400 mb-4">
                      <span className="shrink-0">📍</span>
                      <span>{order.location.address.full}</span>
                    </div>
                  )}

                  {/* Contact note */}
                  {order.companyNote && (
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200
                                    dark:border-blue-500/20 rounded-xl px-3 py-2 mb-4">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        💬 <strong>Note from host:</strong> {order.companyNote}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => navigate("/profile/bookings")}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white
                             rounded-xl text-sm font-bold transition-colors">
                  My Bookings
                </button>
                <button onClick={() => navigate("/explore")}
                  className="flex-1 py-3 border border-gray-200 dark:border-slate-700
                             text-gray-600 dark:text-slate-400 rounded-xl text-sm
                             font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  Explore
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Failed header */}
            <div className="bg-red-50 dark:bg-red-500/10 px-6 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full
                              flex items-center justify-center mx-auto mb-4 text-3xl">
                {status === "failed" ? "❌" : "⚠️"}
              </div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                {status === "failed" ? "Payment Failed" : "Something went wrong"}
              </h1>
              <p className="text-sm text-red-600 dark:text-red-400">
                {status === "failed"
                  ? "Your payment was not completed. You have not been charged."
                  : "There was an issue processing your payment."}
              </p>
              {code && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Error code: {code}
                </p>
              )}
            </div>

            <div className="px-6 py-5 flex gap-2">
              {bookingId && (
                <button onClick={() => navigate(`/booking/payment/${bookingId}`)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white
                             rounded-xl text-sm font-bold transition-colors">
                  Try Again
                </button>
              )}
              <button onClick={() => navigate("/profile/bookings")}
                className="flex-1 py-3 border border-gray-200 dark:border-slate-700
                           text-gray-600 dark:text-slate-400 rounded-xl text-sm
                           font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                My Bookings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}