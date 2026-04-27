import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/axios";
import {
  Table, StatusBadge, CategoryBadge, Badge, Button, Modal,
  FormField, Input, Select, Textarea, PageHeader,
  StatCard, SearchBar, Pagination, Tabs,
} from "../../components/ui";

const CATEGORIES   = ["restaurant","tourist_spot","hotel","cafe","entertainment","shopping","service","other"];
const PRICE_LABELS = ["free","budget","mid","high","luxury"];
const CAT_LABEL    = {
  restaurant:"Restaurant", tourist_spot:"Tourist Spot", hotel:"Hotel",
  cafe:"Cafe", entertainment:"Entertainment", shopping:"Shopping",
  service:"Service", other:"Other",
};

const EMPTY_FORM = {
  name:"", description:"", category:"restaurant",
  city:"", district:"", addressFull:"",
  lng:"", lat:"", priceLabel:"budget", priceMin:"", priceMax:"",
};

export default function LocationsPage() {
  const { dark } = useOutletContext() || {};

  const [locations, setLocations] = useState([]);
  const [pagination, setPag]      = useState({ page:1, totalPages:1, total:0 });
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [page, setPage]           = useState(1);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editLoc, setEditLoc]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  const [approvalModal, setApprovalModal] = useState(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [approving, setApproving]         = useState(false);

  const fetchLocations = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (search)    params.search   = search;
      if (filterCat) params.category = filterCat;

      const statusMap = { all:"all", pending:"pending", approved:"approved", rejected:"rejected", suspended:"suspended" };
      params.status = statusMap[activeTab] || "all";

      const { data } = await api.get("/locations", { params });
      setLocations(data.data?.locations ?? []);
      setPag(data.data?.pagination ?? { page:1, totalPages:1, total:0 });
      setPage(p);
    } catch (e) {
      console.error(e);
      setLocations([]);
    } finally { setLoading(false); }
  }, [activeTab, search, filterCat]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/locations/admin/stats");
      setStats(data.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchLocations(1); }, [activeTab, search, filterCat]);
  useEffect(() => { fetchStats(); }, []);

  const f = (key) => ({ value: form[key]??"", onChange:(e)=>setForm({...form,[key]:e.target.value}) });

  const handleApproval = async () => {
    if (!approvalModal) return;
    setApproving(true);
    try {
      await api.patch(`/locations/${approvalModal.location._id}/approval`, {
        action: approvalModal.action, reason: rejectReason,
      });
      setApprovalModal(null); setRejectReason("");
      fetchLocations(page); fetchStats();
    } catch (e) { alert(e.response?.data?.message||"Error"); }
    finally { setApproving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this location?")) return;
    try { await api.delete(`/locations/${id}`); fetchLocations(page); fetchStats(); }
    catch (e) { alert(e.response?.data?.message||"Error"); }
  };

  const totalLoc = stats?.byStatus?.reduce((a,b)=>a+b.count,0)??"—";
  const approved = stats?.byStatus?.find(s=>s._id==="approved")?.count??"—";
  const pending  = stats?.pendingCount??"—";
  const topName  = stats?.topViewed?.[0]?.name?.slice(0,14)||"—";

  const columns = [
    { key:"name", label:"Name", render:(v,r)=>(
      <div>
        <p className={`font-medium text-sm ${dark?"text-white":"text-gray-900"}`}>{v}</p>
        <p className={`text-xs ${dark?"text-slate-500":"text-gray-400"}`}>{r.address?.city||"—"}</p>
      </div>
    )},
    { key:"category", label:"Category",    render:(v)=><CategoryBadge category={v}/> },
    { key:"status",   label:"Status",      render:(v)=><StatusBadge status={v}/> },
    { key:"rating",   label:"Rating",      render:(v)=>(
      <span className="text-amber-500 text-sm font-semibold">
        ★ {v?.finalScore?.toFixed(1)||"0.0"}
        <span className={`font-normal ml-1 text-xs ${dark?"text-slate-500":"text-gray-400"}`}>({v?.totalReviews||0})</span>
      </span>
    )},
    { key:"advertisement", label:"Ad", render:(v)=>
      v?.isActive ? <Badge label="Active Ad" color="yellow" dot/> : <span className="text-gray-400 text-xs">—</span>
    },
    { key:"actions", label:"", render:(_,row)=>(
      <div className="flex items-center gap-1.5 flex-wrap">
        {row.status==="pending" && (<>
          <Button size="sm" variant="success" onClick={()=>{setApprovalModal({location:row,action:"approve"});setRejectReason("");}}>Approve</Button>
          <Button size="sm" variant="danger"  onClick={()=>{setApprovalModal({location:row,action:"reject"});setRejectReason("");}}>Reject</Button>
        </>)}
        {row.status==="approved" && (
          <Button size="sm" variant="danger" onClick={()=>{setApprovalModal({location:row,action:"suspend"});setRejectReason("");}}>Suspend</Button>
        )}
        <Button size="sm" variant="danger" onClick={()=>handleDelete(row._id)}>Delete</Button>
      </div>
    )},
  ];

  const selectCls = `border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
    ${dark?"bg-slate-800 border-slate-700 text-slate-300":"bg-white border-gray-200 text-gray-700"}`;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Locations" value={totalLoc} icon="📍" color="blue"  />
        <StatCard label="Approved"        value={approved} icon="✅" color="green" />
        <StatCard label="Pending Review"  value={pending}  icon="⏳" color="amber" />
        <StatCard label="Most Viewed"     value={topName}  icon="👁️" color="red"   />
      </div>

      <Tabs
        tabs={[
          { key:"all",       label:"All Locations" },
          { key:"approved",  label:"Approved"      },
          { key:"suspended", label:"Suspended"      },
          { key:"rejected",  label:"Rejected"       },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search locations..." />
        <select value={filterCat} onChange={(e)=>setFilterCat(e.target.value)} className={selectCls}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{CAT_LABEL[c]}</option>)}
        </select>
      </div>

      <Table columns={columns} data={locations} loading={loading} emptyText="No locations found" emptyIcon="📍" />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={15} onChange={fetchLocations} />

      {/* Approval Modal */}
      <Modal open={!!approvalModal} onClose={()=>setApprovalModal(null)}
        title={approvalModal?.action==="approve"?"Approve Location":approvalModal?.action==="suspend"?"Suspend Location":"Reject Location"}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={()=>setApprovalModal(null)}>Cancel</Button>
            <Button variant={approvalModal?.action==="approve"?"success":"danger"} loading={approving} onClick={handleApproval}>
              {approvalModal?.action==="approve"?"Confirm Approval":approvalModal?.action==="suspend"?"Confirm Suspend":"Confirm Rejection"}
            </Button>
          </div>
        }>
        {approvalModal && (
          <div className="space-y-4">
            <p className={`text-sm ${dark?"text-slate-300":"text-gray-600"}`}>
              Location: <span className={`font-semibold ${dark?"text-white":"text-gray-900"}`}>{approvalModal.location.name}</span>
            </p>
            {approvalModal.action!=="approve" && (
              <FormField label="Reason (required)">
                <Textarea value={rejectReason} onChange={(e)=>setRejectReason(e.target.value)}
                  rows={3} placeholder="Missing information, incorrect coordinates..."/>
              </FormField>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}