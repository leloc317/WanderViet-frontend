import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";

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

export default function UserLayout() {
  const auth = useAuth();
  const user   = auth?.user   ?? null;
  const logout = auth?.logout ?? (() => {});
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleLogout = () => { logout(); navigate("/login"); setMenuOpen(false); };

  const d = dark;
  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors px-1 py-0.5
     ${isActive ? "text-blue-600 dark:text-blue-400"
                : d ? "text-slate-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`;

  return (
    <div className={`min-h-screen flex flex-col ${d ? "bg-slate-950 text-white" : "bg-white text-gray-900"}`}>
      {/* ── Navbar ── */}
      <header className={`sticky top-0 z-40 border-b ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"} shadow-sm`}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">W</span>
            </div>
            <span className={`font-bold text-sm ${d ? "text-white" : "text-gray-900"}`}>WanderViet</span>
          </NavLink>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-5 ml-4">
            <NavLink to="/explore" className={linkCls}>Explore</NavLink>
            <NavLink to="/tours"   className={linkCls}>Tours</NavLink>
            <NavLink to="/trips"   className={linkCls}>Trips</NavLink>
          </nav>

          <div className="flex-1"/>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            <button onClick={() => setDark(!d)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                          ${d ? "bg-slate-800 text-amber-400 hover:bg-slate-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {d ? <SunIcon/> : <MoonIcon/>}
            </button>

            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-sm
                              ${d ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}>
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate">{user.name}</span>
                  <span className="text-xs">▾</span>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}/>
                    <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl z-50 py-2 overflow-hidden
                                     ${d ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
                      <div className={`px-4 py-2 border-b ${d ? "border-slate-800" : "border-gray-100"}`}>
                        <p className={`text-sm font-semibold ${d ? "text-white" : "text-gray-900"}`}>{user.name}</p>
                        <p className={`text-xs ${d ? "text-slate-500" : "text-gray-400"}`}>{user.email}</p>
                      </div>
                      {[
                        { to: "/profile",          label: "👤 Profile" },
                        { to: "/profile/bookings", label: "📅 My Bookings" },
                        { to: "/trips",            label: "🗺️ My Trips" },
                        { to: "/favorites",        label: "❤️ Favorites" },
                      ].map(item => (
                        <NavLink key={item.to} to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className={`block px-4 py-2.5 text-sm transition-colors
                                      ${d ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                                          : "text-gray-700 hover:bg-gray-50"}`}>
                          {item.label}
                        </NavLink>
                      ))}
                      {user.role === "company" && (
                        <NavLink to="/company" onClick={() => setMenuOpen(false)}
                          className={`block px-4 py-2.5 text-sm transition-colors border-t mt-1
                                      ${d ? "border-slate-800 text-emerald-400 hover:bg-slate-800"
                                          : "border-gray-100 text-emerald-600 hover:bg-gray-50"}`}>
                          Company Portal
                        </NavLink>
                      )}
                      {user.role === "approved" && (
                        <NavLink to="/approved" onClick={() => setMenuOpen(false)}
                          className={`block px-4 py-2.5 text-sm transition-colors border-t mt-1
                                      ${d ? "border-slate-800 text-blue-400 hover:bg-slate-800"
                                          : "border-gray-100 text-blue-600 hover:bg-gray-50"}`}>
                          AT Portal
                        </NavLink>
                      )}
                      {user.role === "admin" && (
                        <NavLink to="/admin" onClick={() => setMenuOpen(false)}
                          className={`block px-4 py-2.5 text-sm transition-colors border-t mt-1
                                      ${d ? "border-slate-800 text-red-400 hover:bg-slate-800"
                                          : "border-gray-100 text-red-600 hover:bg-gray-50"}`}>
                          Admin Portal
                        </NavLink>
                      )}
                      {user.role === "company_staff" && (
                        <NavLink to="/staff" onClick={() => setMenuOpen(false)}
                          className={`block px-4 py-2.5 text-sm transition-colors border-t mt-1
                                      ${d ? "border-slate-800 text-red-400 hover:bg-slate-800"
                                          : "border-gray-100 text-red-600 hover:bg-gray-50"}`}>
                          Staff Portal
                        </NavLink>
                      )}
                      <button onClick={handleLogout}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-t mt-1
                                    ${d ? "border-slate-800 text-red-400 hover:bg-slate-800"
                                        : "border-gray-100 text-red-500 hover:bg-gray-50"}`}>
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <NavLink to="/login"
                  className={`hidden sm:block px-4 py-1.5 rounded-xl text-sm font-medium transition-colors
                              ${d ? "text-slate-300 hover:text-white hover:bg-slate-800"
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}>
                  Sign in
                </NavLink>
                <NavLink to="/register"
                  className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  <span className="hidden sm:inline">Join free</span>
                  <span className="sm:hidden">Join</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t
                       ${d ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}
                       flex items-center justify-around h-14 px-2 shadow-lg`}>
        {[
          { to: "/explore", icon: "🌏", label: "Explore"  },
          { to: "/tours",   icon: "🗺️",  label: "Tours"    },
          { to: "/trips",   icon: "📅", label: "Trips"    },
          { to: user ? "/profile" : "/login",
            icon: user ? (user.name?.[0]?.toUpperCase() ?? "👤") : "👤",
            label: user ? "Profile" : "Sign in",
            isAvatar: !!user,
          },
        ].map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors
               ${isActive
                 ? d ? "text-blue-400" : "text-blue-600"
                 : d ? "text-slate-500" : "text-gray-400"}`
            }>
            {item.isAvatar ? (
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center
                              text-blue-600 dark:text-blue-400 font-bold text-xs">
                {item.icon}
              </div>
            ) : (
              <span className="text-lg leading-none">{item.icon}</span>
            )}
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 pb-14 md:pb-0">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className={`border-t py-6 px-4 text-center text-xs ${d ? "border-slate-800 text-slate-600" : "border-gray-200 text-gray-400"}`}>
        © {new Date().getFullYear()} WanderViet · Discovery across Vietnam
      </footer>
    </div>
  );
}