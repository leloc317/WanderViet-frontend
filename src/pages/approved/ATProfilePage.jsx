import { useState, useEffect } from "react";
import atService from "../../services/at.service";
import { PageHeader, Button, FormField, Input, Textarea } from "../../components/ui";

const SPECIALTIES = [
  "Food & Dining","Hotels","Tourist Spots","Cafes","Entertainment",
  "Shopping","Nature","Culture","Adventure","Photography",
];

export default function ATProfilePage() {
  const [form, setForm]     = useState({ name:"", bio:"", specialties:[], facebook:"", instagram:"", tiktok:"", website:"" });
  const [user, setUser]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    atService.getProfile().then(u => {
      setUser(u);
      setForm({
        name:        u.name || "",
        bio:         u.atApplication?.bio || "",
        specialties: u.atApplication?.specialties || [],
        facebook:    u.atApplication?.socialLinks?.facebook  || "",
        instagram:   u.atApplication?.socialLinks?.instagram || "",
        tiktok:      u.atApplication?.socialLinks?.tiktok    || "",
        website:     u.atApplication?.socialLinks?.website   || "",
      });
    }).catch(console.error);
  }, []);

  const f = (key) => ({
    value: form[key] ?? "",
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  const toggleSpec = (s) => setForm(prev => ({
    ...prev,
    specialties: prev.specialties.includes(s)
      ? prev.specialties.filter(x => x !== s)
      : [...prev.specialties, s],
  }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await atService.updateProfile({
        name:        form.name,
        bio:         form.bio,
        specialties: form.specialties,
        socialLinks: {
          facebook:  form.facebook,
          instagram: form.instagram,
          tiktok:    form.tiktok,
          website:   form.website,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) {
      setError(e.response?.data?.message || "Update failed");
    } finally { setSaving(false); }
  };

  const trustScore = user?.trustScore ?? 0;
  const atScore    = user?.atScore?.average;

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your Approved Team profile"/>

      <div className="max-w-2xl space-y-5">
        {/* Avatar + trust */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-600/20
                            flex items-center justify-center text-teal-600 dark:text-teal-400
                            text-2xl font-black shrink-0">
              {form.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white text-lg">{form.name || "—"}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</p>
              <span className="inline-block mt-1 text-xs bg-teal-100 dark:bg-teal-600/20
                               text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-medium">
                ✅ Approved Team
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{trustScore}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">Trust Score</p>
              {atScore && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">AT: {atScore}/10</p>
              )}
            </div>
          </div>

          {/* Trust bar */}
          <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all
                             ${trustScore >= 70 ? "bg-emerald-500" : trustScore >= 40 ? "bg-amber-500" : "bg-teal-500"}`}
                 style={{ width: `${Math.min(trustScore, 100)}%` }}/>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400 dark:text-slate-500">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </div>

        {/* Application status */}
        {user?.atApplication && (
          <div className={`rounded-2xl border px-5 py-4
                           ${user.atApplication.status === "approved"
                             ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
                             : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{user.atApplication.status === "approved" ? "✅" : "⏳"}</span>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                Application Status:
                <span className="ml-1 capitalize text-teal-600 dark:text-teal-400">
                  {user.atApplication.status}
                </span>
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Applied: {user.atApplication.appliedAt
                ? new Date(user.atApplication.appliedAt).toLocaleDateString("en-US",{ month:"long", day:"numeric", year:"numeric" })
                : "—"}
            </p>
          </div>
        )}

        {/* Basic info */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Basic Information</h3>
          <FormField label="Display Name" required>
            <Input {...f("name")} placeholder="Your name"/>
          </FormField>
          <FormField label="Bio" hint="Shown on your expert reviews">
            <Textarea {...f("bio")} rows={3} placeholder="Travel enthusiast with 5+ years experience visiting..."/>
          </FormField>
        </div>

        {/* Specialties */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map(s => (
              <button key={s} type="button" onClick={() => toggleSpec(s)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-all
                            ${form.specialties.includes(s)
                              ? "bg-teal-600 text-white border-teal-600"
                              : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-teal-400"}`}>
                {s}
                {form.specialties.includes(s) && <span className="ml-1 opacity-70">×</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Social links */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Social Links</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Facebook">
              <Input {...f("facebook")} placeholder="https://facebook.com/..."/>
            </FormField>
            <FormField label="Instagram">
              <Input {...f("instagram")} placeholder="https://instagram.com/..."/>
            </FormField>
            <FormField label="TikTok">
              <Input {...f("tiktok")} placeholder="https://tiktok.com/@..."/>
            </FormField>
            <FormField label="Website / Blog">
              <Input {...f("website")} placeholder="https://yoursite.com"/>
            </FormField>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            {saved ? "✓ Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}