// import { useState, useEffect, useCallback } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import companyService from "../../services/company.service";
// import {
//   StatusBadge, CategoryBadge, Button, SearchBar,
//   Pagination, PageHeader, StatCard, Tabs,
// } from "../../components/ui";

// const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
// const fmt     = (n) => (n ?? 0).toLocaleString("en-US");

// const STATUS_TABS = [
//   { key: "",          label: "All"      },
//   { key: "approved",  label: "Approved" },
//   { key: "pending",   label: "Pending"  },
//   { key: "rejected",  label: "Rejected" },
//   { key: "suspended", label: "Suspended"},
// ];

// export default function CompanyLocationsPage() {
//   const navigate = useNavigate();
//   const [locations, setLocations] = useState([]);
//   const [pagination, setPag]      = useState({ page:1, totalPages:1, total:0 });
//   const [loading, setLoading]     = useState(false);
//   const [search, setSearch]       = useState("");
//   const [activeTab, setActiveTab] = useState("");
//   const [page, setPage]           = useState(1);

//   const fetchLocations = useCallback(async (p = 1) => {
//     setLoading(true);
//     try {
//       const params = { page: p, limit: 12 };
//       if (search)    params.search = search;
//       if (activeTab) params.status = activeTab;
//       const result = await companyService.getLocations(params);
//       setLocations(result.locations);
//       setPag(result.pagination);
//       setPage(p);
//     } catch(e){ console.error(e); }
//     finally { setLoading(false); }
//   }, [search, activeTab]);

//   useEffect(() => { fetchLocations(1); }, [search, activeTab]);

//   const approved  = locations.filter(l => l.status === "approved").length;
//   const pending   = locations.filter(l => l.status === "pending").length;

//   return (
//     <div>
//       <PageHeader
//         title="My Locations"
//         subtitle="Manage your registered travel spots"
//         action={
//           <Link to="/locations/add"
//             className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold
//                        px-4 py-2 rounded-xl transition-colors">
//             + Add Location
//           </Link>
//         }
//       />

//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//         <StatCard label="Total"    value={fmt(pagination.total)} icon="📍" color="blue"  />
//         <StatCard label="Approved" value={fmt(approved)}         icon="✅" color="green" />
//         <StatCard label="Pending"  value={fmt(pending)}          icon="⏳" color="amber" />
//         <StatCard label="Running Ads" value="—"                  icon="📢" color="purple"/>
//       </div>

//       <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab} />

//       <div className="flex mb-4">
//         <SearchBar value={search} onChange={setSearch} placeholder="Search locations..." width="w-72"/>
//       </div>

//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {[1,2,3,4,5,6].map(i => (
//             <div key={i} className="bg-gray-200 dark:bg-slate-800 rounded-2xl h-48 animate-pulse"/>
//           ))}
//         </div>
//       ) : locations.length === 0 ? (
//         <div className="text-center py-20">
//           <p className="text-4xl mb-3">📍</p>
//           <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">No locations found</p>
//           <Link to="/locations/add"
//             className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold
//                        px-5 py-2.5 rounded-xl transition-colors inline-block">
//             + Add your first location
//           </Link>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {locations.map((loc) => (
//             <div key={loc._id}
//               className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
//                          rounded-2xl overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-600
//                          transition-all group">
//               {/* Image */}
//               <div className="h-40 bg-gray-100 dark:bg-slate-800 relative">
//                 {loc.images?.[0]?.url ? (
//                   <img src={loc.images[0].url} alt={loc.name}
//                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
//                 ) : (
//                   <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300 dark:text-slate-600">
//                     🏞️
//                   </div>
//                 )}
//                 {/* Status badge on image */}
//                 <div className="absolute top-2 left-2">
//                   <StatusBadge status={loc.status} size="sm"/>
//                 </div>
//                 {/* Ad running indicator */}
//                 {loc.advertisement?.isActive && (
//                   <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px]
//                                   font-bold px-2 py-0.5 rounded-full">
//                     AD
//                   </div>
//                 )}
//               </div>

//               {/* Info */}
//               <div className="p-4">
//                 <p className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">{loc.name}</p>
//                 <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
//                   {loc.address?.city || loc.address?.full || "—"}
//                 </p>
//                 <div className="flex items-center gap-2 mb-3">
//                   <CategoryBadge category={loc.category} size="sm"/>
//                 </div>

//                 {/* Rejection reason */}
//                 {loc.status === "rejected" && loc.rejectionReason && (
//                   <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-2 py-1.5 mb-3">
//                     ⚠ {loc.rejectionReason}
//                   </p>
//                 )}

//                 <div className="flex items-center justify-between">
//                   <span className="text-xs text-gray-400 dark:text-slate-500">
//                     Added {fmtDate(loc.createdAt)}
//                   </span>
//                   <div className="flex gap-1.5">
//                     <Button size="xs" variant="ghost"
//                       onClick={() => navigate(`/locations/${loc._id}`)}>
//                       View
//                     </Button>
//                     <Button size="xs" variant="primary"
//                       onClick={() => navigate(`/locations/edit/${loc._id}`)}>
//                       Edit
//                     </Button>
//                     {loc.status === "approved" && !loc.advertisement?.isActive && (
//                       <Button size="xs" variant="success"
//                         onClick={() => navigate("/company/advertisements", { state: { locationId: loc._id } })}>
//                         Advertise
//                       </Button>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       <Pagination page={pagination.page} totalPages={pagination.totalPages}
//         total={pagination.total} limit={12} onChange={fetchLocations}/>
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyService from "../../services/company.service";
import {
  StatusBadge, CategoryBadge, Button, SearchBar,
  Pagination, PageHeader, StatCard, Tabs,
} from "../../components/ui";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
const fmt     = (n) => (n ?? 0).toLocaleString("en-US");

const STATUS_TABS = [
  { key: "",          label: "All"       },
  { key: "approved",  label: "Approved"  },
  { key: "pending",   label: "Pending"   },
  { key: "rejected",  label: "Rejected"  },
  { key: "suspended", label: "Suspended" },
];

// Quick action button cho management pages
function ManageBtn({ to, icon, label, color = "gray" }) {
  const navigate = useNavigate();
  const colors = {
    blue:   "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20",
    green:  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
    purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20",
    gray:   "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700",
  };
  return (
    <button onClick={() => navigate(to)}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${colors[color]}`}>
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function CompanyLocationsPage() {
  const navigate = useNavigate();
  const [locations,  setLocations]  = useState([]);
  const [pagination, setPag]        = useState({ page:1, totalPages:1, total:0 });
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [activeTab,  setActiveTab]  = useState("");
  const [page,       setPage]       = useState(1);
  const [expandedId, setExpandedId] = useState(null); // card đang mở manage panel

  const fetchLocations = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 12 };
      if (search)    params.search = search;
      if (activeTab) params.status = activeTab;
      const result = await companyService.getLocations(params);
      setLocations(result.locations);
      setPag(result.pagination);
      setPage(p);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, activeTab]);

  useEffect(() => { fetchLocations(1); }, [search, activeTab]);

  const approved = locations.filter(l => l.status === "approved").length;
  const pending  = locations.filter(l => l.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="My Locations"
        subtitle="Manage your registered travel spots"
        action={
          <Link to="/locations/add"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold
                       px-4 py-2 rounded-xl transition-colors">
            + Add Location
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total"    value={fmt(pagination.total)} icon="📍" color="blue"   />
        <StatCard label="Approved" value={fmt(approved)}         icon="✅" color="green"  />
        <StatCard label="Pending"  value={fmt(pending)}          icon="⏳" color="amber"  />
        <StatCard label="Running Ads" value="—"                  icon="📢" color="purple" />
      </div>

      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab} />

      <div className="flex mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search locations..." width="w-72"/>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-gray-200 dark:bg-slate-800 rounded-2xl h-48 animate-pulse"/>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">No locations found</p>
          <Link to="/locations/add"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold
                       px-5 py-2.5 rounded-xl transition-colors inline-block">
            + Add your first location
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => {
            const isExpanded = expandedId === loc._id;
            const isApproved = loc.status === "approved";

            return (
              <div key={loc._id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all
                            ${isExpanded
                              ? "border-blue-400 dark:border-blue-600 shadow-md"
                              : "border-gray-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600"}`}>
                {/* Image */}
                <div className="h-40 bg-gray-100 dark:bg-slate-800 relative">
                  {loc.images?.[0]?.url ? (
                    <img src={loc.images[0].url} alt={loc.name}
                      className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300 dark:text-slate-600">🏞️</div>
                  )}
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={loc.status} size="sm"/>
                  </div>
                  {loc.advertisement?.isActive && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      AD
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">{loc.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
                    {loc.address?.city || loc.address?.full || "—"}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryBadge category={loc.category} size="sm"/>
                  </div>

                  {loc.status === "rejected" && loc.rejectionReason && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-2 py-1.5 mb-3">
                      ⚠ {loc.rejectionReason}
                    </p>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {fmtDate(loc.createdAt)}
                    </span>
                    <div className="flex gap-1.5">
                      <Button size="xs" variant="ghost"
                        onClick={() => navigate(`/locations/${loc._id}`)}>
                        View
                      </Button>
                      <Button size="xs" variant="primary"
                        onClick={() => navigate(`/locations/edit/${loc._id}`)}>
                        Edit
                      </Button>
                      {isApproved && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : loc._id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                                      ${isExpanded
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
                          ⚙️ Manage
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Manage Panel (expandable) ── */}
                  {isExpanded && isApproved && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                        Manage Location
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        <ManageBtn
                          to={`/company/locations/${loc._id}/units`}
                          icon="🛏️" label="Rooms" color="blue"/>
                        <ManageBtn
                          to={`/company/locations/${loc._id}/amenities`}
                          icon="✨" label="Amenities" color="green"/>
                        <ManageBtn
                          to={`/company/locations/${loc._id}/charges`}
                          icon="💳" label="Charges" color="purple"/>
                        <ManageBtn
                          to={`/company/bookings`}
                          icon="📋" label="Bookings" color="gray"/>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages}
        total={pagination.total} limit={12} onChange={fetchLocations}/>
    </div>
  );
}