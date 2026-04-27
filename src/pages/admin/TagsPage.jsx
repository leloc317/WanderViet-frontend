import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import {
  PageHeader, Button, Modal, FormField,
  Input, Select, Badge, Tabs,
} from "../../components/ui";

const GROUPS = [
  { key:"vibe",     label:"Vibe",     icon:"✨" },
  { key:"audience", label:"Audience", icon:"👥" },
  { key:"feature",  label:"Feature",  icon:"🔧" },
  { key:"price",    label:"Price",    icon:"💰" },
  { key:"time",     label:"Time",     icon:"🕐" },
  { key:"activity", label:"Activity", icon:"🏃" },
  { key:"quality",  label:"Quality",  icon:"⭐" },
];

const CATEGORIES = [
  "all","restaurant","hotel","cafe","tourist_spot","entertainment","shopping","service","other"
];

const STATUS_COLOR = {
  active:   "green",
  pending:  "yellow",
  rejected: "red",
};

const EMPTY_FORM = {
  name:"", group:"vibe", applicableFor:["all"], icon:"🏷️", description:"",
};

export default function TagsPage() {
  const [tags,    setTags]    = useState([]);
  const [counts,  setCounts]  = useState({ active:0, pending:0 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [modal,   setModal]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState("");
  const [seeding, setSeeding] = useState(false);

  const TABS = [
    { key:"active",  label:`Active (${counts.active})`  },
    { key:"pending", label:`Pending (${counts.pending})` },
    { key:"rejected",label:"Rejected" },
  ];

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tags/admin", { params: { status: activeTab, limit: 100 } });
      setTags(data.data.tags);
      setCounts(data.data.counts);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchTags(); }, [activeTab]);

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setFormErr(""); setModal(true); };
  const openEdit   = (t) => {
    setEditItem(t);
    setForm({ name:t.name, group:t.group, applicableFor:t.applicableFor, icon:t.icon||"🏷️", description:t.description||"" });
    setFormErr(""); setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormErr("Name is required"); return; }
    setSaving(true); setFormErr("");
    try {
      if (editItem) await api.put(`/tags/${editItem._id}`, form);
      else          await api.post("/tags", form);
      setModal(false); fetchTags();
    } catch(e) { setFormErr(e.response?.data?.message || "Error"); }
    finally { setSaving(false); }
  };

  const handleReview = async (id, action) => {
    try { await api.patch(`/tags/${id}/review`, { action }); fetchTags(); }
    catch(e) { alert(e.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this tag? It will be removed from all locations.")) return;
    try { await api.delete(`/tags/${id}`); fetchTags(); }
    catch(e) { alert("Error"); }
  };

  const handleSeed = async () => {
    if (!confirm("Seed default tags? Existing tags won't be overwritten.")) return;
    setSeeding(true);
    try {
      const { data } = await api.post("/tags/seed");
      alert(data.message); fetchTags();
    } catch(e) { alert("Error"); }
    finally { setSeeding(false); }
  };

  const toggleApplicable = (cat) => {
    setForm(f => ({
      ...f,
      applicableFor: f.applicableFor.includes(cat)
        ? f.applicableFor.filter(c => c !== cat)
        : [...f.applicableFor, cat],
    }));
  };

  // Group tags by group field
  const grouped = {};
  for (const tag of tags) {
    if (!grouped[tag.group]) grouped[tag.group] = [];
    grouped[tag.group].push(tag);
  }

  return (
    <div>
      <PageHeader
        title="Tags Management"
        subtitle="Manage location tags used for filtering and recommendations"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSeed} loading={seeding}>
              🌱 Seed Defaults
            </Button>
            <Button onClick={openCreate}>+ New Tag</Button>
          </div>
        }
      />

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab}/>

      {loading ? (
        <div className="space-y-3 mt-4">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"/>)}
        </div>
      ) : activeTab === "active" ? (
        // Active — grouped by group
        <div className="mt-4 space-y-6">
          {GROUPS.map(({ key, label, icon }) => {
            const groupTags = grouped[key] || [];
            if (!groupTags.length) return null;
            return (
              <div key={key}>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {icon} {label} ({groupTags.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupTags.map(tag => (
                    <div key={tag._id}
                      className="flex items-center gap-2 bg-white dark:bg-slate-900
                                 border border-gray-200 dark:border-slate-800
                                 rounded-full pl-3 pr-2 py-1.5 group">
                      <span className="text-sm">{tag.icon}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{tag.name}</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">({tag.usageCount})</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(tag)}
                          className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-600/20
                                     text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center">
                          ✏
                        </button>
                        <button onClick={() => handleDelete(tag._id)}
                          className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-600/20
                                     text-red-500 dark:text-red-400 text-xs flex items-center justify-center">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
              No active tags. Click "Seed Defaults" to add default tags.
            </div>
          )}
        </div>
      ) : (
        // Pending/Rejected — table view
        <div className="mt-4 space-y-2">
          {tags.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
              No {activeTab} tags
            </div>
          ) : tags.map(tag => (
            <div key={tag._id}
              className="flex items-center gap-4 bg-white dark:bg-slate-900
                         border border-gray-200 dark:border-slate-800 rounded-2xl px-5 py-3">
              <span className="text-xl">{tag.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{tag.name}</p>
                  <Badge label={tag.group} color="blue" size="sm"/>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Suggested by: {tag.createdBy?.name} ({tag.createdBy?.role})
                  {tag.description && ` · ${tag.description}`}
                </p>
              </div>
              {activeTab === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <Button size="xs" variant="success" onClick={() => handleReview(tag._id, "approve")}>
                    ✓ Approve
                  </Button>
                  <Button size="xs" variant="danger" onClick={() => handleReview(tag._id, "reject")}>
                    ✕ Reject
                  </Button>
                </div>
              )}
              {activeTab === "rejected" && (
                <span className="text-xs text-red-400 shrink-0">{tag.rejectReason || "Rejected"}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editItem ? "Edit Tag" : "New Tag"} size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? "Update" : "Create"}</Button>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tag Name" required>
              <Input value={form.name} onChange={e => setForm({...form, name:e.target.value})}
                placeholder="e.g. Rooftop View"/>
            </FormField>
            <FormField label="Icon (emoji)">
              <Input value={form.icon} onChange={e => setForm({...form, icon:e.target.value})}
                placeholder="🏷️"/>
            </FormField>
          </div>

          <FormField label="Group">
            <Select value={form.group} onChange={e => setForm({...form, group:e.target.value})}>
              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.icon} {g.label}</option>)}
            </Select>
          </FormField>

          <FormField label="Applicable For" hint="Which location types can use this tag">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => toggleApplicable(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize
                              ${form.applicableFor.includes(cat)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Description (optional)">
            <Input value={form.description} onChange={e => setForm({...form, description:e.target.value})}
              placeholder="Short description of this tag"/>
          </FormField>

          {formErr && <p className="text-sm text-red-500">{formErr}</p>}
        </div>
      </Modal>
    </div>
  );
}