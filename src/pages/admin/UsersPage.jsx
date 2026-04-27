import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/axios";
import {
  Table, StatusBadge, RoleBadge, Button, Modal,
  FormField, Input, Select, PageHeader, StatCard,
  SearchBar, Pagination,
} from "../../components/ui";

const ROLES    = ["user","admin","staff","company","approved"];
const STATUSES = ["active","suspended","banned"];
const EMPTY_FORM = { name:"", email:"", password:"", role:"user", status:"active" };

const fmtVND  = (n) => n >= 1_000_000 ? `₫${(n/1_000_000).toFixed(1)}M` : `₫${Math.round((n||0)/1000)}k`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";

// ─── User Detail Modal ────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose }) {
  const [locations, setLocations] = useState([]);
  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const isCompany = user.role === "company";
    Promise.all([
      isCompany
        ? api.get("/locations", { params: { submittedBy: user._id, status:"all", limit:10 } })
            .then(r => r.data.data?.locations ?? [])
        : Promise.resolve([]),
      api.get("/bookings/admin", { params: { userId: user._id, limit:8 } })
        .then(r => r.data.data?.orders ?? [])
        .catch(() => []),
    ])
      .then(([locs, ords]) => { setLocations(locs); setBookings(ords); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (!user) return null;

  const STATUS_CLS = {
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    pending:   "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    cancelled: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    completed: "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border
                      border-gray-200 dark:border-slate-700 shadow-2xl max-h-[85vh] flex flex-col"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20
                          flex items-center justify-center text-blue-600 dark:text-blue-400
                          font-bold text-sm shrink-0">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role}/>
            <StatusBadge status={user.status}/>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                       hover:text-gray-700 dark:hover:text-white hover:bg-gray-100
                       dark:hover:bg-slate-800 transition-colors text-xl">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* User info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ["Joined",      fmtDate(user.createdAt)],
              ["Trust Score", user.trustScore ?? 0],
              ["Phone",       user.phone || "—"],
              ...(user.role === "company" && user.defaultPolicy ? [
                user.defaultPolicy.checkInTime  ? ["Default check-in",  user.defaultPolicy.checkInTime]  : null,
                user.defaultPolicy.checkOutTime ? ["Default check-out", user.defaultPolicy.checkOutTime] : null,
                user.defaultPolicy.cancellation ? ["Cancellation",      user.defaultPolicy.cancellation]  : null,
              ] : []),
            ].filter(Boolean).map(([k,v]) => (
              <div key={k} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5">{k}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{v}</p>
              </div>
            ))}
          </div>

          {loading && <p className="text-sm text-gray-400 text-center py-4">Loading...</p>}

          {/* Company locations */}
          {!loading && user.role === "company" && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Locations ({locations.length})
              </h4>
              {locations.length === 0 ? (
                <p className="text-xs text-gray-400">No locations</p>
              ) : (
                <div className="space-y-1.5">
                  {locations.map(loc => (
                    <div key={loc._id}
                      className="flex items-center justify-between px-3 py-2
                                 bg-gray-50 dark:bg-slate-800 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{loc.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {loc.category} · {loc.address?.city || ""}
                        </p>
                      </div>
                      <StatusBadge status={loc.status} size="sm"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent bookings */}
          {!loading && bookings.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Recent Bookings ({bookings.length})
              </h4>
              <div className="space-y-1.5">
                {bookings.map(b => (
                  <div key={b._id}
                    className="flex items-center justify-between px-3 py-2
                               bg-gray-50 dark:bg-slate-800 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {b.location?.name || b.bookingType}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {fmtDate(b.createdAt)}
                        {b.totalAmount ? ` · ${fmtVND(b.totalAmount)}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full
                      ${STATUS_CLS[b.status] || STATUS_CLS.pending}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && bookings.length === 0 && (
            <p className="text-xs text-gray-400">No bookings</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { dark } = useOutletContext() || {};

  const [users, setUsers]       = useState([]);
  const [pagination, setPag]    = useState({ page:1, totalPages:1, total:0 });
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [filterRole, setFilterRole]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");
  const [detailUser, setDetailUser] = useState(null);

  const fetchUsers = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:15 };
      if (search)       params.search = search;
      if (filterRole)   params.role   = filterRole;
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get("/users", { params });
      setUsers(data.data.users);
      setPag(data.data.pagination);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterRole, filterStatus]);

  const fetchStats = useCallback(async () => {
    try { const {data} = await api.get("/users/stats"); setStats(data.data); } catch {}
  }, []);

  useEffect(() => { fetchUsers(1); }, [search, filterRole, filterStatus]);
  useEffect(() => { fetchStats(); }, []);

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setFormError(""); setModalOpen(true); };
  const openEdit   = (u) => {
    setEditUser(u);
    setForm({ name:u.name, email:u.email, password:"", role:u.role, status:u.status });
    setFormError(""); setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setFormError("");
    try {
      if (editUser) await api.put(`/users/${editUser._id}`, { name:form.name, role:form.role, status:form.status });
      else          await api.post("/users", form);
      setModalOpen(false); fetchUsers(page); fetchStats();
    } catch (e) { setFormError(e.response?.data?.message||"Something went wrong"); }
    finally { setSaving(false); }
  };

  const handleChangeStatus = async (id, status) => {
    try { await api.patch(`/users/${id}/status`, { status }); fetchUsers(page); }
    catch (e) { alert(e.response?.data?.message||"Error"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user?")) return;
    try { await api.delete(`/users/${id}`); fetchUsers(page); fetchStats(); }
    catch (e) { alert(e.response?.data?.message||"Error"); }
  };

  const total     = stats?.byRole?.reduce((a,b)=>a+b.count,0)??"—";
  const active    = stats?.byStatus?.find(s=>s._id==="active")?.count??"—";
  const approved  = stats?.byRole?.find(r=>r._id==="approved")?.count??"—";
  const suspended = stats?.byStatus?.find(s=>s._id==="suspended")?.count??"—";

  const selectCls = `border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
    ${dark?"bg-slate-800 border-slate-700 text-slate-300":"bg-white border-gray-200 text-gray-700"}`;

  const columns = [
    { key:"name",  label:"Name" },
    { key:"email", label:"Email" },
    { key:"role",  label:"Role",   render:(v)=><RoleBadge role={v}/> },
    { key:"status",label:"Status", render:(v)=><StatusBadge status={v}/> },
    { key:"trustScore", label:"Trust Score", render:(v)=>(
      <span className="text-amber-500 font-semibold text-sm">{v??0}</span>
    )},
    { key:"createdAt", label:"Joined", render:(v)=>v?new Date(v).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—" },
    { key:"actions", label:"", render:(_,row)=>(
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={()=>setDetailUser(row)}>View</Button>
        <Button size="sm" variant="ghost" onClick={()=>openEdit(row)}>Edit</Button>
        {row.status==="active"
          ? <Button size="sm" variant="danger"  onClick={()=>handleChangeStatus(row._id,"suspended")}>Suspend</Button>
          : <Button size="sm" variant="success" onClick={()=>handleChangeStatus(row._id,"active")}>Activate</Button>
        }
        <Button size="sm" variant="danger" onClick={()=>handleDelete(row._id)}>Delete</Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="View, create and manage all accounts"
        action={<Button onClick={openCreate}>+ Create User</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Accounts"  value={total}     icon="👥" color="blue"  />
        <StatCard label="Active"          value={active}    icon="✅" color="green" />
        <StatCard label="Approved Team"   value={approved}  icon="⭐" color="amber" />
        <StatCard label="Suspended"       value={suspended} icon="🔒" color="red"   />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." />
        <select value={filterRole} onChange={(e)=>setFilterRole(e.target.value)} className={selectCls}>
          <option value="">All Roles</option>
          {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Table columns={columns} data={users} loading={loading} emptyText="No users found" emptyIcon="👥" />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={15} onChange={fetchUsers}/>

      {/* User detail modal */}
      {detailUser && (
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)}/>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editUser?"Edit User":"Create New User"} size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={()=>setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editUser?"Update":"Create"}</Button>
          </div>
        }>
        <div className="space-y-4">
          <FormField label="Display Name" required>
            <Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="Full name"/>
          </FormField>
          {!editUser && (<>
            <FormField label="Email" required>
              <Input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="email@example.com"/>
            </FormField>
            <FormField label="Password" required>
              <Input type="password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} placeholder="Min. 6 characters"/>
            </FormField>
          </>)}
          <FormField label="Role">
            <Select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}>
              {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>
              {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </Select>
          </FormField>
          {formError && <p className="text-red-500 text-sm bg-red-500/10 rounded-xl px-4 py-3">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
}