import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";

export default function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { login }  = useAuth();

  const token = params.get("token");

  const [form,     setForm]     = useState({ password: "", confirm: "" });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid or missing reset link. Please request a new one.");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password: form.password });
      localStorage.setItem("token", data.token);
      navigate("/explore", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. The link may have expired.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">

        {/* Back to Login */}
        <div className="mb-4">
          <Link to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600
                       dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
            </svg>
            Back to Login
          </Link>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">W</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-lg">WanderViet</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200
                        dark:border-slate-800 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Set new password
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Choose a strong password for your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                New password
              </label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200
                             dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm
                             text-gray-900 dark:text-white placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500/25
                             focus:border-blue-500 transition-all"/>
                  <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? (
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Confirm password
              </label>
              <input type={showPass ? "text" : "password"} required
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repeat your password"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200
                           dark:border-slate-700 rounded-xl px-4 py-3 text-sm
                           text-gray-900 dark:text-white placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/25
                           focus:border-blue-500 transition-all"/>
            </div>

            {form.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => {
                    const score = [
                      form.password.length >= 6,
                      form.password.length >= 10,
                      /[A-Z]/.test(form.password) || /\d/.test(form.password),
                      /[^a-zA-Z0-9]/.test(form.password),
                    ].filter(Boolean).length;
                    const colors = ["bg-red-400","bg-orange-400","bg-yellow-400","bg-emerald-500"];
                    return (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                        ${i <= score ? colors[score-1] : "bg-gray-200 dark:bg-slate-700"}`}/>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {form.password.length < 6 ? "Too short"
                    : form.password.length < 10 ? "Weak"
                    : /[^a-zA-Z0-9]/.test(form.password) ? "Strong"
                    : "Medium"}
                </p>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2.5">
                {error}
                {error.includes("expired") && (
                  <> — <Link to="/forgot-password" className="underline">Request new link</Link></>
                )}
              </div>
            )}

            <button type="submit" disabled={loading || !token}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                         rounded-xl py-3 text-sm transition-colors disabled:opacity-60">
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}