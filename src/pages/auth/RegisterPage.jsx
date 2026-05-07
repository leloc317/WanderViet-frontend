import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import LegalModal from "../../components/modals/LegalModal";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";

const INTERESTS = [
  { key: "culinary",    label: "Food & Dining",    icon: "🍜", desc: "Restaurants, local cuisine" },
  { key: "nature",      label: "Nature",            icon: "🌿", desc: "Mountains, forests, waterfalls" },
  { key: "culture",     label: "Culture",           icon: "🏛️", desc: "Museums, heritage sites" },
  { key: "beach",       label: "Beach",             icon: "🏖️", desc: "Beaches, islands, diving" },
  { key: "adventure",   label: "Adventure",         icon: "🧗", desc: "Trekking, extreme sports" },
  { key: "luxury",      label: "Luxury & Wellness", icon: "🏨", desc: "Resorts, spas, 5-star hotels" },
  { key: "food_street", label: "Street Food",       icon: "🥢", desc: "Night markets, street stalls" },
  { key: "photography", label: "Photography",       icon: "📸", desc: "Scenic spots, check-in locations" },
];

const PHONE_RE = /^(0|\+84)(3[2-9]|5[6-9]|7[0-9]|8[0-9]|9[0-9])\d{7}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateStep1 = (form) => {
  const e = {};
  if (!form.name.trim() || form.name.trim().length < 2)
    e.name = "Name must be at least 2 characters";
  if (!EMAIL_RE.test(form.email))
    e.email = "Invalid email address";
  if (form.phone && !PHONE_RE.test(form.phone.replace(/\s/g, "")))
    e.phone = "Invalid phone number (e.g. 0912345678)";
  if (!form.phone)
    e.phone = "Phone number is required";
  if (!form.password)
    e.password = "Password is required";
  else if (form.password.length < 6)
    e.password = "Password must be at least 6 characters";
  if (!form.confirmPassword)
    e.confirmPassword = "Please confirm your password";
  else if (form.password !== form.confirmPassword)
    e.confirmPassword = "Passwords do not match";
  if (!form.agree)
    e.agree = "You must agree to the terms";
  return e;
};

const getStrength = (pw) => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6)  s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) || /\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
};
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];

function Field({ label, error, required, children }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// Fix: focus ring 
const inputCls = (err) =>
  `w-full bg-gray-50 dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm
   text-gray-900 dark:text-white placeholder-gray-400
   focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all
   ${err ? "border-red-400" : "border-gray-200 dark:border-slate-700"}`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "", agree: false,
  });
  const [interests, setInterests] = useState([]);
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [emailStatus, setEmailStatus] = useState("");
  const emailTimer = useRef(null);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, email: val });
    setEmailStatus("");
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return;
    setEmailStatus("checking");
    emailTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/auth/check-email", { params: { email: val } });
        setEmailStatus(data.available ? "ok" : "taken");
      } catch { setEmailStatus(""); }
    }, 600);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const strength = getStrength(form.password);

  const handleStep1 = (e) => {
    e.preventDefault();
    if (emailStatus === "taken")    { setErrors({ email: "This email is already registered" }); return; }
    if (emailStatus === "checking") { setErrors({ email: "Please wait while we check your email" }); return; }
    const errs = validateStep1(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (skip = false) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        name:            form.name.trim(),
        email:           form.email.trim().toLowerCase(),
        password:        form.password,
        phone:           form.phone.trim() || undefined,
        travelInterests: skip ? [] : interests,
      });
      const token = data.token ?? data.data?.token;
      sessionStorage.setItem("token", token);
      navigate("/explore");
    } catch (err) {
      setErrors({ server: err.response?.data?.message || "Registration failed. Please try again." });
      setStep(1);
    } finally { setLoading(false); }
  };

  const toggleInterest = (key) =>
    setInterests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

        {/* Back to Explore */}
        <div className="mb-4">
          <Link to="/explore"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600
                       dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
            </svg>
            Back to Explore
          </Link>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">W</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-lg">WanderViet</span>
        </div>

        {/* Step indicator — Fix 2 */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${s < step   ? "bg-emerald-500 text-white"
                : s === step ? "bg-blue-600 text-white"
                :               "bg-gray-200 dark:bg-slate-700 text-gray-400"}`}>
                {s < step ? "✓" : s}
              </div>
              <span className={`text-xs ${s === step
                ? "text-gray-900 dark:text-white font-medium"
                : "text-gray-400 dark:text-slate-500"}`}>
                {s === 1 ? "Your info" : "Interests"}
              </span>
              {s < 2 && <div className="w-8 h-px bg-gray-200 dark:bg-slate-700 mx-1"/>}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200
                        dark:border-slate-800 shadow-sm">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="p-7">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                Create your account
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Start exploring Vietnam with WanderViet.
              </p>

              <form onSubmit={handleStep1} className="space-y-4" noValidate>
                <Field label="Full name" error={errors.name} required>
                  <input value={form.name} onChange={set("name")}
                    placeholder="John Smith"
                    className={inputCls(errors.name)}/>
                </Field>

                <Field label="Email"
                  error={errors.email || (emailStatus === "taken" ? "This email is already registered" : "")}
                  required>
                  <div className="relative">
                    <input type="email" value={form.email} onChange={handleEmailChange}
                      placeholder="you@example.com"
                      className={inputCls(errors.email || emailStatus === "taken") + " pr-8"}/>
                    {emailStatus === "checking" && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2
                                      w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500
                                      rounded-full animate-spin"/>
                    )}
                    {emailStatus === "ok" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">✓</span>
                    )}
                    {emailStatus === "taken" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-sm">✗</span>
                    )}
                  </div>
                </Field>

                <Field label="Phone number" error={errors.phone} required>
                  <input type="tel" value={form.phone} onChange={set("phone")}
                    placeholder="0912 345 678"
                    className={inputCls(errors.phone)}/>
                </Field>

                <Field label="Password" error={errors.password} required>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"}
                      value={form.password} onChange={set("password")}
                      placeholder="At least 6 characters"
                      className={inputCls(errors.password) + " pr-10"}/>
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {form.password && (
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
                </Field>

                <Field label="Confirm password" error={errors.confirmPassword} required>
                  <input type={showPw ? "text" : "password"}
                    value={form.confirmPassword} onChange={set("confirmPassword")}
                    placeholder="Repeat your password"
                    className={inputCls(errors.confirmPassword)}/>
                </Field>

                {/* Fix 3: checkbox + legal links */}
                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer"
                    onClick={() => setForm({ ...form, agree: !form.agree })}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center
                                    shrink-0 mt-0.5 transition-all
                                    ${form.agree
                                      ? "bg-blue-600 border-blue-600"
                                      : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}>
                      {form.agree && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-600 dark:text-slate-400 text-sm">
                      I agree to the{" "}
                      <button type="button" onClick={() => setLegalModal("terms")}
                        className="text-blue-600 hover:underline">Terms of Service</button>
                      {" "}and{" "}
                      <button type="button" onClick={() => setLegalModal("privacy")}
                        className="text-blue-600 hover:underline">Privacy Policy</button>
                    </span>
                  </label>
                  {errors.agree && <p className="text-red-500 text-xs mt-1 ml-6">{errors.agree}</p>}
                </div>

                {errors.server && (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200
                                  dark:border-red-500/30 text-red-600 dark:text-red-400
                                  rounded-xl px-4 py-2.5 text-sm">
                    {errors.server}
                  </div>
                )}

                {/* Fix 4: Continue button */}
                <button type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                             rounded-xl py-3 text-sm transition-colors">
                  Continue →
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-5">
                Already have an account?{" "}
                {/* Fix 5: sign in link */}
                <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
              </p>

              <div className="relative mt-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-slate-700"/>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-slate-900 px-4 text-gray-400 text-xs">or</span>
                </div>
              </div>
              <div className="mt-4">
                <GoogleSignInButton label="Sign up with Google"
                  onSuccess={(data) => {
                    localStorage.setItem("token", data.token);
                    navigate("/explore");
                  }}/>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="p-7">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                What do you love? ✨
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                Pick your interests so we can personalize your experience.{" "}
                <span className="text-gray-400">(Optional)</span>
              </p>

              {/* Fix 6: interest cards selected state */}
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {INTERESTS.map(({ key, label, icon, desc }) => {
                  const selected = interests.includes(key);
                  return (
                    <button key={key} type="button"
                      onClick={() => toggleInterest(key)}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all
                                  ${selected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"}`}>
                      <span className="text-xl leading-none shrink-0 mt-0.5">{icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate
                          ${selected ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-snug mt-0.5">
                          {desc}
                        </p>
                      </div>
                      {selected && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center
                                        justify-center shrink-0 ml-auto mt-0.5">
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
                <p className="text-xs text-blue-600 text-center mb-4">
                  {interests.length} interest{interests.length > 1 ? "s" : ""} selected
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="flex-1 py-3 border border-gray-200 dark:border-slate-700
                             text-gray-500 dark:text-slate-400 rounded-xl text-sm
                             hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors
                             disabled:opacity-50">
                  Skip
                </button>
                {/* Fix 7: Get started button */}
                <button type="button" onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white
                             font-semibold rounded-xl text-sm transition-colors
                             disabled:opacity-60">
                  {loading ? "Creating account..." : "Get started 🎉"}
                </button>
              </div>

              <button type="button" onClick={() => setStep(1)}
                className="w-full text-center text-xs text-gray-400 dark:text-slate-500
                           mt-3 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}