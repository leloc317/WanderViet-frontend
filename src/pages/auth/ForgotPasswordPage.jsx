import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/axios";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
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
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-full
                              flex items-center justify-center mx-auto mb-4 text-2xl">
                📧
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Check your email
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
                Check your spam folder if you don't see it.
              </p>
              <Link to="/login"
                className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700
                           text-white font-semibold rounded-xl text-sm transition-colors">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Forgot password?
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Enter your email and we'll send a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200
                               dark:border-slate-700 rounded-xl px-4 py-3 text-sm
                               text-gray-900 dark:text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/25
                               focus:border-blue-500 transition-all"/>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                             rounded-xl py-3 text-sm transition-colors disabled:opacity-60">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-6">
                Remember your password?{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}