import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../lib/axios";
import { StatusBadge, CategoryBadge, PageHeader, StatCard } from "../../components/ui";

const fmtVND = (n) => {
  if (!n) return "₫0";
  if (n >= 1_000_000) return `₫${(n/1_000_000).toFixed(1).replace(".0","")}M`;
  return `₫${Math.round(n/1000)}k`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "—";
const fmtDateFull = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

// Simple bar chart component (no lib needed)
function MiniBarChart({ data = [], height = 80 }) {
  if (!data.length) return <div className="text-xs text-gray-400 text-center py-4">No data yet</div>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
          <div className="relative w-full">
            <div
              className="w-full bg-blue-100 dark:bg-blue-500/20 rounded-t-sm
                         group-hover:bg-blue-500 dark:group-hover:bg-blue-500 transition-colors"
              style={{ height: `${Math.max(4, (d.value / maxVal) * (height - 20))}px` }}/>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                            bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded
                            whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {d.label}: {d.display}
            </div>
          </div>
          <span className="text-[9px] text-gray-400 dark:text-slate-500 truncate w-full text-center">
            {d.shortLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

// Status colors for booking types
const STATUS_COLOR = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  holding:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  rejected:  "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
};

export default function CompanyDashboardPage() {
  const navigate       = useNavigate();
  const [data, setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState("count"); // "count" | "revenue"

  useEffect(() => {
    api.get("/company/dashboard")
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl"/>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-slate-800 rounded-2xl"/>)}
      </div>
    </div>
  );

  const s  = data?.summary || {};
  const trend = data?.bookingTrend || [];

  // Build chart data from trend
  const chartData = trend.map(t => ({
    label:      t._id,
    shortLabel: t._id.slice(5), // "MM-DD"
    value:      chartMode === "count" ? t.count : t.revenue,
    display:    chartMode === "count" ? `${t.count} bookings` : fmtVND(t.revenue),
  }));

  // Booking status breakdown
  const statusBreakdown = [
    { key:"confirmed", label:"Confirmed" },
    { key:"pending",   label:"Pending"   },
    { key:"completed", label:"Completed" },
    { key:"cancelled", label:"Cancelled" },
    { key:"holding",   label:"Awaiting Payment" },
  ].filter(b => (s.bookingByStatus?.[b.key] || 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Overview of your business</p>
        </div>
        <button onClick={() => window.location.reload()}
          className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white
                     flex items-center gap-1 transition-colors">
          ↺ Refresh
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Total Revenue",     value: fmtVND(s.totalRevenue),    sub:"All time",              icon:"💰", color:"emerald" },
          { label:"Revenue (30d)",     value: fmtVND(s.totalRevenue30d), sub:`${s.totalOrders30d||0} bookings`, icon:"📈", color:"blue" },
          { label:"Locations",         value: s.totalLocations||0,       sub:`${s.approvedLocations||0} active`, icon:"📍", color:"purple" },
          { label:"Total Bookings",    value: s.totalBookings||0,        sub:"All time",              icon:"📅", color:"amber" },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
              <span className="text-lg">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Booking trend chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200
                        dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Booking Trend</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500">Last 14 days</p>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {[["count","Bookings"],["revenue","Revenue"]].map(([k, l]) => (
                <button key={k} onClick={() => setChartMode(k)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors
                    ${chartMode === k
                      ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <MiniBarChart data={chartData} height={120}/>
        </div>

        {/* Booking status breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200
                        dark:border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Booking Status</h3>
          {statusBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No bookings yet</p>
          ) : (
            <div className="space-y-2.5">
              {statusBreakdown.map(({ key, label }) => {
                const count = s.bookingByStatus?.[key] || 0;
                const pct   = s.totalBookings > 0 ? Math.round((count/s.totalBookings)*100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-slate-400">{label}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all
                        ${key==="confirmed"||key==="completed" ? "bg-emerald-500"
                         :key==="pending"||key==="holding"    ? "bg-amber-400"
                         : "bg-red-400"}`}
                        style={{ width:`${pct}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent bookings + locations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent bookings */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200
                        dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Recent Bookings</h3>
            <Link to="/company/bookings" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          {!data?.recentOrders?.length ? (
            <p className="text-xs text-gray-400 text-center py-8">No bookings yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.map(order => (
                <div key={order._id}
                  onClick={() => navigate(`/company/bookings`)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50
                             dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15
                                  flex items-center justify-center text-sm shrink-0">
                    {order.bookingType === "hotel" ? "🏨"
                    : order.bookingType === "restaurant" ? "🍽️"
                    : order.bookingType === "entertainment" ? "🎡" : "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {order.contactName || "Guest"} · {order.location?.name || "—"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      {fmtDate(order.createdAt)}
                      {order.totalAmount > 0 && ` · ${fmtVND(order.totalAmount)}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0
                    ${STATUS_COLOR[order.status] || STATUS_COLOR.pending}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent locations */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200
                        dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">My Locations</h3>
            <Link to="/company/locations" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          {!data?.recentLocations?.length ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400 mb-2">No locations yet</p>
              <button onClick={() => navigate("/company/locations/add")}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                + Add your first location
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentLocations.map(loc => (
                <div key={loc._id}
                  onClick={() => navigate(`/company/locations/${loc._id}/units`)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50
                             dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <CategoryBadge category={loc.category} size="sm"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{loc.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">{fmtDateFull(loc.createdAt)}</p>
                  </div>
                  <StatusBadge status={loc.status} size="sm"/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Add Location",    icon:"📍", path:"/company/locations/add"     },
          { label:"View Bookings",   icon:"📅", path:"/company/bookings"           },
          { label:"Default Policy",  icon:"📋", path:"/company/profile?tab=policy" },
          { label:"Ads & Promos",    icon:"📢", path:"/company/ads"               },
        ].map(({ label, icon, path }) => (
          <button key={label} onClick={() => navigate(path)}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900
                       border border-gray-200 dark:border-slate-800 rounded-2xl
                       hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50
                       dark:hover:bg-blue-500/5 transition-all text-center">
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}