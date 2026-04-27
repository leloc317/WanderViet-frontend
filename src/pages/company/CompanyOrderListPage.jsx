import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import useSocket from "../../hooks/useSocket";

const STATUS_META = {
  pending:               { label: "Pending",          color: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400" },
  confirmed:             { label: "Confirmed",         color: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400" },
  checked_in:            { label: "Checked in",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400" },
  partially_checked_out: { label: "Partial checkout",  color: "bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-400" },
  completed:             { label: "Completed",         color: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
  cancelled:             { label: "Cancelled",         color: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400" },
  no_show:               { label: "No show",           color: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400" },
  holding:               { label: "Holding",           color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-400" },
};

const TABS = [
  { key: "",                      label: "All" },
  { key: "pending",               label: "Pending" },
  { key: "confirmed",             label: "Confirmed" },
  { key: "checked_in",            label: "Active" },
  { key: "partially_checked_out", label: "Partial" },
  { key: "completed",             label: "Done" },
  { key: "cancelled,no_show",     label: "Cancelled" },
];

const TYPE_ICON = { restaurant: "🍽️", hotel: "🏨", entertainment: "🎡", tour: "🗺️" };

function BookingSummary({ order }) {
  const t = order.bookingType;
  const d = order[`${t}Details`] ?? {};
  if (t === "hotel") return (
    <span className="text-xs text-gray-500 dark:text-slate-400">
      {d.checkIn} → {d.checkOut} · {d.rooms ?? 1} room{(d.rooms ?? 1) > 1 ? "s" : ""} · {d.adults ?? 1} adults
    </span>
  );
  if (t === "restaurant") return (
    <span className="text-xs text-gray-500 dark:text-slate-400">
      {d.date} {d.time} · {d.partySize} guests
    </span>
  );
  if (t === "entertainment") return (
    <span className="text-xs text-gray-500 dark:text-slate-400">
      {d.date} {d.time} · {d.quantity} ticket{d.quantity > 1 ? "s" : ""}
    </span>
  );
  return <span className="text-xs text-gray-500 dark:text-slate-400">{d.date}</span>;
}

export default function CompanyOrderListPage() {
  const { locationId } = useParams();
  const navigate       = useNavigate();

  const [location, setLocation] = useState(null);
  const [orders,   setOrders]   = useState([]);
  const [pagination, setPag]    = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("pending");
  const [page,     setPage]     = useState(1);
  const [newBookingToast, setNewBookingToast] = useState(null);

  // Real-time: new booking arrived
  useSocket("booking:new", useCallback((data) => {
    setNewBookingToast(data);
    setTimeout(() => setNewBookingToast(null), 5000);
    // Refresh list if on pending tab
    if (tab === "pending") fetchOrders(1);
  }, [tab]));

  // Load location info
  useEffect(() => {
    api.get(`/locations/${locationId}`).then(r => setLocation(r.data.data ?? r.data)).catch(() => {});
  }, [locationId]);

  const fetchOrders = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { locationId, page: p, limit: 15 };
      if (tab && !tab.includes(",")) params.status = tab;
      if (tab.includes(","))         params.status = tab; // backend handles comma-separated

      const { data } = await api.get("/bookings/company/locations/" + locationId, { params });
      setOrders(data.data.orders ?? []);
      setPag(data.data.pagination ?? { total: 0, page: 1, totalPages: 1 });
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [locationId, tab]);

  useEffect(() => { fetchOrders(1); }, [tab, locationId]);

  const elapsed = (d) => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const urgencyColor = (d) => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m >= 40) return "text-red-500";
    if (m >= 25) return "text-orange-500";
    return "text-amber-500";
  };

  return (
    <div>
      {/* New booking real-time toast */}
      {newBookingToast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-5 py-3.5
                        rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse max-w-sm">
          <span className="text-xl">🔔</span>
          <div>
            <p className="font-bold text-sm">New Booking!</p>
            <p className="text-xs opacity-90">{newBookingToast.contactName} just booked</p>
          </div>
          <button onClick={() => setNewBookingToast(null)} className="ml-2 text-white/70 hover:text-white">×</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/company/bookings")}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {location?.name ?? "Bookings"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {pagination.total} total orders
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-all border
                        ${tab === t.key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm">No {tab || ""}  orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const meta = STATUS_META[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
            return (
              <button key={order._id}
                onClick={() => navigate(`/company/bookings/${locationId}/${order._id}`)}
                className="w-full text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                           rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{TYPE_ICON[order.bookingType]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{order.contactName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      {order.status === "pending" && (
                        <span className={`text-xs font-medium ${urgencyColor(order.createdAt)}`}>
                          ⏱ {elapsed(order.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                      📞 {order.contactPhone}
                      {order.contactEmail && ` · ${order.contactEmail}`}
                    </p>
                    <BookingSummary order={order} />
                  </div>
                  <span className="text-gray-300 dark:text-slate-600 text-sm shrink-0">›</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1}
            className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                       dark:border-slate-700 disabled:opacity-40">← Prev</button>
          <span className="self-center text-sm text-gray-500">{page} / {pagination.totalPages}</span>
          <button onClick={() => fetchOrders(page + 1)} disabled={page >= pagination.totalPages}
            className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                       dark:border-slate-700 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}