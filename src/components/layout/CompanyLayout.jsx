import ErrorBoundary from "../ErrorBoundary";
import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import companyService from "../../services/company.service";
import AdExpiryModal  from "../modals/AdExpiryModal";
import NotificationBell from "../NotificationBell";

const NAV_ITEMS = [
  { to: "/company/dashboard",      icon: "📊", label: "Dashboard"      },
  { to: "/company/locations",      icon: "📍", label: "My Locations"   },
  { to: "/company/tour-products",  icon: "🗺️",  label: "Tour Products"  },
  { to: "/company/bookings",       icon: "📅", label: "Bookings"       },
  { to: "/company/discounts",      icon: "🎫", label: "Discounts"      },
  { to: "/company/staff",          icon: "👤", label: "Staff"          },
  { to: "/company/payouts",        icon: "💰", label: "Payouts"        },
  { to: "/company/advertisements", icon: "📢", label: "Advertisements" },
  { to: "/company/claims",         icon: "📋", label: "Claims"         },
  { to: "/company/profile",        icon: "🏢", label: "Profile"        },
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

export default function CompanyLayout() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [notifCount,  setNotifCount]  = useState(0);

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

  useEffect(() => {
    companyService.getNotifications()
      .then(d => setNotifCount((d.counts?.expiringSoon ?? 0) + (d.counts?.justExpired ?? 0)))
      .catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  const d = dark;

  return (
    <div className={`flex h-screen overflow-hidden ${d ? "bg-slate-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      <AdExpiryModal />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden"
             onClick={() => setMobileOpen(false)}/>
      )}

      {/* ── SIDEBAR — desktop static, mobile drawer ── */}
      <aside className={`flex-col shrink-0 transition-all duration-300 border-r
                         ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}
                         hidden lg:flex
                         ${collapsed ? "w-16" : "w-56"}`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b
                         ${d ? "border-slate-800" : "border-gray-100"}
                         ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-black text-base">W</span>
          </div>
          {!collapsed && (
            <div>
              <span className={`font-bold text-sm tracking-tight ${d ? "text-white" : "text-gray-900"}`}>
                WanderViet
              </span>
              <p className={`text-xs ${d ? "text-slate-500" : "text-gray-400"}`}>Business</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                 transition-colors duration-150 rounded-lg mx-2 mb-0.5 relative
                 ${isActive
                   ? d ? "bg-emerald-600/15 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                   : d ? "text-slate-400 hover:text-white hover:bg-slate-800"
                       : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}
                 ${collapsed ? "justify-center" : ""}`}
            >
              <span className="text-base shrink-0">{icon}</span>
              {!collapsed && <span>{label}</span>}
              {/* Notification dot cho Advertisements */}
              {label === "Advertisements" && notifCount > 0 && (
                <span className={`${collapsed ? "absolute top-1 right-1" : "ml-auto"}
                                  bg-red-500 text-white text-[10px] font-bold
                                  w-4 h-4 rounded-full flex items-center justify-center`}>
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className={`border-t p-3 ${d ? "border-slate-800" : "border-gray-100"} ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <div onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center
                         text-emerald-500 text-sm font-bold cursor-pointer">
              {user?.name?.[0]?.toUpperCase() || "C"}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center
                              text-emerald-500 text-sm font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase() || "C"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${d ? "text-white" : "text-gray-900"}`}>
                  {user?.name}
                </p>
                <p className={`text-xs ${d ? "text-slate-500" : "text-gray-400"}`}>Company</p>
              </div>
              <button onClick={handleLogout} title="Sign out"
                className={`transition-colors text-lg ${d ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
                ⇥
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside className={`lg:hidden flex flex-col fixed inset-y-0 left-0 z-50 w-64 border-r
                         transition-transform duration-300
                         ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}
                         ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b ${d ? "border-slate-800" : "border-gray-100"}`}>
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-black text-base">W</span>
          </div>
          <div>
            <span className={`font-bold text-sm tracking-tight ${d ? "text-white" : "text-gray-900"}`}>WanderViet</span>
            <p className={`text-xs ${d ? "text-slate-500" : "text-gray-400"}`}>Business</p>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                 transition-colors duration-150 rounded-lg mx-2 mb-0.5
                 ${isActive
                   ? d ? "bg-emerald-600/15 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                   : d ? "text-slate-400 hover:text-white hover:bg-slate-800"
                       : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}>
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`flex items-center gap-3 px-4 py-3.5 border-b shrink-0
                            ${d ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
          <button
            onClick={() => {
              if (window.innerWidth < 1024) setMobileOpen(!mobileOpen);
              else setCollapsed(!collapsed);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                        ${d ? "text-slate-400 hover:text-white hover:bg-slate-800"
                            : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
            </svg>
          </button>
          <div className="flex-1"/>
          {notifCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400
                             px-3 py-1 rounded-full font-medium">
              {notifCount} alert{notifCount > 1 ? "s" : ""}
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full
                            ${d ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            Company
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