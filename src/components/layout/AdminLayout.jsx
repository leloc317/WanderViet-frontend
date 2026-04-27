import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";

const NAV_ITEMS = [
  {
    group: "Overview",
    items: [
      { to: "/admin/dashboard", icon: "📊", label: "Dashboard" },
    ],
  },
  {
    group: "Management",
    items: [
      { to: "/admin/users",          icon: "👥", label: "Users"          },
      { to: "/admin/locations",      icon: "📍", label: "Locations"      },
      { to: "/admin/tours",          icon: "🗺️",  label: "Tours"          },
      { to: "/admin/advertisements", icon: "📢", label: "Advertisements" },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/admin/approved-team",    icon: "✅", label: "Approved Team"    },
      { to: "/admin/explore-sections", icon: "🌏", label: "Explore Sections" },
      { to: "/admin/tags",             icon: "🏷️", label: "Tags"             },
      { to: "/admin/claims",           icon: "📋", label: "Claims"           },
      { to: "/admin/bookings",         icon: "📅", label: "Bookings"         },
      { to: "/admin/tour-products",    icon: "🗺️",  label: "Tour Products"    },
      { to: "/admin/payments",         icon: "💳", label: "Payments"         },
      { to: "/admin/payouts",          icon: "💰", label: "Payouts"          },
      { to: "/admin/discounts",        icon: "🎫", label: "Discounts"        },
      { to: "/admin/config",           icon: "⚙️",  label: "Config"           },
    ],
  },
];

const ROLE_LABEL = {
  admin: "Administrator", staff: "Staff", approved: "Approved Team",
  user: "User", company: "Company",
};

function SunIcon()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>; }
function MoonIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>; }

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Desktop: collapse sidebar to icon-only
  // Mobile/tablet: hide sidebar entirely, toggle with hamburger
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Close mobile sidebar on route change or outside click
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  const closeMobile  = () => setMobileOpen(false);

  const d = dark;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-14 border-b shrink-0
                       ${d ? "border-slate-800" : "border-gray-100"}
                       ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-black text-base">W</span>
        </div>
        {!collapsed && (
          <span className={`font-bold text-base tracking-tight ${d ? "text-white" : "text-gray-900"}`}>
            WanderViet
          </span>
        )}
      </div>

      {/* Nav — scrollable */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-3">
            {!collapsed && (
              <p className={`text-[10px] font-bold uppercase tracking-widest px-4 mb-1
                             ${d ? "text-slate-500" : "text-gray-400"}`}>
                {group.group}
              </p>
            )}
            {group.items.map(({ to, icon, label }) => (
              <NavLink key={to} to={to}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium mx-2 mb-0.5
                   rounded-lg transition-colors
                   ${isActive
                     ? d ? "bg-blue-600/15 text-blue-400" : "bg-blue-50 text-blue-600"
                     : d ? "text-slate-400 hover:text-white hover:bg-slate-800"
                         : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}
                   ${collapsed ? "justify-center" : ""}`}
              >
                <span className="text-base shrink-0">{icon}</span>
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className={`border-t p-3 shrink-0 ${d ? "border-slate-800" : "border-gray-100"}
                       ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <button onClick={handleLogout}
            className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center
                       text-blue-500 text-sm font-bold"
            title="Sign out">
            {user?.name?.[0]?.toUpperCase() || "A"}
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center
                            text-blue-500 text-sm font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${d ? "text-white" : "text-gray-900"}`}>
                {user?.name}
              </p>
              <p className={`text-xs truncate ${d ? "text-slate-500" : "text-gray-400"}`}>
                {ROLE_LABEL[user?.role]}
              </p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className={`transition-colors text-lg
                          ${d ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
              ⇥
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`flex h-screen overflow-hidden ${d ? "bg-slate-950 text-white" : "bg-gray-50 text-gray-900"}`}>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden"
             onClick={closeMobile}/>
      )}

      {/* ── SIDEBAR — desktop: static, mobile: fixed drawer ── */}
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r transition-all duration-300
                         ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}
                         ${collapsed ? "w-16" : "w-56"}`}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      <aside className={`lg:hidden flex flex-col fixed inset-y-0 left-0 z-50 w-64
                         border-r transition-transform duration-300
                         ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}
                         ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className={`flex items-center gap-3 px-4 h-14 border-b shrink-0
                            ${d ? "bg-slate-900/80 border-slate-800" : "bg-white border-gray-200"}`}>
          {/* Hamburger — toggle collapsed on desktop, drawer on mobile */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) setMobileOpen(!mobileOpen);
              else setCollapsed(!collapsed);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                        ${d ? "text-slate-400 hover:text-white hover:bg-slate-800"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
            </svg>
          </button>

          <div className="flex-1"/>

          <span className={`hidden sm:inline text-xs px-2.5 py-1 rounded-full
                            ${d ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            {ROLE_LABEL[user?.role]}
          </span>
          <NotificationBell />
          <button onClick={() => setDark(!d)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                        ${d ? "bg-slate-800 text-amber-400 hover:bg-slate-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {d ? <SunIcon/> : <MoonIcon/>}
          </button>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto ${d ? "bg-slate-950" : "bg-gray-50"}`}>
          <div className="p-4 sm:p-6">
            <Outlet context={{ dark: d }}/>
          </div>
        </main>
      </div>
    </div>
  );
}