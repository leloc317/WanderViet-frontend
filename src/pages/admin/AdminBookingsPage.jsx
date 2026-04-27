import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import { StatCard, PageHeader, SearchBar, Pagination, Tabs } from "../../components/ui/Widgets";
import { Badge } from "../../components/ui";

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_ICON    = { restaurant: "🍽️", hotel: "🏨", entertainment: "🎡", tour: "🗺️" };
const CAT_ICON     = { restaurant: "🍽️", hotel: "🏨", entertainment: "🎡", tourist_spot: "🏛️", cafe: "☕", shopping: "🛍️" };
const STATUS_COLOR = { pending: "yellow", confirmed: "green", completed: "blue", cancelled: "slate", no_show: "red", rejected: "red", checked_in: "teal" };
const STATUS_TABS  = [
  { key: "",            label: "All"        },
  { key: "pending",     label: "Pending"    },
  { key: "confirmed",   label: "Confirmed"  },
  { key: "checked_in",  label: "Checked In" },
  { key: "completed",   label: "Completed"  },
  { key: "no_show",     label: "No Show"    },
  { key: "cancelled",   label: "Cancelled"  },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "—";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-36 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

// ── AttentionBanner ───────────────────────────────────────────────────────────
function AttentionBanner({ count, onClick }) {
  if (!count) return null;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-amber-50 dark:bg-amber-400/10 border border-amber-200
                 dark:border-amber-400/20 rounded-2xl px-5 py-3 mb-5 flex items-center gap-3
                 hover:bg-amber-100 dark:hover:bg-amber-400/20 transition-colors"
    >
      <span className="text-amber-500 text-lg">⚠️</span>
      <p className="text-sm text-amber-800 dark:text-amber-300 font-medium flex-1">
        <span className="font-bold">{count}</span> booking đang chờ xác nhận từ Company
      </p>
      <span className="text-xs text-amber-600 dark:text-amber-400">Xem ngay →</span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// VIEW 1 — COMPANY LIST
// ════════════════════════════════════════════════════════════════════════════════
function CompanyListView({ onSelectCompany, onShowPending }) {
  const [companies, setCompanies] = useState([]);
  const [global,    setGlobal]    = useState({});
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/bookings/admin/companies");
        setCompanies(data.data.companies);
        setGlobal(data.data.global ?? {});
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Sort: companies with pending first
  const sorted = [...filtered].sort((a, b) => (b.stats?.pending ?? 0) - (a.stats?.pending ?? 0));

  const totalPending = companies.reduce((s, c) => s + (c.stats?.pending ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Booking Management"
        subtitle="Quản lý bookings toàn hệ thống theo Company"
      />

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tổng Bookings"    value={global.total     ?? 0} icon="📋" color="blue"   />
        <StatCard label="Chờ xác nhận"     value={global.pending   ?? 0} icon="⏳" color="amber"  onClick={() => onShowPending()} />
        <StatCard label="Đang active"      value={global.active    ?? 0} icon="✅" color="green"  />
        <StatCard label="No-show (tổng)"   value={global.noShow    ?? 0} icon="🚫" color="red"    />
      </div>

      <AttentionBanner count={totalPending} onClick={() => onShowPending()} />

      {/* Search + list */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Tìm công ty..."
          width="w-72"
        />
        <p className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
          {filtered.length} companies
        </p>
      </div>

      {loading ? <CardSkeleton count={6} /> : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-2">🏢</p>
          <p className="text-sm">Không tìm thấy company nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(company => {
            const s       = company.stats ?? {};
            const active  = (s.confirmed ?? 0) + (s.checkedIn ?? 0);
            const hasBadge = (s.pending ?? 0) > 0;

            return (
              <button
                key={company._id}
                onClick={() => onSelectCompany(company)}
                className="text-left bg-white dark:bg-slate-900 border border-gray-200
                           dark:border-slate-800 rounded-2xl p-5 hover:border-blue-300
                           dark:hover:border-blue-500/50 hover:shadow-md transition-all
                           group relative"
              >
                {/* Pending badge */}
                {hasBadge && (
                  <span className="absolute top-3 right-3 bg-amber-500 text-white
                                   text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {s.pending} pending
                  </span>
                )}

                {/* Company header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200
                                  dark:from-blue-500/20 dark:to-blue-600/20 flex items-center
                                  justify-center text-lg font-bold text-blue-600 dark:text-blue-400
                                  shrink-0">
                    {company.avatar
                      ? <img src={company.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                      : company.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="min-w-0 flex-1 pr-12">
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate
                                  group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {company.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{company.email}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Total",     val: s.total     ?? 0, color: "text-gray-700 dark:text-slate-300" },
                    { label: "Active",    val: active,            color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Done",      val: s.completed ?? 0, color: "text-blue-600 dark:text-blue-400" },
                    { label: "No-show",   val: s.noShow    ?? 0, color: "text-red-500 dark:text-red-400" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="text-center">
                      <p className={`text-lg font-bold leading-tight ${color}`}>{val}</p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t
                                border-gray-100 dark:border-slate-800">
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    🏢 {company.locationCount} location{company.locationCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    Tháng này: <span className="font-medium text-gray-700 dark:text-slate-300">{s.thisMonth ?? 0}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// VIEW 2 — LOCATION LIST
// ════════════════════════════════════════════════════════════════════════════════
function LocationListView({ company, onSelectLocation, onBack }) {
  const [locations,        setLocations]        = useState([]);
  const [tourProductStats, setTourProductStats] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/bookings/admin/companies/${company._id}/locations`);
        setLocations(data.data.locations);
        setTourProductStats(data.data.tourProductStats ?? null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [company._id]);

  // Sort by pending first
  const sorted = [...locations].sort((a, b) => (b.stats?.pending ?? 0) - (a.stats?.pending ?? 0));

  const tourTotal     = tourProductStats?.total ?? 0;
  const totalBookings = locations.reduce((s, l) => s + (l.stats?.total ?? 0), 0) + tourTotal;
  const totalPending  = locations.reduce((s, l) => s + (l.stats?.pending ?? 0), 0) + (tourProductStats?.pending ?? 0);
  const totalActive   = locations.reduce((s, l) => s + (l.stats?.confirmed ?? 0) + (l.stats?.checkedIn ?? 0), 0) + (tourProductStats?.confirmed ?? 0);
  const todayTotal    = locations.reduce((s, l) => s + (l.todayCount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={company.name}
        subtitle={`${locations.length} locations · ${totalBookings} bookings tổng`}
        breadcrumb={
          <>
            <button onClick={onBack} className="hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
              ← Companies
            </button>
            <span>/</span>
            <span className="text-gray-700 dark:text-slate-200">{company.name}</span>
          </>
        }
      />

      {/* Company-level stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tổng Bookings" value={totalBookings} icon="📋" color="blue"  />
        <StatCard label="Chờ xác nhận"  value={totalPending}  icon="⏳" color="amber" />
        <StatCard label="Đang active"   value={totalActive}   icon="✅" color="green" />
        <StatCard label="Hôm nay"       value={todayTotal}    icon="📅" color="teal"  />
      </div>

      {loading ? <CardSkeleton count={4} /> : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-2">📍</p>
          <p className="text-sm">Không có location nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tour Products virtual card */}
          {tourProductStats && tourProductStats.total > 0 && (
            <button
              onClick={() => onSelectLocation({ _id: "__tour_products__", name: "Tour Products", isTourProduct: true })}
              className="text-left bg-white dark:bg-slate-900 border border-blue-200
                         dark:border-blue-500/30 rounded-2xl overflow-hidden
                         hover:border-blue-400 dark:hover:border-blue-400/50
                         hover:shadow-md transition-all">
              <div className="h-24 bg-gradient-to-br from-blue-600 to-indigo-700
                             flex items-center justify-center">
                <span className="text-5xl opacity-30">🗺️</span>
              </div>
              <div className="p-4">
                <p className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">🗺️ Tour Products</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Tour sản phẩm của công ty</p>
                <div className="flex gap-3 text-xs">
                  {[["Total", tourProductStats.total, "text-gray-900 dark:text-white"],
                    ["Pending", tourProductStats.pending ?? 0, "text-amber-600 dark:text-amber-400"],
                    ["Done", tourProductStats.completed ?? 0, "text-emerald-600 dark:text-emerald-400"],
                    ["No-show", tourProductStats.noShow ?? 0, "text-red-500"],
                  ].map(([label, val, cls]) => (
                    <div key={label}>
                      <p className={`font-bold ${cls}`}>{val}</p>
                      <p className="text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          )}
          {sorted.map(loc => {
            const s        = loc.stats ?? {};
            const active   = (s.confirmed ?? 0) + (s.checkedIn ?? 0);
            const catIcon  = CAT_ICON[loc.category] ?? "📍";
            const img      = loc.images?.[0]?.url;

            return (
              <button
                key={loc._id}
                onClick={() => onSelectLocation(loc)}
                className="text-left bg-white dark:bg-slate-900 border border-gray-200
                           dark:border-slate-800 rounded-2xl overflow-hidden
                           hover:border-blue-300 dark:hover:border-blue-500/50
                           hover:shadow-md transition-all group"
              >
                {/* Cover image */}
                <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200
                                dark:from-slate-800 dark:to-slate-700 relative overflow-hidden">
                  {img
                    ? <img src={img} className="w-full h-full object-cover" alt="" />
                    : <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">{catIcon}</span>
                  }
                  {/* Today badge */}
                  {loc.todayCount > 0 && (
                    <span className="absolute top-2 right-2 bg-blue-600 text-white
                                     text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {loc.todayCount} hôm nay
                    </span>
                  )}
                  {/* Pending badge */}
                  {(s.pending ?? 0) > 0 && (
                    <span className="absolute top-2 left-2 bg-amber-500 text-white
                                     text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {s.pending} pending
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <p className="font-bold text-gray-900 dark:text-white text-sm mb-0.5
                                group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {catIcon} {loc.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 capitalize mb-3">
                    {loc.booking?.bookingType ?? loc.category}
                  </p>

                  {/* Mini stats */}
                  <div className="flex gap-3 text-center">
                    {[
                      { label: "Total",   val: s.total     ?? 0, cls: "text-gray-700 dark:text-slate-300" },
                      { label: "Active",  val: active,            cls: "text-emerald-600 dark:text-emerald-400" },
                      { label: "Done",    val: s.completed ?? 0, cls: "text-blue-600 dark:text-blue-400" },
                      { label: "No-show", val: s.noShow    ?? 0, cls: "text-red-500" },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="flex-1">
                        <p className={`text-base font-bold ${cls}`}>{val}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// VIEW 3 — BOOKING LIST
// ════════════════════════════════════════════════════════════════════════════════
function BookingListView({ company, location, onBack, onBackToCompany, initialStatus = "" }) {
  const [orders,     setOrders]     = useState([]);
  const [counts,     setCounts]     = useState({});
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState(initialStatus);
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchOrders = useCallback(async (tab = activeTab, p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (tab) params.status = tab;

      // tour_product virtual location — filter by bookingType + company
      if (location?.isTourProduct) {
        params.bookingType = "tour_product";
        if (company?._id) params.companyId = company._id;
      } else if (location?._id) {
        params.locationId = location._id;
      } else if (company?._id) {
        params.companyId = company._id;
      }

      const { data } = await api.get("/bookings/admin", { params });
      setOrders(data.data.orders);
      setCounts(data.data.counts ?? {});
      setPagination(data.data.pagination);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab, location, company]);

  useEffect(() => { fetchOrders(activeTab, 1); }, [activeTab]);

  const handleTabChange = (tab) => { setActiveTab(tab); };

  return (
    <div>
      <PageHeader
        title={location?.name ?? company?.name ?? "Bookings"}
        subtitle={`${pagination.total} bookings · ${location?.isTourProduct ? "Tour Products" : location ? (location.booking?.bookingType ?? location.category ?? "") : ""}`}
        breadcrumb={
          <>
            <button onClick={onBackToCompany}
              className="hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
              ← Companies
            </button>
            {company && (
              <>
                <span>/</span>
                <button onClick={onBack}
                  className="hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
                  {company.name}
                </button>
              </>
            )}
            {location && (
              <>
                <span>/</span>
                <span className="text-gray-700 dark:text-slate-200">{location.name}</span>
              </>
            )}
          </>
        }
      />

      {/* Quick counts */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {[
          { key: "pending",    label: "Pending",    color: "text-amber-600" },
          { key: "confirmed",  label: "Confirmed",  color: "text-emerald-600" },
          { key: "checked_in", label: "Checked In", color: "text-teal-600" },
          { key: "completed",  label: "Completed",  color: "text-blue-600" },
          { key: "no_show",    label: "No Show",    color: "text-red-500"  },
          { key: "cancelled",  label: "Cancelled",  color: "text-gray-400" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`bg-white dark:bg-slate-900 border rounded-xl py-2 px-3 text-center
                        transition-colors
                        ${activeTab === key
                          ? "border-blue-400 dark:border-blue-500 shadow-sm"
                          : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
                        }`}
          >
            <p className={`text-xl font-bold ${color}`}>{counts[key] ?? 0}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={handleTabChange} />

      {/* List */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">Không có booking {activeTab ? `"${activeTab}"` : "nào"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => {
              const t = order.bookingType;
              const d = order[`${t}Details`];
              return (
                <div key={order._id}
                  className="bg-white dark:bg-slate-900 border border-gray-200
                             dark:border-slate-800 rounded-2xl px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5 shrink-0">{TYPE_ICON[t] ?? "📋"}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {order.contactName}
                        </p>
                        <Badge
                          label={order.status.replace("_", " ")}
                          color={STATUS_COLOR[order.status] ?? "slate"}
                          size="sm"
                          dot
                        />
                      </div>

                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">
                        📞 {order.contactPhone}
                        {" · "}
                        👤 {order.user?.name}
                        {!location && order.location?.name && ` · 📍 ${order.location.name}`}
                      </p>

                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {t === "restaurant"    && d && `${fmtShort(d.date)} ${d.time} · ${d.partySize} người`}
                        {t === "hotel"         && d && `${fmtShort(d.checkIn)} → ${fmtShort(d.checkOut)} · ${d.nights} đêm`}
                        {t === "entertainment" && d && `${fmtShort(d.date)} · ${d.quantity} vé`}
                        {t === "tour"          && d && `${fmtShort(d.date)} · ${d.adults}A ${d.children}C`}
                        {" · "}
                        <span className="text-gray-300 dark:text-slate-600">
                          {fmtDate(order.createdAt)}
                        </span>
                      </p>

                      {order.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5">↳ {order.rejectionReason}</p>
                      )}
                    </div>

                    {/* Score */}
                    {order.user?.bookingScore != null && (
                      <div className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full
                        ${order.user.bookingScore >= 80
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : order.user.bookingScore >= 50
                            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                            : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                        }`}>
                        {order.user.bookingScore}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={20}
          onChange={(p) => fetchOrders(activeTab, p)}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ROOT — view router
// ════════════════════════════════════════════════════════════════════════════════
export default function AdminBookingsPage() {
  // view: "companies" | "locations" | "bookings" | "pending"
  const [view,            setView]            = useState("companies");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedLocation,setSelectedLocation]= useState(null);

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    setView("locations");
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setView("bookings");
  };

  const handleShowPending = () => {
    setSelectedCompany(null);
    setSelectedLocation(null);
    setView("pending");
  };

  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setSelectedLocation(null);
    setView("companies");
  };

  const handleBackToLocations = () => {
    setSelectedLocation(null);
    setView("locations");
  };

  if (view === "companies") {
    return (
      <CompanyListView
        onSelectCompany={handleSelectCompany}
        onShowPending={handleShowPending}
      />
    );
  }

  if (view === "locations" && selectedCompany) {
    return (
      <LocationListView
        company={selectedCompany}
        onSelectLocation={handleSelectLocation}
        onBack={handleBackToCompanies}
      />
    );
  }

  if (view === "pending") {
    return (
      <BookingListView
        company={null}
        location={null}
        onBack={handleBackToCompanies}
        onBackToCompany={handleBackToCompanies}
        initialStatus="pending"
      />
    );
  }

  // view === "bookings"
  return (
    <BookingListView
      company={selectedCompany}
      location={selectedLocation}
      onBack={handleBackToLocations}
      onBackToCompany={handleBackToCompanies}
    />
  );
}