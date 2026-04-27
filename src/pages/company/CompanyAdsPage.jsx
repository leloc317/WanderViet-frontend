import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import companyService from "../../services/company.service";
import {
  Table, StatusBadge, Badge, Button, Modal,
  FormField, Select, PageHeader, StatCard,
  Pagination, Tabs,
} from "../../components/ui";

const fmt     = (n)  => (n ?? 0).toLocaleString("en-US");
const fmtVND  = (n)  => `₫${(n ?? 0).toLocaleString("en-US")}`;
const fmtDate = (d)  => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000));
const PKG_COLOR = { basic:"blue", standard:"purple", premium:"amber" };

// ─── Package card ─────────────────────────────────────────────────────────────
function PackageCard({ pkg, selected, onSelect }) {
  const color = PKG_COLOR[pkg.type] ?? "blue";
  const isPopular = pkg.type === "standard";
  return (
    <div onClick={() => onSelect(pkg)}
      className={`relative rounded-2xl p-5 border-2 cursor-pointer transition-all
                  ${selected?._id === pkg._id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                    : isPopular
                      ? "border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-900"
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600"}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white
                        text-[10px] font-bold px-3 py-0.5 rounded-full">
          POPULAR
        </div>
      )}
      {selected?._id === pkg._id && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-600 rounded-full
                        flex items-center justify-center text-white text-xs">✓</div>
      )}

      <div className="mb-3">
        <Badge label={pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)} color={color} />
        <h3 className="font-bold text-gray-900 dark:text-white text-lg mt-2">{pkg.name}</h3>
        {pkg.description && (
          <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{pkg.description}</p>
        )}
      </div>

      <div className="mb-4">
        <span className="text-2xl font-black text-gray-900 dark:text-white">
          {fmtVND(pkg.price)}
        </span>
        <span className="text-gray-400 dark:text-slate-500 text-sm ml-1">
          / {pkg.durationDays} days
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-2.5 py-2 text-center">
          <p className="text-xs text-gray-400 dark:text-slate-500">Priority</p>
          <p className="font-bold text-gray-900 dark:text-white">{pkg.priority}/10</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-2.5 py-2 text-center">
          <p className="text-xs text-gray-400 dark:text-slate-500">Impressions</p>
          <p className="font-bold text-gray-900 dark:text-white">
            {pkg.maxImpressions ? fmt(pkg.maxImpressions) : "∞"}
          </p>
        </div>
      </div>

      {pkg.features?.length > 0 && (
        <ul className="space-y-1.5">
          {pkg.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
              <span className="text-emerald-500 shrink-0">✓</span> {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Order detail modal ───────────────────────────────────────────────────────
function OrderDetailModal({ orderId, onClose, onRenew }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!orderId) return;
    companyService.getAdById(orderId).then(setData).catch(console.error);
  }, [orderId]);

  if (!orderId) return null;
  if (!data) return (
    <Modal open title="Ad Order" onClose={onClose} size="md">
      <div className="animate-pulse space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 dark:bg-slate-800 rounded-xl"/>)}
      </div>
    </Modal>
  );

  const { order, ctr, daysLeft: dl } = data;

  return (
    <Modal open onClose={onClose} title="Ad Order Detail" size="lg"
      footer={
        <div className="flex justify-end gap-3">
          {["expired","cancelled"].includes(order.status) && (
            <Button variant="success" onClick={() => onRenew(order._id)}>
              🔄 Renew
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }>
      <div className="space-y-5">
        {/* Location */}
        <div className="flex items-center gap-3">
          {order.location?.images?.[0]?.url ? (
            <img src={order.location.images[0].url} alt=""
              className="w-16 h-16 rounded-xl object-cover shrink-0"/>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0">
              🏞️
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{order.location?.name}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{order.location?.address?.city}</p>
            <StatusBadge status={order.status} size="sm"/>
          </div>
        </div>

        {/* Performance stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:"Impressions", value: fmt(order.stats?.impressions), icon:"👁️" },
            { label:"Clicks",      value: fmt(order.stats?.clicks),       icon:"🖱️" },
            { label:"CTR",         value: `${ctr}%`,                      icon:"📊" },
            { label:"Days Left",   value: order.status==="active" ? `${dl}d` : "—", icon:"⏱️" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <span className="text-lg">{icon}</span>
              <p className="font-bold text-gray-900 dark:text-white text-lg mt-1">{value}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Package",    `${order.packageSnapshot?.name} (${order.packageSnapshot?.type})`],
            ["Amount Paid",fmtVND(order.payment?.amount)],
            ["Start Date", fmtDate(order.startDate)],
            ["End Date",   fmtDate(order.endDate)],
            ["Priority",   `${order.packageSnapshot?.priority}/10`],
            ["Payment",    order.payment?.method],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function CompanyAdsPage() {
  const routeState = useLocation().state;

  const [activeTab, setActiveTab] = useState("orders");
  const [orders,    setOrders]    = useState([]);
  const [pagination, setPag]      = useState({ page:1, totalPages:1, total:0 });
  const [ordersLoading, setOL]    = useState(false);
  const [statusFilter, setSF]     = useState("");
  const [page, setPage]           = useState(1);

  const [packages,  setPackages]  = useState([]);
  const [locations, setLocations] = useState([]);

  // Purchase flow
  const [selectedPkg, setSelectedPkg]   = useState(null);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm]  = useState({
    locationId: routeState?.locationId || "",
    startDate:  new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    paymentReference: "",
  });
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  // Renew
  const [renewModal, setRenewModal] = useState(null);
  const [renewing, setRenewing]     = useState(false);

  // Detail
  const [detailId, setDetailId] = useState(null);

  // Stats
  const [stats, setStats] = useState({ impr:0, clicks:0, active:0, totalSpend:0 });

  const fetchOrders = useCallback(async (p = 1) => {
    setOL(true);
    try {
      const params = { page: p, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const result = await companyService.getAds(params);
      setOrders(result.orders);
      setPag(result.pagination);
      setPage(p);

      // Compute stats from orders
      const allOrders = result.orders;
      setStats({
        impr:       allOrders.reduce((a,o) => a + (o.stats?.impressions ?? 0), 0),
        clicks:     allOrders.reduce((a,o) => a + (o.stats?.clicks      ?? 0), 0),
        active:     allOrders.filter(o => o.status === "active").length,
        totalSpend: allOrders.reduce((a,o) => a + (o.payment?.amount    ?? 0), 0),
      });
    } catch(e){ console.error(e); }
    finally { setOL(false); }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders(1);
    Promise.all([
      companyService.getPackages(),
      companyService.getLocations({ limit: 50 }),
    ]).then(([pkgs, locs]) => {
      setPackages(pkgs);
      setLocations(locs.locations.filter(l => l.status === "approved"));
    }).catch(console.error);
  }, []);

  useEffect(() => { fetchOrders(1); }, [statusFilter]);

  // Auto-open purchase if came from Locations page
  useEffect(() => {
    if (routeState?.locationId && packages.length > 0) {
      setActiveTab("packages");
    }
  }, [routeState, packages.length]);

  const handlePurchase = async () => {
    if (!selectedPkg)            { setPurchaseError("Please select a package"); return; }
    if (!purchaseForm.locationId){ setPurchaseError("Please select a location"); return; }
    setPurchasing(true); setPurchaseError("");
    try {
      await companyService.purchaseAd({
        locationId:       purchaseForm.locationId,
        packageId:        selectedPkg._id,
        startDate:        purchaseForm.startDate,
        paymentMethod:    purchaseForm.paymentMethod,
        paymentReference: purchaseForm.paymentReference,
      });
      setPurchaseModal(false); setSelectedPkg(null);
      setActiveTab("orders"); fetchOrders(1);
    } catch(e) { setPurchaseError(e.response?.data?.message || "Purchase failed"); }
    finally { setPurchasing(false); }
  };

  const handleRenew = async (orderId) => {
    setRenewing(true);
    try {
      await companyService.renewAd(orderId, { paymentReference: "" });
      setRenewModal(null); setDetailId(null); fetchOrders(page);
    } catch(e) { alert(e.response?.data?.message || "Error"); }
    finally { setRenewing(false); }
  };

  const ctr = stats.impr > 0 ? ((stats.clicks / stats.impr) * 100).toFixed(1) : "0.0";

  const orderColumns = [
    { key:"location", label:"Location", render:(_,r) => (
      <div className="flex items-center gap-2.5">
        {r.location?.images?.[0]?.url ? (
          <img src={r.location.images[0].url} alt=""
            className="w-8 h-8 rounded-lg object-cover shrink-0"/>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">
            🏞️
          </div>
        )}
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-white">{r.location?.name || "—"}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">{r.location?.address?.city}</p>
        </div>
      </div>
    )},
    { key:"packageSnapshot", label:"Package", render:(v) => (
      <Badge label={v?.name||"—"} color={PKG_COLOR[v?.type]||"blue"} />
    )},
    { key:"status",  label:"Status",   render:(v) => <StatusBadge status={v}/> },
    { key:"endDate", label:"Expires",  render:(v,r) => (
      <div>
        <p className="text-sm text-gray-700 dark:text-slate-300">{fmtDate(v)}</p>
        {r.status === "active" && (
          <p className={`text-xs font-medium ${daysLeft(v)<=3?"text-red-500":"text-gray-400 dark:text-slate-500"}`}>
            {daysLeft(v)}d left
          </p>
        )}
      </div>
    )},
    { key:"stats", label:"Impr. / Clicks", render:(v) => (
      <span className="text-sm text-gray-700 dark:text-slate-300">
        {fmt(v?.impressions)} / {fmt(v?.clicks)}
      </span>
    )},
    { key:"payment", label:"Amount", render:(v) => (
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {fmtVND(v?.amount)}
      </span>
    )},
    { key:"actions", label:"", render:(_,row) => (
      <div className="flex gap-1.5">
        <Button size="xs" variant="ghost" onClick={() => setDetailId(row._id)}>Detail</Button>
        {["expired","cancelled"].includes(row.status) && (
          <Button size="xs" variant="success" onClick={() => setRenewModal(row._id)}>Renew</Button>
        )}
      </div>
    )},
  ];

  const selectCls = `bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                     text-gray-700 dark:text-slate-300 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all`;

  return (
    <div>
      <PageHeader
        title="Advertisements"
        subtitle="Buy packages, manage your running ads and track performance"
        action={
          <Button onClick={() => setActiveTab("packages")} variant="primary">
            + Buy Package
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Impressions" value={fmt(stats.impr)}        icon="👁️" color="blue"   />
        <StatCard label="Total Clicks"      value={fmt(stats.clicks)}      icon="🖱️" color="green"  />
        <StatCard label="CTR"               value={`${ctr}%`}              icon="📊" color="purple" />
        <StatCard label="Total Spent"       value={fmtVND(stats.totalSpend)}icon="💰" color="amber"  />
      </div>

      <Tabs
        tabs={[
          { key:"orders",   label:"My Orders",    count: stats.active || undefined },
          { key:"packages", label:"Buy Package"   },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ── ORDERS TAB ── */}
      {activeTab === "orders" && (
        <div>
          <div className="flex gap-3 mb-4">
            <select value={statusFilter} onChange={(e)=>setSF(e.target.value)} className={selectCls}>
              <option value="">All Orders</option>
              {["pending","active","paused","expired","cancelled"].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
          </div>
          <Table columns={orderColumns} data={orders} loading={ordersLoading}
            emptyText="No ad orders yet" emptyIcon="📢"/>
          <Pagination page={pagination.page} totalPages={pagination.totalPages}
            total={pagination.total} limit={10} onChange={fetchOrders}/>
        </div>
      )}

      {/* ── PACKAGES TAB ── */}
      {activeTab === "packages" && (
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
            Select a package to advertise one of your approved locations.
            Your order will be reviewed by Admin before going live.
          </p>

          {packages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">
              No packages available yet. Contact admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {packages.map(pkg => (
                <PackageCard key={pkg._id} pkg={pkg}
                  selected={selectedPkg} onSelect={setSelectedPkg}/>
              ))}
            </div>
          )}

          {selectedPkg && (
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-600/40
                            rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Configure your ad — {selectedPkg.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField label="Select Location" required>
                  <select
                    value={purchaseForm.locationId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, locationId: e.target.value })}
                    className={selectCls + " w-full"}>
                    <option value="">Choose an approved location...</option>
                    {locations.map(l => (
                      <option key={l._id} value={l._id}>{l.name} — {l.address?.city}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Start Date">
                  <input type="date" value={purchaseForm.startDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, startDate: e.target.value })}
                    className={selectCls + " w-full"}/>
                </FormField>
                <FormField label="Payment Method">
                  <Select value={purchaseForm.paymentMethod}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="ewallet">E-Wallet</option>
                  </Select>
                </FormField>
                <FormField label="Transaction Reference">
                  <input type="text" value={purchaseForm.paymentReference}
                    placeholder="e.g. TXN-2024-001"
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentReference: e.target.value })}
                    className={selectCls + " w-full"}/>
                </FormField>
              </div>

              {/* Order summary */}
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Order Summary</p>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-slate-300">Package</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-slate-300">Duration</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPkg.durationDays} days</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-slate-700 mt-2">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {fmtVND(selectedPkg.price)}
                  </span>
                </div>
              </div>

              {purchaseError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3 mb-4">
                  {purchaseError}
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setSelectedPkg(null)}>Cancel</Button>
                <Button onClick={handlePurchase} loading={purchasing} fullWidth>
                  Submit Order — {fmtVND(selectedPkg.price)}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order detail modal */}
      <OrderDetailModal
        orderId={detailId}
        onClose={() => setDetailId(null)}
        onRenew={(id) => { setDetailId(null); setRenewModal(id); }}
      />

      {/* Renew confirm modal */}
      <Modal open={!!renewModal} onClose={() => setRenewModal(null)}
        title="Renew Ad Order" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRenewModal(null)}>Cancel</Button>
            <Button variant="success" loading={renewing}
              onClick={() => handleRenew(renewModal)}>
              Confirm Renewal
            </Button>
          </div>
        }>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          This will create a new ad order with the same package, starting from today.
          The order will be pending admin approval.
        </p>
      </Modal>
    </div>
  );
}