import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import companyService from "../../services/company.service";
import api from "../../lib/axios";
import { PageHeader, Button, FormField, Input, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function CompanyProfilePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
  const [form, setForm]     = useState({ name: "", bio: "", website: "", phone: "" });
  const [policy, setPolicy] = useState({
    cancellation: "moderate", checkInTime: "14:00", checkOutTime: "12:00",
    smoking: "not_allowed", pets: "not_allowed", children: "allowed",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    companyService.getProfile().then(u => {
      setForm({
        name:    u.name    || "",
        bio:     u.companyInfo?.bio     || "",
        website: u.companyInfo?.website || "",
        phone:   u.companyInfo?.phone   || "",
      });
      if (u.defaultPolicy) {
        setPolicy(prev => ({ ...prev, ...u.defaultPolicy }));
      }
    }).catch(console.error);
  }, []);

  const f = (key) => ({
    value: form[key] ?? "",
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await companyService.updateProfile({
        name: form.name,
        companyInfo: { bio: form.bio, website: form.website, phone: form.phone },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) {
      setError(e.response?.data?.message || "Update failed");
    } finally { setSaving(false); }
  };

  const handleSavePolicy = async () => {
    setSaving(true); setError("");
    try {
      await api.put("/company/profile", { defaultPolicy: policy });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch(e) { setError(e.response?.data?.message || "Update failed"); }
    finally { setSaving(false); }
  };

  const inputCls = `w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
    text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all`;

  const SelectField = ({ label, value, onChange, options }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <PageHeader title="Business Profile" subtitle="Manage your company information"/>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-800">
        {[["profile","🏢 Profile"],["policy","📋 Default Policy"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeTab === key
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <div className="max-w-2xl space-y-5">
        {/* Avatar section */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                        rounded-2xl p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-600/20
                          flex items-center justify-center text-emerald-600 dark:text-emerald-400
                          text-2xl font-black shrink-0">
            {form.name?.[0]?.toUpperCase() || "C"}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 dark:text-white">{form.name || "Company Name"}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-emerald-100 dark:bg-emerald-600/20
                             text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              Company Account
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                        rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Company Information</h3>

          <FormField label="Business Name" required>
            <Input {...f("name")} placeholder="Your company name"/>
          </FormField>

          <FormField label="About" hint="Shown on your location listings">
            <Textarea {...f("bio")} rows={3} placeholder="Brief description of your business..."/>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Website">
              <Input {...f("website")} type="url" placeholder="https://yourbusiness.com"/>
            </FormField>
            <FormField label="Phone">
              <Input {...f("phone")} placeholder="+84 (0) 123 456 789"/>
            </FormField>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} loading={saving}>
              {saved ? "✓ Saved!" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Account info (read-only) */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                        rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Account</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Email",      user?.email],
              ["Role",       "Company"],
              ["Status",     user?.status],
              ["Member Since", user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month:"long", year:"numeric" }) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{value || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      )} {/* end profile tab */}

      {/* ── POLICY TAB ── */}
      {activeTab === "policy" && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20
                          rounded-2xl p-4 text-sm text-blue-700 dark:text-blue-400">
            💡 This is your company's <strong>default policy</strong>. Individual locations can override these settings.
            If a location has no policy set, these defaults will be applied.
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                          rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Cancellation & Check-in</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Cancellation policy" value={policy.cancellation}
                onChange={v => setPolicy(p=>({...p,cancellation:v}))}
                options={[
                  ["flexible",       "Flexible — full refund 24h before"],
                  ["moderate",       "Moderate — full refund 72h before"],
                  ["strict",         "Strict — full refund 7 days before"],
                  ["non_refundable", "Non-refundable"],
                ]}/>
              <div/>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Default check-in time
                </label>
                <input type="time" value={policy.checkInTime}
                  onChange={e => setPolicy(p=>({...p,checkInTime:e.target.value}))}
                  className={inputCls}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Default check-out time
                </label>
                <input type="time" value={policy.checkOutTime}
                  onChange={e => setPolicy(p=>({...p,checkOutTime:e.target.value}))}
                  className={inputCls}/>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                          rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">House Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField label="Smoking" value={policy.smoking}
                onChange={v => setPolicy(p=>({...p,smoking:v}))}
                options={[
                  ["not_allowed",  "Not allowed"],
                  ["outdoor_only", "Outdoor only"],
                  ["allowed",      "Allowed"],
                ]}/>
              <SelectField label="Pets" value={policy.pets}
                onChange={v => setPolicy(p=>({...p,pets:v}))}
                options={[
                  ["not_allowed", "Not allowed"],
                  ["on_request",  "On request"],
                  ["allowed",     "Allowed"],
                ]}/>
              <SelectField label="Children" value={policy.children}
                onChange={v => setPolicy(p=>({...p,children:v}))}
                options={[
                  ["allowed",     "All ages welcome"],
                  ["age_12_up",   "Age 12+"],
                  ["not_allowed", "Adults only"],
                ]}/>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <div className="flex justify-end">
            <button onClick={handleSavePolicy} disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                         rounded-xl transition-colors disabled:opacity-60">
              {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}