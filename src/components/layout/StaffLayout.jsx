import ErrorBoundary from "../ErrorBoundary";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";

const NAV_ITEMS = [
  { to: "/staff/bookings", icon: "📋", label: "Bookings"  },
  { to: "/staff/units",    icon: "🛏️", label: "Units"     },
  { to: "/staff/walk-in",  icon: "🚶", label: "Walk-in"   },
];

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
    </svg>
  );
}

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark");    localStorage.setItem("theme", "dark");  }
    else       { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);

  const handleLogout = () => { logout(); navigate("/login"); };
  const d = dark;

  // Tên location được assign
  const locationName = user?.staffInfo?.location?.name ?? "My Location";

  return (
    <div className={`flex h-screen overflow-hidden ${d ? "bg-slate-950 text-white" : "bg-gray-50 text-gray-900"}`}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)}/>
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r
                         transition-transform duration-300
                         ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}
                         ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className={`px-4 py-4 border-b flex items-center gap-3 ${d ? "border-slate-800" : "border-gray-100"}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">W</span>
          </div>
          <span className={`font-bold text-sm ${d ? "text-white" : "text-gray-900"}`}>Staff Portal</span>
        </div>
        <nav className="flex-1 py-3">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 mb-0.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? (d ? "bg-blue-600/15 text-blue-400" : "bg-blue-50 text-blue-700")
                            : (d ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}`}>
              <span>{icon}</span><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>


      {/* ── SIDEBAR ── */}
      <aside className={`flex flex-col shrink-0 w-52 border-r
                         ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>

        {/* Header */}
        <div className={`px-4 py-5 border-b ${d ? "border-slate-800" : "border-gray-100"}`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-black text-base">W</span>
            </div>
            <div>
              <span className={`font-bold text-sm ${d ? "text-white" : "text-gray-900"}`}>WanderViet</span>
              <p className={`text-xs ${d ? "text-slate-500" : "text-gray-400"}`}>Staff</p>
            </div>
          </div>
          {/* Location badge */}
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                           ${d ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
            <span>📍</span>
            <span className="truncate">{locationName}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                 transition-colors rounded-lg mx-2 mb-0.5
                 ${isActive
                   ? d ? "bg-blue-600/15 text-blue-400" : "bg-blue-50 text-blue-700"
                   : d ? "text-slate-400 hover:text-white hover:bg-slate-800"
                       : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}>
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className={`border-t p-3 ${d ? "border-slate-800" : "border-gray-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center
                            text-blue-500 text-sm font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${d ? "text-white" : "text-gray-900"}`}>{user?.name}</p>
              <p className={`text-xs ${d ? "text-slate-500" : "text-gray-400"}`}>Staff</p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className={`transition-colors text-lg ${d ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
              ⇥
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`flex items-center gap-3 px-6 py-3.5 border-b shrink-0
                            ${d ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
          <div className="flex-1"/>
          <span className={`text-xs px-3 py-1 rounded-full
                            ${d ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            {locationName}
          </span>
          <NotificationBell />
          <button onClick={() => setDark(!d)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                        ${d ? "bg-slate-800 text-amber-400 hover:bg-slate-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {d ? <SunIcon/> : <MoonIcon/>}
          </button>
        </header>

        <main className={`flex-1 overflow-y-auto p-6 ${d ? "bg-slate-950" : "bg-gray-50"}`}>
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>
    </div>
  );
}