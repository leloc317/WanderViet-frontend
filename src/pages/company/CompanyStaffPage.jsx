import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";

function StaffModal({ staff, locations, onClose, onSuccess }) {
  const isEdit = !!staff;
  const [form, setForm] = useState({
    name:       staff?.name ?? "",
    email:      staff?.email ?? "",
    password:   "",
    locationId: staff?.staffInfo?.location?._id ?? staff?.staffInfo?.location ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.locationId) return setError("Name và location required");
    if (!isEdit && (!form.email || !form.password)) return setError("Email và password required khi tạo mới");
    setSaving(true); setError("");
    try {
      if (isEdit) {
        const payload = { name: form.name, locationId: form.locationId };
        if (form.password) payload.password = form.password;
        await api.patch(`/company/staff/${staff._id}`, payload);
      } else {
        await api.post("/company/staff", form);
      }
      onSuccess();
    } catch (e) { setError(e.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white">{isEdit ? "Edit Staff" : "Add Staff"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Full Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nguyen Van A"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
          </div>
          {!isEdit && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Email *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="staff@hotel.com"
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Password *</label>
                <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters"
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
              </div>
            </>
          )}
          {isEdit && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">New Password (leave blank to keep)</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Enter new password"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Assigned Location *</label>
            <select value={form.locationId} onChange={e => set("locationId", e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none">
              <option value="">— Select location —</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>{loc.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">1 staff can only be assigned to 1 location</p>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-600 dark:text-slate-400">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Staff"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyStaffPage() {
  const [staff,     setStaff]     = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | "add" | staff object

  const fetchData = useCallback(async () => {
    try {
      const [sr, lr] = await Promise.all([
        api.get("/company/staff"),
        api.get("/company/locations"),
      ]);
      setStaff(sr.data.data ?? []);
      setLocations(lr.data.data?.locations ?? lr.data.data ?? lr.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (s) => {
    if (!confirm(`Remove staff ${s.name}? They will lose access immediately.`)) return;
    try { await api.delete(`/company/staff/${s._id}`); fetchData(); }
    catch (e) { alert(e.response?.data?.message ?? "Error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {staff.length} staff member{staff.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setModal("add")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
          + Add Staff
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl px-4 py-3 mb-5">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          ℹ️ Staff accounts can check-in/out guests and manage units for their assigned location. Each location can only have one staff member.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No staff yet</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Add staff members to manage check-ins at your locations</p>
          <button onClick={() => setModal("add")} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">Add First Staff</button>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(s => {
            const loc = s.staffInfo?.location;
            return (
              <div key={s._id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-sm">{s.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{s.email}</p>
                    {loc ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          📍 {loc.name ?? "Location assigned"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 block">⚠️ No location assigned</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setModal(s)}
                      className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s)}
                      className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <StaffModal
          staff={modal === "add" ? null : modal}
          locations={locations}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); fetchData(); }}
        />
      )}
    </div>
  );
}