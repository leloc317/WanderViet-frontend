import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";
import userAppService from "../../services/userApp.service";

const CAT_ICON = {
  restaurant:"🍽️", hotel:"🏨", tourist_spot:"🏛️",
  cafe:"☕", entertainment:"🎡", shopping:"🛍️", other:"📍",
};

function LocationCard({ loc, isFav, onFavToggle }) {
  const navigate = useNavigate();
  const [faving, setFaving] = useState(false);
  const img = loc.images?.find(i => i.isPrimary)?.url || loc.images?.[0]?.url;

  const handleFav = async (e) => {
    e.stopPropagation();
    setFaving(true);
    try { await onFavToggle(loc._id); }
    finally { setFaving(false); }
  };

  return (
    <div onClick={() => navigate(`/locations/${loc._id}`)}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                 rounded-2xl overflow-hidden cursor-pointer group
                 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all">
      <div className="relative h-44 bg-gray-100 dark:bg-slate-800 overflow-hidden">
        {img
          ? <img src={img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl">{CAT_ICON[loc.category]||"🏞️"}</div>
        }
        {loc.advertisement?.isActive && (
          <span className="absolute top-2 left-2 bg-gray-900/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">AD</span>
        )}
        {loc.verifiedBy?.length > 0 && (
          <span className="absolute bottom-2 left-2 bg-teal-600/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">✅ Verified</span>
        )}
        {onFavToggle && (
          <button onClick={handleFav} disabled={faving}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center
                        backdrop-blur-sm transition-all text-sm
                        ${isFav ? "bg-red-500 text-white" : "bg-white/80 text-gray-500 hover:bg-white"}`}>
            {faving ? "·" : isFav ? "❤️" : "🤍"}
          </button>
        )}
      </div>

      <div className="p-4">
        <p className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">{loc.name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">📍 {loc.address?.city || "—"}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {loc.rating?.finalScore?.toFixed(1) || "0.0"}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">({loc.rating?.totalReviews || 0})</span>
          </div>
          {loc.priceRange?.label && (
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {loc.priceRange.label === "free" ? "🆓 Free"
               : loc.priceRange.label === "budget" ? "$"
               : loc.priceRange.label === "mid"    ? "$$"
               : loc.priceRange.label === "high"   ? "$$$"
               : "$$$$"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const SECTION_LABELS = {
  for_you:   { title:"Suggested for You",    subtitle:"Based on your travel interests" },
  promo:     { title:"Trending Now",          subtitle:"Best destinations to explore"  },
  trending:  { title:"Trending This Season", subtitle:"Popular destinations"           },
  popular:   { title:"Most Popular",         subtitle:"Highest rated by travelers"     },
  new:       { title:"New & Verified",       subtitle:"Recently added, AT verified"   },
  featured:  { title:"Featured Destinations",subtitle:"Promoted by partners"          },
};

export default function SectionPage() {
  const { key }    = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(true);
  const [favorites, setFavorites] = useState([]);

  const meta = SECTION_LABELS[key] || { title: key, subtitle: "" };

  const fetchLocations = async (p = 1) => {
    setLoading(true);
    try {
      // Map section key to query params
      const params = { status:"approved", page: p, limit: 12 };
      if (key === "trending")  { params.sortBy = "stats.detailViews"; params.sortOrder = "desc"; }
      if (key === "popular")   { params.sortBy = "rating.finalScore"; params.sortOrder = "desc"; }
      if (key === "new")       { params.sortBy = "createdAt"; params.sortOrder = "desc"; params.atVerified = true; }
      if (key === "featured")  { params.adOnly = true; }
      if (key === "for_you" || key === "promo") { params.sortBy = "rating.finalScore"; params.sortOrder = "desc"; }

      const { data } = await api.get("/locations", { params });
      const locs = data.data.locations || [];

      setLocations(prev => p === 1 ? locs : [...prev, ...locs]);
      setHasMore(locs.length === 12);
      setPage(p);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLocations(1);
    if (user) {
      userAppService.getFavorites()
        .then(favs => setFavorites(favs.map(f => f._id)))
        .catch(() => {});
    }
  }, [key]);

  const handleFavToggle = async (locationId) => {
    if (!user) { navigate("/login"); return; }
    await userAppService.toggleFavorite(locationId);
    setFavorites(prev =>
      prev.includes(locationId) ? prev.filter(id => id !== locationId) : [...prev, locationId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* NAV */}
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/explore")}
            className="flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
            </svg>
            <span className="text-sm">Back to Explore</span>
          </button>
          <div className="flex-1"/>
          {user ? (
            <button onClick={() => navigate("/profile")}
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-600/20 flex items-center
                         justify-center text-blue-600 dark:text-blue-400 text-sm font-bold">
              {user.name?.[0]?.toUpperCase()}
            </button>
          ) : (
            <Link to="/login" className="text-sm text-blue-600 dark:text-blue-400 font-medium">Log in</Link>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{meta.title}</h1>
          {meta.subtitle && (
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{meta.subtitle}</p>
          )}
        </div>

        {/* Grid */}
        {loading && locations.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({length:8}).map((_,i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-2">🏞️</p>
            <p className="text-gray-500 dark:text-slate-400 text-sm">No locations found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {locations.map(loc => (
                <LocationCard key={loc._id} loc={loc}
                  isFav={favorites.includes(loc._id)}
                  onFavToggle={handleFavToggle}/>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button onClick={() => fetchLocations(page + 1)} disabled={loading}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                             text-gray-700 dark:text-slate-300 text-sm font-medium
                             px-6 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800
                             disabled:opacity-50 transition-colors">
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}