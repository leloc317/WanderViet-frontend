import { useState, useEffect, useCallback } from "react";
import adService from "../../services/ad.service";
import {
  Table, StatusBadge, Badge, Button, Modal,
  FormField, Input, Select, Textarea, PageHeader,
  StatCard, SearchBar, Pagination, Tabs,
} from "../../components/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString("en-US");
const fmtVND = (n) => `₫${(n ?? 0).toLocaleString("en-US")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
const daysLeft = (endDate) => {
  const d = Math.ceil((new Date(endDate) - new Date()) / 86400000);
  return d > 0 ? d : 0;
};

const PKG_COLOR = { basic:"blue", standard:"purple", premium:"amber" };

const EMPTY_PKG = {
  name:"", type:"basic", description:"", price:"",
  durationDays:"30", maxImpressions:"", priority:"1",
  features:"",
};

const EMPTY_ORDER = {
  company:"", location:"", packageId:"",
  startDate: new Date().toISOString().split("T")[0],
  paymentMethod:"manual", paymentReference:"",
};

// ─── Package Card ─────────────────────────────────────────────────────────────
function PackageCard({ pkg, onEdit, onDelete }) {
  const color = PKG_COLOR[pkg.type] ?? "blue";
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                    rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <Badge label={pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)} color={color} />
          <h3 className="font-bold text-gray-900 dark:text-white text-base mt-1.5">{pkg.name}</h3>
          {pkg.description && (
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{pkg.description}</p>
          )}
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {fmtVND(pkg.price)}
          </p>
          <p className="text-gray-400 dark:text-slate-500 text-xs">{pkg.durationDays} days</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
          <p className="text-gray-400 dark:text-slate-500 text-xs">Impressions</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {pkg.maxImpressions ? fmt(pkg.maxImpressions) : "Unlimited"}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
          <p className="text-gray-400 dark:text-slate-500 text-xs">Priority</p>
          <p className="font-semibold text-gray-900 dark:text-white">{pkg.priority} / 10</p>
        </div>
      </div>

      {pkg.features?.length > 0 && (
        <ul className="space-y-1">
          {pkg.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
              <span className="text-emerald-500">✓</span> {f}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-slate-800">
        <Badge label={pkg.isActive ? "Active" : "Inactive"} color={pkg.isActive ? "green" : "slate"} dot />
        <div className="flex-1"/>
        <Button size="sm" variant="ghost" onClick={() => onEdit(pkg)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(pkg._id)}>Delete</Button>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onApprove, onUpdateStatus }) {
  if (!order) return null;
  const days = daysLeft(order.endDate);
  const ctr  = order.stats?.impressions
    ? ((order.stats.clicks / order.stats.impressions) * 100).toFixed(1)
    : "0.0";

  return (
    <Modal open={!!order} onClose={onClose} title="Ad Order Detail" size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 dark:text-slate-400 text-xs">Location</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">
              {order.location?.name}
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-sm">
              {order.location?.address?.city}
            </p>
          </div>
          <StatusBadge status={order.status} size="lg" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:"Impressions", value: fmt(order.stats?.impressions), icon:"👁️" },
            { label:"Clicks",      value: fmt(order.stats?.clicks),       icon:"🖱️" },
            { label:"CTR",         value: `${ctr}%`,                      icon:"📊" },
            { label:"Days Left",   value: order.status==="active" ? `${days}d` : "—", icon:"⏱️" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <span className="text-xl">{icon}</span>
              <p className="font-bold text-gray-900 dark:text-white text-lg mt-1">{value}</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Company",      order.company?.name],
            ["Package",      `${order.packageSnapshot?.name} (${order.packageSnapshot?.type})`],
            ["Start Date",   fmtDate(order.startDate)],
            ["End Date",     fmtDate(order.endDate)],
            ["Amount",       fmtVND(order.payment?.amount)],
            ["Payment",      order.payment?.status],
            ["Priority",     `${order.packageSnapshot?.priority} / 10`],
            ["Max Impr.",    order.packageSnapshot?.maxImpressions ? fmt(order.packageSnapshot.maxImpressions) : "Unlimited"],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-gray-400 dark:text-slate-500 text-xs mb-0.5">{label}</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{value || "—"}</p>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20
                          rounded-xl px-4 py-3">
            <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold mb-1">Admin Note</p>
            <p className="text-amber-800 dark:text-amber-300 text-sm">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-slate-800">
          {order.status === "pending" && (
            <Button variant="success" onClick={() => onApprove(order._id)}>
              ✓ Approve & Activate
            </Button>
          )}
          {order.status === "active" && (
            <Button variant="danger" onClick={() => onUpdateStatus(order._id, "pause")}>
              ⏸ Pause
            </Button>
          )}
          {order.status === "paused" && (
            <Button variant="success" onClick={() => onUpdateStatus(order._id, "resume")}>
              ▶ Resume
            </Button>
          )}
          {["pending","active","paused"].includes(order.status) && (
            <Button variant="danger" onClick={() => onUpdateStatus(order._id, "cancel")}>
              ✕ Cancel
            </Button>
          )}
          <div className="flex-1"/>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function AdvertisementsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [stats, setStats]     = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Packages ──────────────────────────────────────────────────────────────
  const [packages, setPackages]   = useState([]);
  const [pkgModal, setPkgModal]   = useState(false);
  const [editPkg, setEditPkg]     = useState(null);
  const [pkgForm, setPkgForm]     = useState(EMPTY_PKG);
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgError, setPkgError]   = useState("");

  // ── Orders ────────────────────────────────────────────────────────────────
  const [orders, setOrders]         = useState([]);
  const [pagination, setPag]        = useState({ page:1, totalPages:1, total:0 });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [statusFilter, setStatusFilter]   = useState("");
  const [page, setPage]             = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);

  // ── Create order modal ────────────────────────────────────────────────────
  const [orderModal, setOrderModal]   = useState(false);
  const [orderForm, setOrderForm]     = useState(EMPTY_ORDER);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderError, setOrderError]   = useState("");

  // ─── Fetchers ──────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await adService.getStats()); } catch(e){ console.error(e); }
    finally { setStatsLoading(false); }
  }, []);

  const fetchPackages = useCallback(async () => {
    try { setPackages(await adService.getPackages()); } catch(e){ console.error(e); }
  }, []);

  const fetchOrders = useCallback(async (p = 1) => {
    setOrdersLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const result = await adService.getOrders(params);
      setOrders(result.orders);
      setPag(result.pagination);
      setPage(p);
    } catch(e){ console.error(e); }
    finally { setOrdersLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchStats(); fetchPackages(); }, []);
  useEffect(() => { if (activeTab === "orders") fetchOrders(1); }, [activeTab, statusFilter]);

  // ─── Package CRUD ──────────────────────────────────────────────────────────
  const openCreatePkg = () => { setEditPkg(null); setPkgForm(EMPTY_PKG); setPkgError(""); setPkgModal(true); };
  const openEditPkg   = (pkg) => {
    setEditPkg(pkg);
    setPkgForm({
      name: pkg.name, type: pkg.type, description: pkg.description||"",
      price: pkg.price, durationDays: pkg.durationDays,
      maxImpressions: pkg.maxImpressions||"", priority: pkg.priority,
      features: pkg.features?.join("\n")||"",
    });
    setPkgError(""); setPkgModal(true);
  };

  const handleSavePkg = async () => {
    setPkgSaving(true); setPkgError("");
    try {
      const payload = {
        ...pkgForm,
        price:          Number(pkgForm.price),
        durationDays:   Number(pkgForm.durationDays),
        priority:       Number(pkgForm.priority),
        maxImpressions: pkgForm.maxImpressions ? Number(pkgForm.maxImpressions) : null,
        features:       pkgForm.features ? pkgForm.features.split("\n").map(s=>s.trim()).filter(Boolean) : [],
      };
      if (editPkg) await adService.updatePackage(editPkg._id, payload);
      else         await adService.createPackage(payload);
      setPkgModal(false); fetchPackages(); fetchStats();
    } catch(e) { setPkgError(e.response?.data?.message || "Something went wrong"); }
    finally { setPkgSaving(false); }
  };

  const handleDeletePkg = async (id) => {
    if (!confirm("Delete this package?")) return;
    try { await adService.deletePackage(id); fetchPackages(); }
    catch(e) { alert(e.response?.data?.message||"Error"); }
  };

  // ─── Order actions ─────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    try {
      await adService.approveOrder(id);
      setDetailOrder(null); fetchOrders(page); fetchStats();
    } catch(e) { alert(e.response?.data?.message||"Error"); }
  };

  const handleUpdateStatus = async (id, action) => {
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this ad?`)) return;
    try {
      await adService.updateOrderStatus(id, action);
      setDetailOrder(null); fetchOrders(page); fetchStats();
    } catch(e) { alert(e.response?.data?.message||"Error"); }
  };

  const handleCreateOrder = async () => {
    setOrderSaving(true); setOrderError("");
    try {
      await adService.createOrder({
        company:          orderForm.company,
        location:         orderForm.location,
        packageId:        orderForm.packageId,
        startDate:        orderForm.startDate,
        paymentMethod:    orderForm.paymentMethod,
        paymentReference: orderForm.paymentReference,
      });
      setOrderModal(false); setOrderForm(EMPTY_ORDER);
      fetchOrders(page); fetchStats();
    } catch(e) { setOrderError(e.response?.data?.message||"Something went wrong"); }
    finally { setOrderSaving(false); }
  };

  // ─── Table columns ─────────────────────────────────────────────────────────
  const orderColumns = [
    { key:"location", label:"Location", render:(_,r)=>(
      <div>
        <p className="font-medium text-sm text-gray-900 dark:text-white">{r.location?.name||"—"}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">{r.location?.address?.city||""}</p>
      </div>
    )},
    { key:"company",  label:"Company",  render:(_,r)=>(
      <span className="text-sm text-gray-700 dark:text-slate-300">{r.company?.name||"—"}</span>
    )},
    { key:"packageSnapshot", label:"Package", render:(v)=>(
      <Badge label={v?.name||"—"} color={PKG_COLOR[v?.type]||"blue"} />
    )},
    { key:"status",  label:"Status",  render:(v)=><StatusBadge status={v}/> },
    { key:"endDate", label:"Expires", render:(v,r)=>(
      <div>
        <p className="text-sm text-gray-700 dark:text-slate-300">{fmtDate(v)}</p>
        {r.status==="active" && (
          <p className={`text-xs font-medium ${daysLeft(v)<=3?"text-red-500":"text-gray-400 dark:text-slate-500"}`}>
            {daysLeft(v)}d left
          </p>
        )}
      </div>
    )},
    { key:"stats", label:"Impr. / Clicks", render:(v)=>(
      <span className="text-sm text-gray-700 dark:text-slate-300">
        {fmt(v?.impressions)} / {fmt(v?.clicks)}
      </span>
    )},
    { key:"payment", label:"Amount", render:(v)=>(
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtVND(v?.amount)}</p>
        <Badge label={v?.status||"—"} color={v?.status==="paid"?"green":"yellow"} size="sm" />
      </div>
    )},
    { key:"actions", label:"", render:(_,row)=>(
      <Button size="sm" variant="ghost" onClick={()=>setDetailOrder(row)}>Detail</Button>
    )},
  ];

  const pf = (key) => ({ value: pkgForm[key]??"", onChange:(e)=>setPkgForm({...pkgForm,[key]:e.target.value}) });
  const of = (key) => ({ value: orderForm[key]??"", onChange:(e)=>setOrderForm({...orderForm,[key]:e.target.value}) });

  const STATUS_OPTS = ["pending","active","paused","expired","cancelled"];

  return (
    <div>
      <PageHeader
        title="Advertisement Management"
        subtitle="Manage ad packages, orders, and performance"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setOrderForm(EMPTY_ORDER); setOrderError(""); setOrderModal(true); }}>
              + New Order
            </Button>
            <Button onClick={openCreatePkg}>+ New Package</Button>
          </div>
        }
      />

      {/* ── TOP STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Ads"     value={stats?.activeCount  ?? "—"} icon="📢" color="blue"  />
        <StatCard label="Pending Review" value={stats?.pendingCount ?? "—"} icon="⏳" color="amber" />
        <StatCard label="Total Revenue"  value={stats?.revenue != null ? fmtVND(stats.revenue) : "—"} icon="💰" color="green" />
        <StatCard label="Ad Orders"      value={stats?.byStatus?.reduce((a,b)=>a+b.count,0) ?? "—"} icon="📋" color="purple" />
      </div>

      {/* ── TABS ── */}
      <Tabs
        tabs={[
          { key:"overview",  label:"Overview"  },
          { key:"orders",    label:"Orders",    count: stats?.pendingCount||undefined },
          { key:"packages",  label:"Packages"  },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Active Ads */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Currently Running ({stats?.activeOrders?.length ?? 0})
            </h3>
            {!stats?.activeOrders?.length ? (
              <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                No active ads
              </div>
            ) : (
              <div className="space-y-2">
                {stats.activeOrders.map((order) => (
                  <div key={order._id}
                       className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                                  rounded-xl px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {order.location?.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {order.company?.name} · {order.packageSnapshot?.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold
                                     ${daysLeft(order.endDate) <= 3
                                       ? "text-red-500"
                                       : "text-gray-700 dark:text-slate-300"}`}>
                        {daysLeft(order.endDate)}d left
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Expires {fmtDate(order.endDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(order.stats?.impressions)} impr.
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {fmt(order.stats?.clicks)} clicks
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setDetailOrder(order)}>
                      Detail
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Locations */}
          {stats?.topLocations?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Top Performing Locations
              </h3>
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Location</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Impressions</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Clicks</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topLocations.map((loc, i) => {
                      const ctr = loc.totalImpressions
                        ? ((loc.totalClicks / loc.totalImpressions) * 100).toFixed(1)
                        : "0.0";
                      return (
                        <tr key={i} className="border-b border-gray-100 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 text-gray-400 dark:text-slate-500 font-medium">#{i+1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{loc.location?.name}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">{loc.location?.address?.city}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(loc.totalImpressions)}</td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">{fmt(loc.totalClicks)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${Number(ctr)>=3?"text-emerald-600 dark:text-emerald-400":"text-gray-600 dark:text-slate-300"}`}>
                              {ctr}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Orders */}
          {stats?.recentOrders?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Orders</h3>
              <div className="space-y-2">
                {stats.recentOrders.map((o) => (
                  <div key={o._id}
                       className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                                  rounded-xl px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {o.location?.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {o.company?.name} · {fmtDate(o.createdAt)}
                      </p>
                    </div>
                    <Badge label={o.package?.name||"—"} color={PKG_COLOR[o.package?.type]||"blue"} />
                    <StatusBadge status={o.status} />
                    <p className="font-semibold text-sm text-gray-900 dark:text-white shrink-0">
                      {fmtVND(o.payment?.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: ORDERS
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "orders" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-700 dark:text-slate-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all">
              <option value="">All Statuses</option>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>

          <Table
            columns={orderColumns}
            data={orders}
            loading={ordersLoading}
            emptyText="No ad orders found"
            emptyIcon="📢"
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={15}
            onChange={fetchOrders}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: PACKAGES
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "packages" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg._id} pkg={pkg} onEdit={openEditPkg} onDelete={handleDeletePkg}/>
            ))}
            {packages.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400 dark:text-slate-500 text-sm">
                No packages yet. Click "+ New Package" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Package Modal ── */}
      <Modal open={pkgModal} onClose={()=>setPkgModal(false)}
        title={editPkg?"Edit Package":"Create Ad Package"} size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={()=>setPkgModal(false)}>Cancel</Button>
            <Button onClick={handleSavePkg} loading={pkgSaving}>
              {editPkg?"Update":"Create"}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Package Name" required>
              <Input {...pf("name")} placeholder="e.g. Standard 30 Days"/>
            </FormField>
            <FormField label="Type">
              <Select {...pf("type")}>
                {["basic","standard","premium"].map(t=>(
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <Input {...pf("description")} placeholder="Brief description..."/>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (VND)" required>
              <Input {...pf("price")} type="number" placeholder="500000"/>
            </FormField>
            <FormField label="Duration (days)" required>
              <Input {...pf("durationDays")} type="number" placeholder="30"/>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Max Impressions" hint="Leave empty for unlimited">
              <Input {...pf("maxImpressions")} type="number" placeholder="10000"/>
            </FormField>
            <FormField label="Priority (1–10)" hint="Higher = shown first">
              <Input {...pf("priority")} type="number" min={1} max={10} placeholder="5"/>
            </FormField>
          </div>
          <FormField label="Features" hint="One feature per line">
            <Textarea {...pf("features")} rows={4}
              placeholder={"Top placement in search\nHighlighted AD badge\nWeekly analytics report"}/>
          </FormField>
          {pkgError && <p className="text-red-500 text-sm bg-red-500/10 rounded-xl px-4 py-3">{pkgError}</p>}
        </div>
      </Modal>

      {/* ── Create Order Modal ── */}
      <Modal open={orderModal} onClose={()=>setOrderModal(false)}
        title="Create Ad Order" size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={()=>setOrderModal(false)}>Cancel</Button>
            <Button onClick={handleCreateOrder} loading={orderSaving}>Create Order</Button>
          </div>
        }>
        <div className="space-y-4">
          <FormField label="Company User ID" required hint="MongoDB _id of the company account">
            <Input {...of("company")} placeholder="6..."/>
          </FormField>
          <FormField label="Location ID" required hint="MongoDB _id of the location">
            <Input {...of("location")} placeholder="6..."/>
          </FormField>
          <FormField label="Package" required>
            <Select {...of("packageId")}>
              <option value="">Select a package...</option>
              {packages.filter(p=>p.isActive).map(p=>(
                <option key={p._id} value={p._id}>
                  {p.name} — {fmtVND(p.price)} / {p.durationDays}d
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Start Date">
            <Input {...of("startDate")} type="date"/>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Method">
              <Select {...of("paymentMethod")}>
                {["manual","bank_transfer","credit_card","ewallet"].map(m=>(
                  <option key={m} value={m}>{m.replace("_"," ")}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Reference / Transaction ID">
              <Input {...of("paymentReference")} placeholder="TXN-001"/>
            </FormField>
          </div>
          {orderError && <p className="text-red-500 text-sm bg-red-500/10 rounded-xl px-4 py-3">{orderError}</p>}
        </div>
      </Modal>

      {/* ── Order Detail Modal ── */}
      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onApprove={handleApprove}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}