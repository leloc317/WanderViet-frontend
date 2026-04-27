import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import useSocket from "../hooks/useSocket";

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const dropRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications", { params: { limit: 15 } });
      setNotifs(data.data.notifications ?? []);
      setUnreadCount(data.data.unreadCount ?? 0);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time: new notification pushed from server
  useSocket("notification:new", useCallback((notif) => {
    setNotifs(prev => [notif, ...prev].slice(0, 15));
    setUnreadCount(prev => prev + 1);
  }, []));

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (notif) => {
    if (!notif.isRead) {
      await api.patch(`/notifications/${notif._id}/read`).catch(() => {});
      setNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (notif.actionUrl) navigate(notif.actionUrl);
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all").catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl
                   text-gray-500 dark:text-slate-400 hover:bg-gray-100
                   dark:hover:bg-slate-800 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white
                           text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 border
                        border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50
                        overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b
                          border-gray-100 dark:border-slate-800">
            <span className="font-bold text-sm text-gray-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">
                  {unreadCount} unread
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"/>
              </div>
            ) : notifs.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                <p className="text-2xl mb-1">🔔</p>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => (
                <button key={n._id} onClick={() => markRead(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50
                              dark:hover:bg-slate-800 transition-colors border-b last:border-0
                              border-gray-50 dark:border-slate-800
                              ${!n.isRead ? "bg-blue-50/40 dark:bg-blue-500/5" : ""}`}>
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {!n.isRead
                      ? <div className="w-2 h-2 bg-blue-500 rounded-full"/>
                      : <div className="w-2 h-2 rounded-full"/>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!n.isRead ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}