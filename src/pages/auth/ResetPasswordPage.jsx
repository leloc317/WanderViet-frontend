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
    if (form.password !== form.confirm) {
      setError("Passwords do not match"); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token, password: form.password,
      });
      // Auto login after reset
      localStorage.setItem("token", data.token);
      navigate("/explore", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. The link may have expired.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-2 mb-8">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                  {showPass ? "🙈" : "👁"}
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

            {/* Strength indicator */}
            {form.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => {
                    const len  = form.password.length;
                    const hasUpper  = /[A-Z]/.test(form.password);
                    const hasNum    = /\d/.test(form.password);
                    const hasSymbol = /[^a-zA-Z0-9]/.test(form.password);
                    const score = [len >= 6, len >= 10, hasUpper || hasNum, hasSymbol].filter(Boolean).length;
                    const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];
                    return (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                                               ${i <= score ? colors[score - 1] : "bg-gray-200 dark:bg-slate-700"}`}/>
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
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10
                              rounded-xl px-4 py-2.5">
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

          <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-6">
            <Link to="/login" className="text-blue-600 hover:underline">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}