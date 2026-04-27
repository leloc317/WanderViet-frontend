import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import companyService from "../../services/company.service";

// ─── Config theo mức độ ───────────────────────────────────────────────────────
const LEVEL_CFG = {
  critical: {
    bg:     "bg-red-50 dark:bg-red-500/10",
    border: "border-red-300 dark:border-red-500/40",
    badge:  "bg-red-600 text-white",
    icon:   "🔴",
    dot:    "bg-red-500",
  },
  urgent: {
    bg:     "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-300 dark:border-orange-500/40",
    badge:  "bg-orange-500 text-white",
    icon:   "🟠",
    dot:    "bg-orange-500",
  },
  warning: {
    bg:     "bg-amber-50 dark:bg-amber-400/10",
    border: "border-amber-300 dark:border-amber-400/40",
    badge:  "bg-amber-500 text-white",
    icon:   "🟡",
    dot:    "bg-amber-500",
  },
  expired: {
    bg:     "bg-gray-100 dark:bg-slate-800",
    border: "border-gray-300 dark:border-slate-600",
    badge:  "bg-gray-600 text-white",
    icon:   "⚫",
    dot:    "bg-gray-500",
  },
};

const STORAGE_KEY = "ad_notif_dismissed"; // lưu ngày đã dismiss để không hiện lại trong ngày

export default function AdExpiryModal() {
  const navigate = useNavigate();
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState([]);
  const [renewing, setRenewing] = useState(null);
  const [counts,   setCounts]  = useState({});

  useEffect(() => {
    // Kiểm tra đã dismiss hôm nay chưa
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const today     = new Date().toDateString();
    if (dismissed === today) return;

    companyService.getNotifications()
      .then(data => {
        const urgent = data.notifications.filter(n =>
          ["critical", "urgent", "warning", "expired"].includes(n.type)
        );
        if (urgent.length > 0) {
          setNotifs(urgent);
          setCounts(data.counts);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    // Dismiss trong ngày hôm nay
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    setOpen(false);
  };

  const handleRenew = async (orderId) => {
    setRenewing(orderId);
    try {
      await companyService.renewAd(orderId, {});
      // Xóa notif vừa renew
      setNotifs(prev => prev.filter(n => n.orderId?.toString() !== orderId?.toString()));
      if (notifs.length <= 1) setOpen(false);
    } catch(e) {
      alert(e.response?.data?.message || "Renewal failed");
    } finally {
      setRenewing(null);
    }
  };

  const handleGoToAds = () => {
    setOpen(false);
    navigate("/company/advertisements");
  };

  if (!open || notifs.length === 0) return null;

  const hasCritical = counts.critical > 0;
  const hasUrgent   = counts.urgent   > 0;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                      rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-5 py-4 border-b border-gray-200 dark:border-slate-800
                         ${hasCritical ? "bg-red-50 dark:bg-red-500/10" : hasUrgent ? "bg-orange-50 dark:bg-orange-500/10" : "bg-amber-50 dark:bg-amber-400/10"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {hasCritical ? "🚨" : hasUrgent ? "⚠️" : "💡"}
              </span>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {hasCritical ? "Action Required!" : hasUrgent ? "Ads Expiring Soon" : "Ad Reminders"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {notifs.length} ad{notifs.length > 1 ? "s" : ""} need{notifs.length === 1 ? "s" : ""} your attention
                </p>
              </div>
            </div>
            <button onClick={handleDismiss}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none
                         text-gray-400 hover:text-gray-700 dark:hover:text-white
                         hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
              ×
            </button>
          </div>

          {/* Summary badges */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {counts.critical > 0 && (
              <span className="text-xs bg-red-600 text-white px-2.5 py-0.5 rounded-full font-semibold">
                🔴 {counts.critical} expiring today
              </span>
            )}
            {counts.urgent > 0 && (
              <span className="text-xs bg-orange-500 text-white px-2.5 py-0.5 rounded-full font-semibold">
                🟠 {counts.urgent} within 3 days
              </span>
            )}
            {counts.warning > 0 && (
              <span className="text-xs bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-semibold">
                🟡 {counts.warning} within 7 days
              </span>
            )}
            {counts.expired > 0 && (
              <span className="text-xs bg-gray-600 text-white px-2.5 py-0.5 rounded-full font-semibold">
                ⚫ {counts.expired} expired
              </span>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-2.5">
          {notifs.map((n, i) => {
            const cfg = LEVEL_CFG[n.type] ?? LEVEL_CFG.warning;
            const isRenewing = renewing === n.orderId?.toString();

            return (
              <div key={i}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all
                            ${cfg.bg} ${cfg.border}`}>
                {/* Dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}/>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {n.locationName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {n.type === "expired" ? "EXPIRED"
                       : n.daysLeft === 0   ? "TODAY"
                       : n.daysLeft === 1   ? "1 DAY LEFT"
                       : `${n.daysLeft} DAYS LEFT`}
                    </span>
                    {n.packageName && (
                      <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {n.packageName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Renew button */}
                {n.action === "renew" && (
                  <button
                    onClick={() => handleRenew(n.orderId)}
                    disabled={isRenewing}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg
                                transition-all disabled:opacity-50
                                ${n.type === "critical" || n.type === "expired"
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : n.type === "urgent"
                                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                                    : "bg-amber-500 hover:bg-amber-600 text-white"}`}>
                    {isRenewing ? "..." : "Renew"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200
                       dark:border-slate-700 text-gray-600 dark:text-slate-400
                       hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Remind me later
          </button>
          <button
            onClick={handleGoToAds}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                       bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
            Manage Ads →
          </button>
        </div>
      </div>
    </div>
  );
}