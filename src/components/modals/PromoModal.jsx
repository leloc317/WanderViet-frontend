import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";

const STORAGE_KEY = "wv_promo_dismissed";
const COOLDOWN_DAYS = 3; // Hiện lại sau 3 ngày nếu chưa đăng ký

const fmtDiscount = (d) =>
  d.type === "percentage"
    ? `${d.value}%`
    : `₫${Math.round(d.value / 1000)}k`;

export default function PromoModal({ user }) {
  const navigate = useNavigate();
  const [open,      setOpen]      = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (user) return; // Đã login → không hiện

    // Check cooldown
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const diff = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (diff < COOLDOWN_DAYS) return;
    }

    // Fetch active campaigns
    api.get("/discounts/public")
      .then(r => {
        const list = r.data.data?.discounts ?? [];
        setDiscounts(list.slice(0, 3)); // Max 3 campaigns
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Hiện sau 4 giây
    const timer = setTimeout(() => setOpen(true), 4000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setOpen(false);
  };

  const handleRegister = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    navigate("/register");
  };

  if (!open || loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                    p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
         onClick={handleDismiss}>
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl
                   border dark:border-slate-700 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header với gradient xanh đơn màu */}
        <div className="bg-blue-600 px-6 pt-6 pb-8 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-blue-500 opacity-50"/>
          <div className="absolute -right-2 bottom-0 w-16 h-16 rounded-full bg-blue-700 opacity-40"/>

          <button onClick={handleDismiss}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-blue-500/50
                       flex items-center justify-center text-white/80 hover:text-white
                       hover:bg-blue-500 transition-colors text-lg leading-none">
            ×
          </button>

          <div className="relative">
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="text-white font-bold text-lg leading-tight mb-1">
              Sign up now to enjoy exclusive offers!
            </h3>
            <p className="text-blue-100 text-sm">
              WanderViet members get access to special promotions
            </p>
          </div>
        </div>

        {/* Campaigns list */}
        <div className="px-6 py-5">
          {discounts.length > 0 ? (
            <>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500
                            uppercase tracking-wider mb-3">
                Ongoing
              </p>
              <div className="space-y-2.5 mb-5">
                {discounts.map(d => (
                  <div key={d._id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800
                               rounded-xl border border-gray-100 dark:border-slate-700">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl
                                    flex items-center justify-center shrink-0">
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        {fmtDiscount(d)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {d.description || `Save ${fmtDiscount(d)}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Code: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {d.code}
                        </span>
                        {d.validUntil && (
                          <> · Expires {new Date(d.validUntil).toLocaleDateString("vi-VN")}</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mb-5 space-y-2">
              {[
                { icon:"💰", text:"Get exclusive discount codes" },
                { icon:"⭐", text:"Personalized recommendations just for you" },
                { icon:"❤️", text:"Save your favorite places" },
                { icon:"📅", text:"Easy and seamless booking" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm
                                           text-gray-700 dark:text-slate-300">
                  <span className="text-base w-6 text-center">{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          )}

          {/* CTAs */}
          <button onClick={handleRegister}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                       py-3 rounded-xl text-sm transition-colors mb-2">
            Sign up for free
          </button>
          <button onClick={() => { navigate("/login"); handleDismiss(); }}
            className="w-full text-sm text-gray-500 dark:text-slate-400 py-2
                       hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
            Already have an account? Log in
          </button>
        </div>
      </div>
    </div>
  );
}