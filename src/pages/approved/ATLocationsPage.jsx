import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import atService from "../../services/at.service";
import {
  StatusBadge, CategoryBadge, Button, SearchBar,
  Pagination, PageHeader, StatCard, Tabs,
} from "../../components/ui";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

const STATUS_TABS = [
  { key:"",          label:"All"      },
  { key:"approved",  label:"Approved" },
  { key:"pending",   label:"Pending"  },
  { key:"rejected",  label:"Rejected" },
];

export default function ATLocationsPage() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [pagination, setPag]      = useState({ page:1, totalPages:1, total:0 });
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [page, setPage]           = useState(1);

  const fetchLocations = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 12 };
      if (search)    params.search = search;
      if (activeTab) params.status = activeTab;
      const result = await atService.getMyLocations(params);
      setLocations(result.locations);
      setPag(result.pagination);
      setPage(p);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [search, activeTab]);

  useEffect(() => { fetchLocations(1); }, [search, activeTab]);

  return (
    <div>
      <PageHeader
        title="My Locations"
        subtitle="Locations you've submitted to the platform"
        action={
          <Link to="/locations/add"
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold
                       px-4 py-2 rounded-xl transition-colors">
            + Add Location
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total"    value={pagination.total}                                       icon="📍" color="teal"  />
        <StatCard label="Approved" value={locations.filter(l=>l.status==="approved").length}      icon="✅" color="green" />
        <StatCard label="Pending"  value={locations.filter(l=>l.status==="pending").length}       icon="⏳" color="amber" />
        <StatCard label="Rejected" value={locations.filter(l=>l.status==="rejected").length}      icon="❌" color="red"   />
      </div>

      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab}/>

      <div className="flex mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search locations..." width="w-72"/>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-4xl mb-2">📍</p>
          <p className="font-medium text-gray-900 dark:text-white mb-1">No locations yet</p>
          <Link to="/locations/add"
            className="text-teal-600 dark:text-teal-400 text-sm underline">
            Add your first location →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc._id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                         rounded-2xl overflow-hidden hover:border-teal-300 dark:hover:border-teal-600
                         transition-all group">
              <div className="h-36 bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
                {loc.images?.[0]?.url ? (
                  <img src={loc.images[0].url} alt={loc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🏞️</div>
                )}
                <div className="absolute top-2 left-2"><StatusBadge status={loc.status} size="sm"/></div>
              </div>

              <div className="p-4">
                <p className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">{loc.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
                  {loc.address?.city || loc.address?.full || "—"} · {fmtDate(loc.createdAt)}
                </p>

                {loc.status === "rejected" && loc.rejectionReason && (
                  <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10
                                rounded-lg px-2 py-1.5 mb-2 line-clamp-2">
                    ⚠ {loc.rejectionReason}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3
                               border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={loc.category} size="sm"/>
                    {loc.managedBy && (
                      <span className="text-[10px] bg-orange-100 dark:bg-orange-500/15
                                       text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                        🔒 Claimed
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="ghost"
                      onClick={() => navigate(`/locations/${loc._id}`)}>
                      View
                    </Button>
                    {/* Edit/Delete only if NOT claimed by a company */}
                    {!loc.managedBy && (
                      <>
                        <Button size="xs" variant="primary"
                          onClick={() => navigate(`/locations/edit/${loc._id}`)}>
                          Edit
                        </Button>
                        <Button size="xs" variant="danger"
                          onClick={async () => {
                            if (!confirm(`Delete "${loc.name}"?`)) return;
                            try {
                              await api.delete(`/locations/${loc._id}`);
                              fetchLocations();
                            } catch (e) { alert(e.response?.data?.message || "Delete failed"); }
                          }}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages}
        total={pagination.total} limit={12} onChange={fetchLocations}/>
    </div>
  );
}