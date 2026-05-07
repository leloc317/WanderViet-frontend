
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";

const STATUS_META = {
  holding:               { label: "Holding",         color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-400" },
  confirmed:             { label: "Confirmed",        color: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400" },
  checked_in:            { label: "Checked in",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400" },
  partially_checked_out: { label: "Partial checkout", color: "bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-400" },
  completed:             { label: "Completed",        color: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
  cancelled:             { label: "Cancelled",        color: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400" },
  no_show:               { label: "No show",          color: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400" },
};

const TABS = [
  { key: "",                      label: "All"       },
  { key: "confirmed",             label: "Confirmed" },
  { key: "checked_in",            label: "Active"    },
  { key: "partially_checked_out", label: "Partial"   },
  { key: "completed",             label: "Done"      },
];

const TYPE_ICON = { restaurant:"🍽️", hotel:"🏨", entertainment:"🎡", tour:"🗺️" };

function BookingSummary({ order }) {
  const t = order.bookingType;
  const d = order[`${t}Details`] ?? {};
  if (t === "hotel") return (
    <span className="text-xs text-gray-500 dark:text-slate-400">
      {d.checkIn} → {d.checkOut} · {d.rooms ?? 1} room{(d.rooms??1)>1?"s":""} · {d.adults}A
    </span>
  );
  if (t === "restaurant") return (
    <span className="text-xs text-gray-500 dark:text-slate-400">{d.date} {d.time} · {d.partySize} guests</span>
  );
  return <span className="text-xs text-gray-500 dark:text-slate-400">{d.date}</span>;
}

export default function StaffBookingsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const locationId = user?.staffInfo?.location?._id ?? user?.staffInfo?.location;

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("confirmed");

  const fetchOrders = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (tab) params.status = tab;
      const { data } = await api.get(`/bookings/company/locations/${locationId}`, { params });
      setOrders(data.data.orders ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [locationId, tab]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (!locationId) return (
    <div className="text-center py-20">
      <p className="text-3xl mb-3">⚠️</p>
      <p className="font-semibold text-gray-900 dark:text-white">No location assigned</p>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Contact your manager to get assigned to a location</p>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bookings</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          {user?.staffInfo?.location?.name ?? "Your location"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 border transition-all
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
          <p className="text-gray-500 dark:text-slate-400 text-sm">No {tab || ""} orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const meta = STATUS_META[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
            const isUrgent = order.status === "confirmed" && !order.assignedUnits;
            return (
              <button key={order._id}
                onClick={() => navigate(`/staff/bookings/${order._id}`)}
                className="w-full text-left bg-white dark:bg-slate-900 border border-gray-200
                           dark:border-slate-800 rounded-2xl p-4 hover:border-blue-300
                           dark:hover:border-blue-700 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{TYPE_ICON[order.bookingType]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{order.contactName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">
                          ⚠️ Unassigned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                      📞 {order.contactPhone}
                    </p>
                    <BookingSummary order={order} />
                  </div>
                  <span className="text-gray-300 dark:text-slate-600 shrink-0">›</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}