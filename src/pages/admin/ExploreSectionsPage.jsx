import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import {
  PageHeader, Button, Modal, FormField,
  Input, Select, Textarea, Badge, StatusBadge,
} from "../../components/ui";

const SECTION_TYPES = [
  { key:"personalized", label:"✨ Personalized",    desc:"Based on user travel interests" },
  { key:"guest_promo",  label:"🔥 Guest Promo",     desc:"Shown to non-logged-in visitors" },
  { key:"trending",     label:"📈 Trending",        desc:"Sort by views, recent activity" },
  { key:"popular",      label:"⭐ Popular",         desc:"Sort by rating + review count" },
  { key:"top_rated",    label:"🏆 Top Rated",       desc:"Highest final score" },
  { key:"new",          label:"🆕 New & Verified",  desc:"Recently added, AT verified first" },
  { key:"ad_boosted",   label:"📢 Featured/Ads",   desc:"Locations with active ads" },
  { key:"category",     label:"🗂️ By Category",    desc:"Filter by specific category" },
  { key:"manual",       label:"✋ Manual",          desc:"Admin picks locations manually" },
];

const SHOW_FOR_OPTS = [
  { key:"all",        label:"Everyone" },
  { key:"guest_only", label:"Guests only (not logged in)" },
  { key:"user_only",  label:"Logged-in users only" },
];

const CATEGORIES = [
  "restaurant","tourist_spot","hotel","cafe","entertainment","shopping","service","other"
];

const CAT_LABEL = {
  restaurant:"Restaurant", tourist_spot:"Tourist Spot", hotel:"Hotel",
  cafe:"Cafe", entertainment:"Entertainment", shopping:"Shopping",
  service:"Service", other:"Other",
};

const EMPTY_FORM = {
  key:"", title:"", subtitle:"", icon:"📍",
  type:"popular", showFor:"all", isActive:true,
  itemCount:6, showViewAll:true,
  replacedByForGuest:"",
  config: {
    category:"", sortBy:"rating.finalScore", sortOrder:"desc",
    atVerifiedOnly: false, promoLabel:"", promoSubtitle:"",
  },
};

function TypeBadge({ type }) {
  const t = SECTION_TYPES.find(s => s.key === type);
  return <span className="text-xs text-gray-600 dark:text-slate-300">{t?.label || type}</span>;
}

export default function ExploreSectionsPage() {
  const [sections, setSections]   = useState([]);
  const [loading,  setLoading]    = useState(false);
  const [modal,    setModal]      = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form,     setForm]       = useState(EMPTY_FORM);
  const [saving,   setSaving]     = useState(false);
  const [formErr,  setFormErr]    = useState("");
  const [seeding,  setSeeding]    = useState(false);
  const [dragOver, setDragOver]   = useState(null);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/explore/sections");
      setSections(data.data.sections);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSections(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormErr("");
    setModal(true);
  };

  const openEdit = (s) => {
    setEditItem(s);
    setForm({
      key:     s.key,
      title:   s.title,
      subtitle:s.subtitle || "",
      icon:    s.icon || "📍",
      type:    s.type,
      showFor: s.showFor || "all",
      isActive:s.isActive,
      itemCount: s.itemCount || 6,
      showViewAll: s.showViewAll !== false,
      replacedByForGuest: s.replacedByForGuest || "",
      config: {
        category:       s.config?.category       || "",
        sortBy:         s.config?.sortBy         || "rating.finalScore",
        sortOrder:      s.config?.sortOrder      || "desc",
        atVerifiedOnly: s.config?.atVerifiedOnly || false,
        promoLabel:     s.config?.promoLabel     || "",
        promoSubtitle:  s.config?.promoSubtitle  || "",
      },
    });
    setFormErr(""); setModal(true);
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.title.trim()) {
      setFormErr("Key and title are required"); return;
    }
    setSaving(true); setFormErr("");
    try {
      const payload = { ...form };
      if (editItem) await api.put(`/explore/sections/${editItem._id}`, payload);
      else          await api.post("/explore/sections", payload);
      setModal(false); fetchSections();
    } catch(e) { setFormErr(e.response?.data?.message || "Error saving section"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this section?")) return;
    try { await api.delete(`/explore/sections/${id}`); fetchSections(); }
    catch(e) { alert(e.response?.data?.message || "Error"); }
  };

  const handleToggle = async (section) => {
    try {
      await api.put(`/explore/sections/${section._id}`, { isActive: !section.isActive });
      fetchSections();
    } catch(e) { alert("Error"); }
  };

  const handleSeed = async () => {
    if (!confirm("This will reset all sections to default. Continue?")) return;
    setSeeding(true);
    try { await api.post("/explore/sections/seed"); fetchSections(); }
    catch(e) { alert("Error"); }
    finally { setSeeding(false); }
  };

  const f = (key) => ({
    value: form[key] ?? "",
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  const fc = (key) => ({
    value: form.config?.[key] ?? "",
    onChange: (e) => setForm({ ...form, config: { ...form.config, [key]: e.target.value } }),
  });

  return (
    <div>
      <PageHeader
        title="Explore Feed Sections"
        subtitle="Configure what users see on the Explore page — for guests and logged-in users"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSeed} loading={seeding}>
              🔄 Reset to Default
            </Button>
            <Button onClick={openCreate}>+ Add Section</Button>
          </div>
        }
      />

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30
                      rounded-2xl px-5 py-4 mb-6 text-sm">
        <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">How sections work</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-700 dark:text-blue-400">
          <div className="flex gap-2">
            <span>👤</span>
            <div>
              <p className="font-medium">Logged-in users</p>
              <p className="opacity-80">See personalized sections based on their travel interests</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span>🌐</span>
            <div>
              <p className="font-medium">Guest visitors</p>
              <p className="opacity-80">See promotional / trending content to attract sign-ups</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span>🔄</span>
            <div>
              <p className="font-medium">Replacement logic</p>
              <p className="opacity-80">"Suggested for You" auto-swaps with "Guest Promo" for guests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sections list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((s, idx) => (
            <div key={s._id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl px-5 py-4
                          flex items-center gap-4 transition-all
                          ${s.isActive
                            ? "border-gray-200 dark:border-slate-800"
                            : "border-gray-200 dark:border-slate-800 opacity-50"}`}>
              {/* Order number */}
              <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center
                              justify-center text-xs font-bold text-gray-500 dark:text-slate-400 shrink-0">
                {s.order + 1}
              </div>

              {/* Icon */}
              <span className="text-xl shrink-0">{s.icon}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{s.title}</p>
                  <TypeBadge type={s.type}/>
                  {s.showFor !== "all" && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                                      ${s.showFor === "guest_only"
                                        ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
                                        : "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400"}`}>
                      {s.showFor === "guest_only" ? "👤 Guest only" : "🔐 Users only"}
                    </span>
                  )}
                  {s.replacedByForGuest && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">
                      → replaced by "{s.replacedByForGuest}" for guests
                    </span>
                  )}
                </div>
                {s.subtitle && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{s.subtitle}</p>
                )}
              </div>

              {/* Item count */}
              <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
                {s.itemCount} items
              </span>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle active */}
                <button onClick={() => handleToggle(s)}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0
                              ${s.isActive ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-700"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all
                                    ${s.isActive ? "left-5" : "left-0.5"}`}/>
                </button>
                <Button size="xs" variant="ghost" onClick={() => openEdit(s)}>Edit</Button>
                <Button size="xs" variant="danger" onClick={() => handleDelete(s._id)}>Delete</Button>
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm mb-3">No sections configured</p>
              <Button onClick={handleSeed}>🔄 Load default sections</Button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editItem ? "Edit Section" : "Add Section"} size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? "Update" : "Create"}</Button>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Section Key" required hint="Unique identifier, no spaces (e.g. for_you)">
              <Input {...f("key")} placeholder="for_you" disabled={!!editItem}/>
            </FormField>
            <FormField label="Icon (emoji)">
              <Input {...f("icon")} placeholder="✨"/>
            </FormField>
          </div>

          <FormField label="Title" required>
            <Input {...f("title")} placeholder="Suggested for You"/>
          </FormField>

          <FormField label="Subtitle">
            <Input {...f("subtitle")} placeholder="Based on your travel interests"/>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Section Type">
              <Select value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                {SECTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Show For">
              <Select value={form.showFor} onChange={e => setForm({...form, showFor:e.target.value})}>
                {SHOW_FOR_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Item Count">
              <Input type="number" min={1} max={20} {...f("itemCount")}/>
            </FormField>
            <FormField label="Replaced by (for guests)" hint="Key of guest section">
              <Input {...f("replacedByForGuest")} placeholder="guest_promo"/>
            </FormField>
            <div className="flex flex-col gap-2 justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm({...form, isActive: e.target.checked})}
                  className="w-4 h-4 accent-blue-600"/>
                Active
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                <input type="checkbox" checked={form.showViewAll}
                  onChange={e => setForm({...form, showViewAll: e.target.checked})}
                  className="w-4 h-4 accent-blue-600"/>
                Show "View All"
              </label>
            </div>
          </div>

          {/* Type hint */}
          {form.type && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
              {SECTION_TYPES.find(t=>t.key===form.type)?.desc}
            </div>
          )}

          {/* Config for category type */}
          {form.type === "category" && (
            <FormField label="Category">
              <Select {...fc("category")}>
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
              </Select>
            </FormField>
          )}

          {/* Config for guest_promo */}
          {form.type === "guest_promo" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Promo Label">
                <Input {...fc("promoLabel")} placeholder="🔥 Hot Deals"/>
              </FormField>
              <FormField label="Promo Subtitle">
                <Input {...fc("promoSubtitle")} placeholder="Best spots this season"/>
              </FormField>
            </div>
          )}

          {/* Sort override */}
          {["trending","popular","top_rated","new","category"].includes(form.type) && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sort By">
                <Select {...fc("sortBy")}>
                  <option value="rating.finalScore">Final Score</option>
                  <option value="rating.userScore">User Score</option>
                  <option value="stats.detailViews">Most Viewed</option>
                  <option value="createdAt">Newest</option>
                </Select>
              </FormField>
              <FormField label="Sort Order">
                <Select {...fc("sortOrder")}>
                  <option value="desc">Descending (High → Low)</option>
                  <option value="asc">Ascending (Low → High)</option>
                </Select>
              </FormField>
            </div>
          )}

          {/* AT verified filter */}
          {["new","popular","top_rated"].includes(form.type) && (
            <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">
              <input type="checkbox"
                checked={form.config?.atVerifiedOnly || false}
                onChange={e => setForm({...form, config:{...form.config, atVerifiedOnly:e.target.checked}})}
                className="w-4 h-4 accent-teal-600"/>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">AT Verified Only</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Only show locations verified by Approved Team</p>
              </div>
            </label>
          )}

          {formErr && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{formErr}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}