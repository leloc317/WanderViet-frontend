import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";

const STATUS_COLORS = {
  pending:               "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400",
  confirmed:             "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400",
  checked_in:            "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400",
  partially_checked_out: "bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-400",
  completed:             "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  cancelled:             "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400",
  no_show:               "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400",
};

const CATEGORY_ICON = {
  hotel: "🏨", restaurant: "🍽️", cafe: "☕",
  tourist_spot: "🏛️", entertainment: "🎡", shopping: "🛍️",
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit" }) : "—";

function StatPill({ label, count, color }) {
  if (!count) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {count} {label}
    </span>
  );
}

// ── TourProductBookingCard ─────────────────────────────────────────────────────
function TourProductBookingCard({ order, onClick }) {
  const d       = order.tourProductDetails ?? {};
  const tp      = d.tourProduct;
  const img     = tp?.coverImage?.url;
  const slots   = (d.adults ?? 1) + (d.children ?? 0);

  const statusCls = {
    holding:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-400",
    pending:   "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400",
    completed: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
    cancelled: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400",
  }[order.status] ?? "bg-gray-100 text-gray-500";

  return (
    <button onClick={onClick}
      className="text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700
                 hover:shadow-md transition-all group w-full">
      <div className="h-28 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        {img
          ? <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">🗺️</div>
        }
        <div className="absolute top-2 left-2">
          <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">Tour Product</span>
        </div>
        <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
          {order.status}
        </div>
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 dark:text-white text-sm mb-0.5 truncate">
          {tp?.title ?? "Tour Product"}
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
          👤 {order.contactName} · {slots} khách
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          🗓️ Khởi hành: {d.departureDate ? new Date(d.departureDate).toLocaleDateString("vi-VN") : "—"}
        </p>
        {d.totalPrice > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            💰 {Number(d.totalPrice).toLocaleString("vi-VN")}₫
          </p>
        )}
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompanyBookingLocPage() {
  const navigate = useNavigate();
  const [locations,      setLocations]      = useState([]);
  const [tourBookings,   setTourBookings]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [tourLoading,    setTourLoading]    = useState(true);
  const [activeTab,      setActiveTab]      = useState("locations"); // "locations" | "tours"
  const [tourStatusTab,  setTourStatusTab]  = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/bookings/company/locations");
        setLocations(data.data ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (activeTab !== "tours") return;
    setTourLoading(true);
    (async () => {
      try {
        const params = { bookingType: "tour_product", limit: 30 };
        if (tourStatusTab) params.status = tourStatusTab;
        const { data } = await api.get("/bookings/company", { params });
        setTourBookings(data.data?.orders ?? []);
      } catch (e) { console.error(e); }
      finally { setTourLoading(false); }
    })();
  }, [activeTab, tourStatusTab]);

  const pendingTourCount = tourBookings.filter(o => ["pending","holding"].includes(o.status)).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bookings</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Quản lý bookings từ Location và Tour Products
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "locations", label: "📍 Locations", count: locations.reduce((s,l) => s + (l.stats?.pending ?? 0), 0) },
          { key: "tours",     label: "🗺️ Tour Products", count: null },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors relative
              ${activeTab === tab.key
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}>
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold
                               px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── LOCATIONS TAB ── */}
      {activeTab === "locations" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Chưa có booking</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Booking sẽ xuất hiện khi khách hàng đặt chỗ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map(loc => (
                <button
                  key={loc._id}
                  onClick={() => navigate(`/company/bookings/${loc._id}`)}
                  className="text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                             rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700
                             hover:shadow-md transition-all group"
                >
                  <div className="h-32 bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
                    {loc.images?.[0]?.url ? (
                      <img src={loc.images[0].url} alt={loc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        {CATEGORY_ICON[loc.category] ?? "📍"}
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full capitalize">
                        {loc.category?.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">{loc.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 truncate">
                      📍 {loc.address?.district}, {loc.address?.city}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      <StatPill label="pending"   count={loc.stats?.pending}    color={STATUS_COLORS.pending} />
                      <StatPill label="confirmed" count={loc.stats?.confirmed}  color={STATUS_COLORS.confirmed} />
                      <StatPill label="active"    count={loc.stats?.checked_in} color={STATUS_COLORS.checked_in} />
                      <StatPill label="completed" count={loc.stats?.completed}  color={STATUS_COLORS.completed} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                      {loc.stats?.total ?? 0} total bookings
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TOUR PRODUCTS TAB ── */}
      {activeTab === "tours" && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {[
              { key: "",          label: "Tất cả"      },
              { key: "holding",   label: "⏳ Chờ TT"   },
              { key: "pending",   label: "Chờ duyệt"   },
              { key: "confirmed", label: "Đã xác nhận" },
              { key: "completed", label: "Hoàn thành"  },
              { key: "cancelled", label: "Đã huỷ"      },
            ].map(s => (
              <button key={s.key} onClick={() => setTourStatusTab(s.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition-colors
                  ${tourStatusTab === s.key
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}>
                {s.label}
              </button>
            ))}
          </div>

          {tourLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
            </div>
          ) : tourBookings.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">🗺️</p>
              <p className="text-sm">Chưa có tour booking nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tourBookings.map(order => (
                <TourProductBookingCard key={order._id} order={order}
                  onClick={() => navigate(`/company/tour-bookings/${order._id}`)}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}