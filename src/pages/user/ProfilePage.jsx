import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import userAppService from "../../services/userApp.service";
import RecommendationsSection from "../../components/RecommendationsSection";
import api from "../../lib/axios";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const fmtVND  = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M₫` : `${Math.round(n/1000)}k₫`;

const INTERESTS = [
  { key:"culinary",    label:"Food & Dining",    icon:"🍜" },
  { key:"nature",      label:"Nature",            icon:"🌿" },
  { key:"culture",     label:"Culture",           icon:"🏛️" },
  { key:"beach",       label:"Beach",             icon:"🏖️" },
  { key:"adventure",   label:"Adventure",         icon:"🧗" },
  { key:"luxury",      label:"Luxury & Wellness", icon:"🏨" },
  { key:"food_street", label:"Street Food",       icon:"🥢" },
  { key:"photography", label:"Photography",       icon:"📸" },
];

// Each tab maps to a URL path under /profile/*
const NAV = [
  { key:"",          path:"/profile",           icon:"👤", label:"Personal Profile" },
  { key:"security",  path:"/profile/security",  icon:"🔐", label:"Security"          },
  { key:"for-you",   path:"/profile/for-you",   icon:"✨", label:"For You"           },
  { key:"favorites", path:"/profile/favorites", icon:"❤️", label:"Favorites"        },
  { key:"bookings",  path:"/profile/bookings",  icon:"📅", label:"My Bookings"      },
  { key:"trips",     path:"/profile/trips",     icon:"🗺️", label:"My Trips"         },
  { key:"vouchers",  path:"/profile/vouchers",  icon:"🎫", label:"My Vouchers"      },
  { key:"at-apply",  path:"/profile/at-apply",  icon:"✅", label:"Join Approved Team"},
];

const inputCls = `w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                  text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm
                  placeholder-gray-400 dark:placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                  transition-all`;

const getStrength = (pw) => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6)  s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) || /\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
};
const STRENGTH_LABEL = ["","Weak","Fair","Good","Strong"];
const STRENGTH_COLOR = ["","bg-red-400","bg-orange-400","bg-yellow-400","bg-emerald-500"];

// ─── VouchersTab ──────────────────────────────────────────────────────────────
function VouchersTab() {
  const [vouchers, setVouchers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [copied,   setCopied]   = useState("");

  useEffect(() => {
    api.get("/discounts/public")
      .then(r => setVouchers(r.data.data?.discounts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code); setTimeout(() => setCopied(""), 2000);
    });
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"/>
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vouchers & Deals</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Active discount codes — copy and use at checkout</p>
      </div>
      {vouchers.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-4xl mb-3">🎫</p>
          <p className="font-medium mb-1">No vouchers available</p>
          <p className="text-sm">Platform deals will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vouchers.map(v => {
            const isCopied   = copied === v.code;
            const remaining  = v.usageLimit ? v.usageLimit - v.usageCount : null;
            const almostGone = remaining !== null && remaining <= 10;
            return (
              <div key={v._id} className="bg-white dark:bg-slate-900 border border-gray-200
                                          dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"/>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-lg font-black text-gray-900 dark:text-white tracking-widest">{v.code}</code>
                    <button onClick={() => handleCopy(v.code)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                        ${isCopied
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100"}`}>
                      {isCopied ? "✓ Copied" : "📋 Copy"}
                    </button>
                  </div>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 mb-1">
                    {v.type === "percentage" ? `${v.value}% off` : `${fmtVND(v.value)} off`}
                    {v.maxDiscount && <span className="text-xs font-normal text-gray-400 ml-1">max {fmtVND(v.maxDiscount)}</span>}
                  </p>
                  {v.description && <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">{v.description}</p>}
                  <div className="space-y-1 text-xs text-gray-400 dark:text-slate-500">
                    <p>📅 Valid until: {fmtDate(v.validUntil)}</p>
                    {v.minOrderValue > 0 && <p>💰 Min order: {fmtVND(v.minOrderValue)}</p>}
                    {almostGone && <p className="text-amber-500 font-medium">⚡ Only {remaining} uses left</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();
  const avatarInputRef    = useRef(null);

  // Derive active tab from current URL path
  const activeTab = (() => {
    const path = location.pathname; // e.g. "/profile/favorites"
    if (path === "/profile" || path === "/profile/") return "";
    const seg = path.replace("/profile/", "");
    return seg;
  })();

  // Profile form
  const [form,      setForm]      = useState({ name:"", phone:"", dob:"", gender:"", address:"" });
  const [interests, setInterests] = useState([]);
  const [avatar,    setAvatar]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Security form
  const [pwForm,   setPwForm]   = useState({ current:"", next:"", confirm:"" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg,    setPwMsg]    = useState({ type:"", text:"" });
  const [showPw,   setShowPw]   = useState(false);

  // Favorites
  const [favorites,  setFavorites]  = useState([]);
  const [favLoading, setFavLoading] = useState(false);

  // AT application
  const [atStatus,     setAtStatus]     = useState(null);
  const [atForm,       setAtForm]       = useState({ bio:"", experience:"", specialties:[], facebook:"", instagram:"" });
  const [atSubmitting, setAtSubmitting] = useState(false);
  const [atError,      setAtError]      = useState("");
  const [atSuccess,    setAtSuccess]    = useState("");
  const SPECIALTIES = ["Food & Dining","Hotels","Tourist Spots","Cafes","Nature","Culture","Adventure","Photography"];

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    userAppService.getProfile().then(u => {
      setForm({ name: u.name||"", phone: u.phone||"", dob: u.dob||"", gender: u.gender||"", address: u.address||"" });
      setInterests(u.travelInterests || []);
      setAvatar(u.avatar || null);
    }).catch(console.error);
  }, []);

  // Load favorites when on that tab
  useEffect(() => {
    if (activeTab !== "favorites") return;
    setFavLoading(true);
    userAppService.getFavorites().then(setFavorites).catch(console.error).finally(() => setFavLoading(false));
  }, [activeTab]);

  // Load AT status when on that tab
  useEffect(() => {
    if (activeTab !== "at-apply") return;
    userAppService.getATStatus().then(setAtStatus).catch(console.error);
  }, [activeTab]);

  const f = (key) => ({
    value: form[key] ?? "",
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  // ── Avatar upload ───────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const { data } = await api.post("/upload/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = data.data?.url;
      await api.patch("/me/profile/avatar", { avatarUrl: url });
      setAvatar(url);
    } catch (e) {
      alert(e.response?.data?.message || "Upload failed");
    } finally { setUploadingAvatar(false); }
  };

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true); setFormError("");
    try {
      await userAppService.updateProfile({ ...form, travelInterests: interests });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch(e) { setFormError(e.response?.data?.message || "Update failed"); }
    finally { setSaving(false); }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwMsg({ type:"", text:"" });
    if (!pwForm.current) { setPwMsg({ type:"error", text:"Current password is required" }); return; }
    if (!pwForm.next)    { setPwMsg({ type:"error", text:"New password is required" });     return; }
    if (pwForm.next.length < 6) { setPwMsg({ type:"error", text:"Password must be at least 6 characters" }); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type:"error", text:"Passwords do not match" }); return; }
    setPwSaving(true);
    try {
      await api.post("/me/profile/password", { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ type:"success", text:"Password changed successfully!" });
      setPwForm({ current:"", next:"", confirm:"" });
    } catch(e) {
      setPwMsg({ type:"error", text: e.response?.data?.message || "Failed to change password" });
    } finally { setPwSaving(false); }
  };

  const handleRemoveFavorite = async (locationId) => {
    await userAppService.toggleFavorite(locationId);
    setFavorites(prev => prev.filter(f => f._id !== locationId));
  };

  const handleATApply = async () => {
    if (!atForm.bio.trim() || !atForm.experience.trim()) { setAtError("Bio and experience are required"); return; }
    setAtSubmitting(true); setAtError("");
    try {
      await userAppService.applyToAT({
        bio: atForm.bio, experience: atForm.experience,
        specialties: atForm.specialties,
        socialLinks: { facebook: atForm.facebook, instagram: atForm.instagram },
      });
      setAtSuccess("Application submitted! We'll review it within 3–5 business days.");
      userAppService.getATStatus().then(setAtStatus);
    } catch(e) { setAtError(e.response?.data?.message || "Submission failed"); }
    finally { setAtSubmitting(false); }
  };

  const handleLogout = () => { logout(); navigate("/explore"); };
  const strength = getStrength(pwForm.next);

  // ── Sidebar nav link helper ─────────────────────────────────────────────────
  const sidebarLinkCls = (path) => {
    const isActive = path === "/profile"
      ? location.pathname === "/profile" || location.pathname === "/profile/"
      : location.pathname.startsWith(path);
    return `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            mb-0.5 transition-all text-left
            ${isActive
              ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800
                        flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-gray-100 dark:border-slate-800">
          <Link to="/explore" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">WanderViet</span>
          </Link>
        </div>

        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {NAV.map(({ path, icon, label }) => (
            // FIX: use NavLink → navigate to URL, URL changes, activeTab updates
            <NavLink key={path} to={path} end={path === "/profile"}
              className={sidebarLinkCls(path)}>
              <span className="text-base w-5 text-center shrink-0">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 mb-3">
            {avatar ? (
              <img src={avatar} alt={form.name} className="w-9 h-9 rounded-full object-cover shrink-0"/>
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-600/20 flex items-center
                              justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 text-left px-1 transition-colors">
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">

          {/* ── PROFILE TAB ── */}
          {activeTab === "" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Personal Profile</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Manage your account and travel preferences</p>

              {/* Avatar */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                              rounded-2xl p-5 flex items-center gap-4 mb-5">
                <div className="relative shrink-0">
                  {avatar ? (
                    <img src={avatar} alt={form.name} className="w-16 h-16 rounded-2xl object-cover"/>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-600/20 flex items-center
                                    justify-center text-blue-600 dark:text-blue-400 text-2xl font-black">
                      {form.name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-600 hover:bg-blue-700
                               text-white rounded-full flex items-center justify-center text-xs
                               transition-colors disabled:opacity-60 shadow">
                    {uploadingAvatar ? "…" : "✎"}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{form.name}</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500">{user?.email}</p>
                  <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5">
                    {uploadingAvatar ? "Uploading..." : "Change photo"}
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                              rounded-2xl p-5 mb-5 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Full Name</label>
                    <input {...f("name")} className={inputCls}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email</label>
                    <input value={user?.email} disabled className={`${inputCls} opacity-60 cursor-not-allowed`}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Phone</label>
                    <input {...f("phone")} placeholder="0987 654 321" className={inputCls}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Date of Birth</label>
                    <input {...f("dob")} type="date" className={inputCls}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Gender</label>
                    <select value={form.gender} onChange={e => setForm({...form, gender:e.target.value})}
                      className={`${inputCls} appearance-none`}>
                      <option value="">Select...</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Address</label>
                    <input {...f("address")} placeholder="District, City" className={inputCls}/>
                  </div>
                </div>
              </div>

              {/* Travel interests */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 mb-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Travel Interests</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
                  Used to personalise your recommendations in the "For You" tab
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {INTERESTS.map(({ key, label, icon }) => {
                    const selected = interests.includes(key);
                    return (
                      <button key={key} type="button"
                        onClick={() => setInterests(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key])}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all
                          ${selected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                            : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"}`}>
                        <span className="text-base shrink-0">{icon}</span>
                        <span className={`text-sm font-medium ${selected ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-slate-300"}`}>
                          {label}
                        </span>
                        {selected && (
                          <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0 ml-auto">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {interests.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                    {interests.length} interest{interests.length>1?"s":""} selected
                  </p>
                )}
              </div>

              {formError && (
                <p className="text-sm text-red-500 mb-4 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2.5">{formError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={() => navigate("/explore")}
                  className="px-6 py-3 rounded-xl border border-gray-200 dark:border-slate-700
                             text-gray-600 dark:text-slate-400 text-sm font-medium
                             hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white
                             text-sm font-semibold transition-colors disabled:opacity-60">
                  {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "security" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Security</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Manage your password and account security</p>

              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Current password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={pwForm.current}
                      onChange={e => setPwForm(p=>({...p, current:e.target.value}))}
                      placeholder="Enter current password" className={inputCls + " pr-10"}/>
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">New password</label>
                  <input type={showPw ? "text" : "password"} value={pwForm.next}
                    onChange={e => setPwForm(p=>({...p, next:e.target.value}))}
                    placeholder="At least 6 characters" className={inputCls}/>
                  {pwForm.next && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                            ${i <= strength ? STRENGTH_COLOR[strength] : "bg-gray-200 dark:bg-slate-700"}`}/>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400">{STRENGTH_LABEL[strength]}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Confirm new password</label>
                  <input type={showPw ? "text" : "password"} value={pwForm.confirm}
                    onChange={e => setPwForm(p=>({...p, confirm:e.target.value}))}
                    placeholder="Repeat new password"
                    className={`${inputCls} ${pwForm.confirm && pwForm.confirm !== pwForm.next ? "border-red-400" : ""}`}/>
                  {pwForm.confirm && pwForm.confirm !== pwForm.next && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                {pwMsg.text && (
                  <div className={`text-sm rounded-xl px-4 py-2.5
                    ${pwMsg.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                    {pwMsg.text}
                  </div>
                )}
                <button onClick={handleChangePassword} disabled={pwSaving}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60">
                  {pwSaving ? "Updating..." : "Update Password"}
                </button>
              </div>

              {user?.googleId && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    🔑 Your account is linked with Google. Use <strong>Forgot Password</strong> on the login page to create a password.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── FOR YOU TAB ── */}
          {activeTab === "for-you" && <RecommendationsSection />}

          {/* ── FAVORITES TAB ── */}
          {activeTab === "favorites" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Saved Places</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
                {favorites.length} location{favorites.length !== 1 ? "s" : ""} saved
              </p>
              {favLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">❤️</p>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">No saved places yet</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Tap the heart on any location to save it here</p>
                  <Link to="/explore" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-block transition-colors">
                    Explore locations →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favorites.map(loc => (
                    <div key={loc._id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden group hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                      <div className="h-32 bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
                        {loc.images?.[0]?.url ? (
                          <img src={loc.images[0].url} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🏞️</div>
                        )}
                        <button onClick={() => handleRemoveFavorite(loc._id)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">×</button>
                      </div>
                      <div className="p-3">
                        <Link to={`/locations/${loc._id}`} className="font-bold text-gray-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400">{loc.name}</Link>
                        <p className="text-xs text-gray-400 dark:text-slate-500">📍 {loc.address?.city || "—"}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-amber-400 text-xs">★</span>
                          <span className="text-xs text-gray-600 dark:text-slate-300">{loc.rating?.finalScore?.toFixed(1) || "0.0"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MY BOOKINGS TAB ── */}
          {activeTab === "bookings" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">My Bookings</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">View and manage all your booking orders</p>
              {/* Bookings content rendered here — or redirect to dedicated page */}
              <div className="text-center py-10">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Your bookings will appear here.</p>
              </div>
            </div>
          )}

          {/* ── MY TRIPS TAB ── */}
          {activeTab === "trips" && (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">🗺️</p>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">My Trips</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Plan and book your next adventure</p>
              <Link to="/trips" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-block transition-colors">
                View my trips →
              </Link>
            </div>
          )}

          {/* ── VOUCHERS TAB ── */}
          {activeTab === "vouchers" && <VouchersTab />}

          {/* ── AT APPLY TAB ── */}
          {activeTab === "at-apply" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Join Approved Team</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Become a trusted travel expert and help verify locations</p>

              {user?.role === "approved" && (
                <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 rounded-2xl p-5 text-center">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="font-bold text-teal-700 dark:text-teal-400 mb-1">You're already an Approved Team member!</p>
                  <Link to="/approved/dashboard" className="text-sm text-teal-600 dark:text-teal-400 underline">Go to your dashboard →</Link>
                </div>
              )}

              {user?.role !== "approved" && atStatus?.application?.status === "pending" && (
                <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-2xl p-5 text-center">
                  <p className="text-4xl mb-2">⏳</p>
                  <p className="font-bold text-amber-700 dark:text-amber-400 mb-1">Application Pending</p>
                  <p className="text-sm text-amber-600 dark:text-amber-500">Your application is under review. We'll notify you within 3–5 business days.</p>
                </div>
              )}

              {user?.role !== "approved" && atStatus?.application?.status !== "pending" && !atSuccess && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {icon:"⭐",title:"Trust Score",desc:"Build credibility"},
                      {icon:"✍️",title:"Write Reviews",desc:"Expert insights"},
                      {icon:"🗳️",title:"Vote on Tours",desc:"Shape content"},
                    ].map(({icon,title,desc}) => (
                      <div key={title} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center">
                        <span className="text-2xl">{icon}</span>
                        <p className="font-semibold text-gray-900 dark:text-white text-xs mt-1">{title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Bio *</label>
                      <textarea value={atForm.bio} onChange={e=>setAtForm({...atForm,bio:e.target.value})} rows={3}
                        placeholder="Travel enthusiast with passion for food and culture..." className={`${inputCls} resize-none`}/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Experience *</label>
                      <textarea value={atForm.experience} onChange={e=>setAtForm({...atForm,experience:e.target.value})} rows={3}
                        placeholder="5 years of travel blogging, visited 20+ countries..." className={`${inputCls} resize-none`}/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Specialties</label>
                      <div className="flex flex-wrap gap-2">
                        {SPECIALTIES.map(s => (
                          <button key={s} type="button"
                            onClick={() => setAtForm(f => ({...f, specialties: f.specialties.includes(s) ? f.specialties.filter(x=>x!==s) : [...f.specialties,s]}))}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all
                              ${atForm.specialties.includes(s)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Facebook / Blog</label>
                        <input value={atForm.facebook} onChange={e=>setAtForm({...atForm,facebook:e.target.value})} placeholder="https://..." className={inputCls}/>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Instagram</label>
                        <input value={atForm.instagram} onChange={e=>setAtForm({...atForm,instagram:e.target.value})} placeholder="https://instagram.com/..." className={inputCls}/>
                      </div>
                    </div>
                  </div>
                  {atError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{atError}</p>}
                  <button onClick={handleATApply} disabled={atSubmitting}
                    className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors disabled:opacity-60">
                    {atSubmitting ? "Submitting..." : "✅ Submit Application"}
                  </button>
                </div>
              )}

              {atSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 text-center">
                  <p className="text-4xl mb-2">🎉</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">Application Submitted!</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500">{atSuccess}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}