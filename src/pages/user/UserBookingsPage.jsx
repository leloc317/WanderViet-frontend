import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", {
  month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit"
}) : "—";

const STATUS_CONFIG = {
  pending:               { label:"Pending",          color:"bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-400",       icon:"⏳" },
  holding:               { label:"Awaiting Payment", color:"bg-yellow-100 text-yellow-700 dark:bg-yellow-400/20 dark:text-yellow-400",   icon:"💳" },
  confirmed:             { label:"Confirmed",         color:"bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-400", icon:"✅" },
  checked_in:            { label:"Checked In",        color:"bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-400",           icon:"🏨" },
  partially_checked_out: { label:"Partial Checkout",  color:"bg-purple-100 text-purple-700 dark:bg-purple-400/20 dark:text-purple-400",   icon:"🔄" },
  completed:             { label:"Completed",          color:"bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",           icon:"🏁" },
  cancelled:             { label:"Cancelled",          color:"bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500",           icon:"❌" },
  no_show:               { label:"No Show",            color:"bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-400",              icon:"🚫" },
  rejected:              { label:"Rejected",           color:"bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-400",              icon:"✕"  },
};

const TYPE_ICON = { restaurant:"🍽️", hotel:"🏨", entertainment:"🎡", tour:"🗺️", tour_product:"🗺️" };

const TABS = [
  { key:"",          label:"All"       },
  { key:"holding",   label:"Payment"   },
  { key:"pending",   label:"Pending"   },
  { key:"confirmed", label:"Confirmed" },
  { key:"completed", label:"Completed" },
  { key:"cancelled", label:"Cancelled" },
];

function BookingCard({ order, onCancel, onClick }) {
  const [cancelling, setCancelling] = useState(false);
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const loc    = order.location;
  const t      = order.bookingType;
  const d      = t === "tour_product" ? order.tourProductDetails : order[`${t}Details`];
  const img    = loc?.images?.find(i => i.isPrimary)?.url || loc?.images?.[0]?.url
              || (t === "tour_product" ? d?.tourProduct?.coverImage?.url : null);
  const canCancel = ["pending","holding","confirmed"].includes(order.status);

  const handleCancel = async (e) => {
    e.stopPropagation();
    if (!confirm("Cancel this booking?")) return;
    setCancelling(true);
    try { await onCancel(order._id); }
    finally { setCancelling(false); }
  };

  const handlePrintReceipt = () => {
    const t = order.bookingType;
    const d = order[`${t}Details`] || order.tourProductDetails;
    const locName = order.location?.name
      || order.tourProductDetails?.tourProduct?.title
      || "WanderViet";

    const rows = [
      ["Booking ID",   `#${order._id?.slice(-8).toUpperCase()}`],
      ["Status",       STATUS_CONFIG[order.status]?.label || order.status],
      ["Location",     locName],
      ["Type",         t],
      ["Booked on",    fmtDate(order.createdAt)],
      d?.checkIn  ? ["Check-in",  d.checkIn]  : null,
      d?.checkOut ? ["Check-out", d.checkOut] : null,
      d?.nights   ? ["Duration",  `${d.nights} nights`] : null,
      d?.adults   ? ["Guests",    `${d.adults} adults${d.children?`, ${d.children} children`:""}` ] : null,
      d?.roomType ? ["Room",      d.roomType] : null,
      d?.date     ? ["Date",      d.date]     : null,
      d?.time     ? ["Time",      d.time]     : null,
      d?.partySize? ["Party",     `${d.partySize} people`] : null,
      order.totalAmount ? ["Total paid", `₫${Number(order.totalAmount).toLocaleString("en-US")}`] : null,
    ].filter(Boolean);

    const html = `
      <html><head><title>Receipt #${order._id?.slice(-8).toUpperCase()}</title>
      <style>
        body { font-family: sans-serif; max-width: 500px; margin: 40px auto; color: #111; }
        h2 { margin-bottom: 4px; } .sub { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 4px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        td:last-child { text-align: right; font-weight: 500; }
        .total td { font-weight: bold; font-size: 15px; border-bottom: none; }
        .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center; }
        @media print { button { display:none; } }
      </style></head>
      <body>
        <h2>🧾 Booking Receipt</h2>
        <p class="sub">WanderViet · ${new Date().toLocaleDateString("en-US", { dateStyle:"long" })}</p>
        <table>
          ${rows.map(([k,v]) => `<tr class="${k==="Total paid"?"total":""}"><td>${k}</td><td>${v}</td></tr>`).join("")}
        </table>
        <p class="footer">Thank you for booking with WanderViet.<br>Keep this receipt for your records.</p>
        <br><button onclick="window.print()">🖨️ Print / Save PDF</button>
      </body></html>`;

    const win = window.open("", "_blank", "width=600,height=700");
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  // Countdown cho holding
  const [secsLeft, setSecsLeft] = useState(null);
  useEffect(() => {
    if (order.status !== "holding" || !order.heldUntil) return;
    const calc = () => Math.max(0, Math.floor((new Date(order.heldUntil) - Date.now()) / 1000));
    setSecsLeft(calc());
    const id = setInterval(() => setSecsLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [order.status, order.heldUntil]);

  const fmtCountdown = (s) => {
    if (s === null) return null;
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2,"0")}`;
  };

  return (
    <div onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700
                 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start gap-4 p-5">
        {/* Image */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
          {img
            ? <img src={img} alt={loc?.name} className="w-full h-full object-cover"/>
            : t === "tour_product"
              ? <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700
                               flex items-center justify-center text-3xl">🗺️</div>
              : <div className="w-full h-full flex items-center justify-center text-2xl">{TYPE_ICON[t]||"📍"}</div>
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">
                {t === "tour_product"
                  ? (order.tourProductDetails?.tourProduct?.title || d?.tourProduct?.title || "Tour")
                  : (loc?.name || "Location")}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {t === "tour_product"
                  ? `🏢 ${order.company?.name || "Tour Package"}`
                  : `📍 ${loc?.address?.city || ""}`}
              </p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>

          <div className="mt-2 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs space-y-1">
            <p className="text-gray-500 dark:text-slate-400 font-medium">
              {TYPE_ICON[t]}{" "}{t === "tour_product" ? "Tour package" : `${t} booking`}
            </p>
            {t === "restaurant" && d && <p className="text-gray-700 dark:text-slate-300">{d.date} at {d.time} · {d.partySize} people{d.seatingPref && d.seatingPref !== "no_preference" ? ` · ${d.seatingPref}` : ""}</p>}
            {t === "hotel"      && d && <p className="text-gray-700 dark:text-slate-300">Check-in: {d.checkIn} → Check-out: {d.checkOut} · {d.nights} nights · {d.adults} adults</p>}
            {t === "entertainment" && d && <p className="text-gray-700 dark:text-slate-300">{d.date} {d.time} · {d.quantity}× {d.ticketType || "Standard"}</p>}
            {t === "tour"         && d && <p className="text-gray-700 dark:text-slate-300">Departure: {d.date} · {d.adults} adults, {d.children} children</p>}
            {t === "tour_product" && d && (
              <p className="text-gray-700 dark:text-slate-300">
                {d.departureDate ? new Date(d.departureDate).toLocaleDateString("vi-VN") : ""}
                {" · "}{d.adults ?? 1} người lớn{(d.children ?? 0) > 0 ? `, ${d.children} trẻ em` : ""}
                {d.totalPrice ? ` · ₫${Number(d.totalPrice).toLocaleString("vi-VN")}` : ""}
              </p>
            )}
            <p className="text-gray-500 dark:text-slate-400">Booked: {fmtDate(order.createdAt)}</p>
          </div>

          {/* Holding: always show Pay Now button */}
          {order.status === "holding" && (
            <div className="mt-2 flex items-center justify-between
                           bg-amber-50 dark:bg-amber-400/10
                           border border-amber-200 dark:border-amber-400/20
                           rounded-xl px-3 py-2">
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {secsLeft !== null && secsLeft > 0
                  ? <>⏱ Pay in <strong>{fmtCountdown(secsLeft)}</strong></>
                  : secsLeft === 0
                    ? <span className="text-red-500">⏰ Expired</span>
                    : <span>💳 Complete your payment</span>}
              </span>
              {secsLeft !== 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); window.location.href = `/booking/payment/${order._id}`; }}
                  className="shrink-0 ml-2 text-xs bg-amber-600 hover:bg-amber-700
                             text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                  Pay Now →
                </button>
              )}
            </div>
          )}

          {order.companyNote    && <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 italic">Company: "{order.companyNote}"</p>}
          {order.rejectionReason && <p className="mt-2 text-xs text-red-500">Reason: {order.rejectionReason}</p>}
        </div>
      </div>

      {/* Footer actions */}
      {(canCancel || ["confirmed","completed","checked_in"].includes(order.status)) && (
        <div className={`px-5 pb-4 flex gap-2 ${canCancel ? "" : "justify-end"}`}>
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling}
              className="flex-1 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30
                         text-red-600 dark:text-red-400 text-sm font-medium
                         hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50">
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </button>
          )}
          {["confirmed","completed","checked_in","cancelled"].includes(order.status) && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrintReceipt(); }}
              className={`py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-700
                          text-gray-600 dark:text-slate-400 text-sm font-medium
                          hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors
                          ${canCancel ? "" : "flex-1"}`}>
              🧾 Receipt
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserBookingsPage() {
  const navigate  = useNavigate();
  const [orders,  setOrders]     = useState([]);
  const [loading, setLoading]    = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [page,    setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async (tab = activeTab, p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 10 };
      if (tab) params.status = tab;
      const { data } = await api.get("/bookings/my", { params });
      setOrders(data.data.orders);
      setTotalPages(data.data.pagination.totalPages);
      setPage(p);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(activeTab, 1); }, [activeTab]);

  const handleCancel = async (orderId) => {
    try {
      await api.patch(`/bookings/${orderId}/cancel`);
      fetchOrders(activeTab, page);
    } catch(e) { alert(e.response?.data?.message || "Error"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Back pill */}
      <div className="max-w-2xl mx-auto px-5 pt-5">
        <button onClick={() => navigate(-1)}
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
          Back
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border shrink-0 transition-all
                          ${activeTab === key
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-medium text-gray-900 dark:text-white mb-1">No bookings yet</p>
            <p className="text-sm mb-4">Find a location and make your first booking</p>
            <button onClick={() => navigate("/explore")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              Explore Locations
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <BookingCard key={order._id} order={order} onCancel={handleCancel}
                onClick={() => navigate(`/profile/bookings/${order._id}`)}/>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => fetchOrders(activeTab, page-1)} disabled={page<=1}
              className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 disabled:opacity-40">← Prev</button>
            <span className="self-center text-sm text-gray-500">{page}/{totalPages}</span>
            <button onClick={() => fetchOrders(activeTab, page+1)} disabled={page>=totalPages}
              className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}