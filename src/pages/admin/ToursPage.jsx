import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/axios";
import {
  Table, StatusBadge, CategoryBadge, Badge, Button, Modal,
  FormField, Input, Select, Textarea, PageHeader,
  StatCard, SearchBar, Pagination, Tabs,
} from "../../components/ui";

const CATEGORIES    = ["food_tour","sightseeing","adventure","cultural","relaxation","shopping","mixed"];
const BUDGET_LABELS = ["budget","mid","high","luxury"];
const CAT_LABEL     = {
  food_tour:"Food Tour", sightseeing:"Sightseeing", adventure:"Adventure",
  cultural:"Cultural", relaxation:"Relaxation", shopping:"Shopping", mixed:"Mixed",
};
const EMPTY_FORM = { title:"", description:"", category:"mixed", budgetLabel:"mid", days:1, nights:0 };

export default function ToursPage() {
  const { dark } = useOutletContext() || {};

  const [tours, setTours]       = useState([]);
  const [pagination, setPag]    = useState({ page:1, totalPages:1, total:0 });
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [page, setPage]         = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const [approvalModal, setApprovalModal] = useState(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [makeTemplate, setMakeTemplate]   = useState(false);
  const [approving, setApproving]         = useState(false);

  const [voteModal, setVoteModal] = useState(null);
  const [voteForm, setVoteForm]   = useState({ vote:"approve", comment:"" });
  const [voting, setVoting]       = useState(false);

  const [detailModal, setDetailModal] = useState(null);

  const fetchTours = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:15 };
      if (search)    params.search   = search;
      if (filterCat) params.category = filterCat;
      const endpoint = activeTab==="pending" ? "/tours/admin/pending" : "/tours";
      const { data } = await api.get(endpoint, { params });
      setTours(data.data.tours);
      setPag(data.data.pagination);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab, search, filterCat]);

  const fetchStats = useCallback(async () => {
    try { const {data}=await api.get("/tours/admin/stats"); setStats(data.data); } catch {}
  }, []);

  useEffect(() => { fetchTours(1); }, [activeTab, search, filterCat]);
  useEffect(() => { fetchStats(); }, []);

  const f = (key) => ({ value:form[key]??"", onChange:(e)=>setForm({...form,[key]:e.target.value}) });

  const handleCreate = async () => {
    setSaving(true); setFormError("");
    try {
      await api.post("/tours", {
        title:form.title, description:form.description, category:form.category,
        budget:{ label:form.budgetLabel },
        duration:{ days:Number(form.days), nights:Number(form.nights) },
      });
      setCreateOpen(false); setForm(EMPTY_FORM); fetchTours(page); fetchStats();
    } catch (e) { setFormError(e.response?.data?.message||"Something went wrong"); }
    finally { setSaving(false); }
  };

  const handleApproval = async () => {
    if (!approvalModal) return;
    setApproving(true);
    try {
      await api.patch(`/tours/${approvalModal._id}/approval`, {
        action:approvalModal.action, reason:rejectReason, makeTemplate,
      });
      setApprovalModal(null); setRejectReason(""); setMakeTemplate(false);
      fetchTours(page); fetchStats();
    } catch (e) { alert(e.response?.data?.message||"Error"); }
    finally { setApproving(false); }
  };

  const handleVote = async () => {
    if (!voteModal) return;
    setVoting(true);
    try {
      await api.post(`/tours/${voteModal._id}/vote`, voteForm);
      setVoteModal(null); setVoteForm({vote:"approve",comment:""}); fetchTours(page);
    } catch (e) { alert(e.response?.data?.message||"Error"); }
    finally { setVoting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this tour?")) return;
    try { await api.delete(`/tours/${id}`); fetchTours(page); fetchStats(); }
    catch (e) { alert(e.response?.data?.message||"Error"); }
  };

  const totalT   = stats?.byStatus?.reduce((a,b)=>a+b.count,0)??"—";
  const approved = stats?.byStatus?.find(s=>s._id==="approved")?.count??"—";
  const pending  = stats?.pendingCount??"—";

  const selectCls = `border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
    ${dark?"bg-slate-800 border-slate-700 text-slate-300":"bg-white border-gray-200 text-gray-700"}`;

  const columns = [
    { key:"title", label:"Title", render:(v,r)=>(
      <div>
        <button className={`font-medium text-sm hover:text-blue-500 transition-colors text-left
                            ${dark?"text-white":"text-gray-900"}`}
                onClick={()=>setDetailModal(r)}>{v}</button>
        <p className={`text-xs ${dark?"text-slate-500":"text-gray-400"}`}>{CAT_LABEL[r.category]}</p>
      </div>
    )},
    { key:"status",     label:"Status",   render:(v)=><StatusBadge status={v}/> },
    { key:"isTemplate", label:"Template", render:(v)=>v?<Badge label="Template" color="blue"/>:<span className="text-gray-400 text-xs">—</span> },
    { key:"duration",   label:"Duration", render:(v)=><span className={`text-sm ${dark?"text-slate-300":"text-gray-700"}`}>{v?.days||1}d {v?.nights||0}n</span> },
    { key:"budget",     label:"Budget",   render:(v)=><span className={`capitalize text-sm ${dark?"text-slate-300":"text-gray-700"}`}>{v?.label||"—"}</span> },
    { key:"rating",     label:"Rating",   render:(v)=>(
      <span className="text-amber-500 text-sm font-semibold">
        ★ {v?.avg?.toFixed(1)||"0.0"}
        <span className={`font-normal ml-1 text-xs ${dark?"text-slate-500":"text-gray-400"}`}>({v?.count||0})</span>
      </span>
    )},
    { key:"voteStats", label:"AT Votes", render:(v,r)=>
      r.status==="pending_review" ? (
        <div className="flex gap-1.5 text-xs font-medium">
          <span className="text-emerald-500">{v?.approve||0}✓</span>
          <span className="text-red-500">{v?.reject||0}✗</span>
          <span className="text-gray-400">{v?.neutral||0}~</span>
        </div>
      ) : <span className="text-gray-400 text-xs">—</span>
    },
    { key:"actions", label:"", render:(_,row)=>(
      <div className="flex items-center gap-1.5 flex-wrap">
        {row.status==="pending_review" && (<>
          <Button size="sm" variant="success" onClick={()=>{setApprovalModal({...row,action:"approve"});setMakeTemplate(false);setRejectReason("");}}>Approve</Button>
          <Button size="sm" variant="danger"  onClick={()=>{setApprovalModal({...row,action:"reject"});setRejectReason("");}}>Reject</Button>
          <Button size="sm" variant="ghost"   onClick={()=>{setVoteModal(row);setVoteForm({vote:"approve",comment:""});}}>Vote</Button>
        </>)}
        <Button size="sm" variant="danger" onClick={()=>handleDelete(row._id)}>Delete</Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Tour Management"
        subtitle="Create, approve and manage all travel itineraries"
        action={<Button onClick={()=>{setForm(EMPTY_FORM);setFormError("");setCreateOpen(true);}}>+ Create Tour</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tours"    value={totalT}                           icon="🗺️" color="blue"  />
        <StatCard label="Approved"       value={approved}                         icon="✅" color="green" />
        <StatCard label="Pending Review" value={pending}                          icon="⏳" color="amber" />
        <StatCard label="Top Tour"       value={stats?.topTours?.[0]?.title?.slice(0,14)||"—"} icon="⭐" color="red" />
      </div>

      <Tabs
        tabs={[
          { key:"all",     label:"All Tours" },
          { key:"pending", label:"Pending Review", count: typeof pending==="number"?pending:undefined },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tours..." />
        <select value={filterCat} onChange={(e)=>setFilterCat(e.target.value)} className={selectCls}>
          <option value="">All Types</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{CAT_LABEL[c]}</option>)}
        </select>
      </div>

      <Table columns={columns} data={tours} loading={loading} emptyText="No tours found" emptyIcon="🗺️" />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={15} onChange={fetchTours}/>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title="Create New Tour" size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={()=>setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create Tour</Button>
          </div>
        }>
        <div className="space-y-4">
          <FormField label="Title" required><Input {...f("title")} placeholder="3 Days in Da Nang – Hoi An"/></FormField>
          <FormField label="Description"><Textarea {...f("description")} rows={3} placeholder="Tour overview..."/></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select {...f("category")}>{CATEGORIES.map(c=><option key={c} value={c}>{CAT_LABEL[c]}</option>)}</Select>
            </FormField>
            <FormField label="Budget">
              <Select {...f("budgetLabel")}>{BUDGET_LABELS.map(b=><option key={b} value={b}>{b.charAt(0).toUpperCase()+b.slice(1)}</option>)}</Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Days"><Input {...f("days")} type="number" min={1} placeholder="3"/></FormField>
            <FormField label="Nights"><Input {...f("nights")} type="number" min={0} placeholder="2"/></FormField>
          </div>
          {formError && <p className="text-red-500 text-sm bg-red-500/10 rounded-xl px-4 py-3">{formError}</p>}
        </div>
      </Modal>

      {/* Approval Modal */}
      <Modal open={!!approvalModal} onClose={()=>setApprovalModal(null)}
        title={approvalModal?.action==="approve"?"Approve Tour":"Reject Tour"} size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={()=>setApprovalModal(null)}>Cancel</Button>
            <Button variant={approvalModal?.action==="approve"?"success":"danger"} loading={approving} onClick={handleApproval}>
              {approvalModal?.action==="approve"?"Confirm Approval":"Confirm Rejection"}
            </Button>
          </div>
        }>
        {approvalModal && (
          <div className="space-y-4">
            <p className={`text-sm ${dark?"text-slate-300":"text-gray-600"}`}>
              Tour: <span className={`font-semibold ${dark?"text-white":"text-gray-900"}`}>{approvalModal.title}</span>
            </p>
            <div className={`rounded-xl p-4 ${dark?"bg-slate-800":"bg-gray-50"}`}>
              <p className={`text-xs font-semibold mb-2 ${dark?"text-slate-400":"text-gray-500"}`}>Approved Team Votes</p>
              <div className="flex gap-4 text-sm font-medium">
                <span className="text-emerald-500">{approvalModal.voteStats?.approve||0} Approve</span>
                <span className="text-red-500">{approvalModal.voteStats?.reject||0} Reject</span>
                <span className="text-gray-400">{approvalModal.voteStats?.neutral||0} Neutral</span>
              </div>
            </div>
            {approvalModal.action==="approve" && (
              <label className={`flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 border transition-all
                                 ${makeTemplate
                                   ? dark?"border-blue-500/40 bg-blue-500/5":"border-blue-300 bg-blue-50"
                                   : dark?"border-slate-700 bg-slate-800":"border-gray-200 bg-white"}`}>
                <input type="checkbox" checked={makeTemplate} onChange={(e)=>setMakeTemplate(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"/>
                <div>
                  <p className={`text-sm font-medium ${dark?"text-white":"text-gray-900"}`}>Add to Templates</p>
                  <p className={`text-xs ${dark?"text-slate-400":"text-gray-500"}`}>Tour will appear as a suggested itinerary template for all users</p>
                </div>
              </label>
            )}
            {approvalModal.action==="reject" && (
              <FormField label="Rejection Reason">
                <Textarea value={rejectReason} onChange={(e)=>setRejectReason(e.target.value)}
                  rows={3} placeholder="Incomplete itinerary, missing stops..."/>
              </FormField>
            )}
          </div>
        )}
      </Modal>

      {/* Vote Modal */}
      <Modal open={!!voteModal} onClose={()=>setVoteModal(null)} title="Vote on Tour" size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={()=>setVoteModal(null)}>Cancel</Button>
            <Button onClick={handleVote} loading={voting}>Submit Vote</Button>
          </div>
        }>
        {voteModal && (
          <div className="space-y-4">
            <p className={`text-sm ${dark?"text-slate-300":"text-gray-600"}`}>
              Tour: <span className={`font-semibold ${dark?"text-white":"text-gray-900"}`}>{voteModal.title}</span>
            </p>
            <FormField label="Your verdict">
              <div className="flex gap-3">
                {[{v:"approve",l:"✓ Approve"},{v:"neutral",l:"~ Neutral"},{v:"reject",l:"✗ Reject"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setVoteForm({...voteForm,vote:v})}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                      ${voteForm.vote===v
                        ? v==="approve"?"bg-emerald-500/20 border-emerald-500 text-emerald-600"
                          :v==="reject"?"bg-red-500/20 border-red-500 text-red-600"
                          :"bg-gray-200 border-gray-400 text-gray-700"
                        : dark?"bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                               :"bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Comment (optional)">
              <Textarea value={voteForm.comment} onChange={(e)=>setVoteForm({...voteForm,comment:e.target.value})}
                rows={3} placeholder="Well-structured itinerary, good mix of activities..."/>
            </FormField>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={()=>setDetailModal(null)} title="Tour Details" size="md">
        {detailModal && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Title",     detailModal.title],
                ["Type",      CAT_LABEL[detailModal.category]],
                ["Budget",    detailModal.budget?.label],
                ["Duration",  `${detailModal.duration?.days||1}d ${detailModal.duration?.nights||0}n`],
                ["Status",    <StatusBadge status={detailModal.status}/>],
                ["Template",  detailModal.isTemplate?<Badge label="Yes" color="blue"/>:"No"],
                ["Rating",    `★ ${detailModal.rating?.avg?.toFixed(1)||"0.0"} (${detailModal.rating?.count||0})`],
                ["Views",     detailModal.stats?.views||0],
              ].map(([label,value])=>(
                <div key={label} className={`rounded-xl px-3 py-2.5 ${dark?"bg-slate-800":"bg-gray-50"}`}>
                  <p className={`text-xs mb-1 ${dark?"text-slate-400":"text-gray-500"}`}>{label}</p>
                  <p className={`font-medium ${dark?"text-white":"text-gray-900"}`}>{value}</p>
                </div>
              ))}
            </div>
            {detailModal.description && (
              <div className={`rounded-xl px-4 py-3 ${dark?"bg-slate-800":"bg-gray-50"}`}>
                <p className={`text-xs mb-1 ${dark?"text-slate-400":"text-gray-500"}`}>Description</p>
                <p className={dark?"text-slate-300":"text-gray-700"}>{detailModal.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}