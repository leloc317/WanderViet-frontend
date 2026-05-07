import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import userAppService from "../../services/userApp.service";
import HeroSearch from "../../components/HeroSearch";
import useTracking from "../../hooks/useTracking";
import RecommendationsSection from "../../components/RecommendationsSection";
import adService from "../../services/ad.service";
import useGeolocation from "../../hooks/useGeolocation";
import PromoModal from "../../components/modals/PromoModal";
import {
  Globe, UtensilsCrossed, Hotel, Landmark,
  Coffee, Sparkles, ShoppingBag
} from "lucide-react";

const CATEGORIES = [
  { key: "all",           label: "All",          icon: <Globe size={15} strokeWidth={1.5}/> },
  { key: "restaurant",    label: "Restaurants",  icon: <UtensilsCrossed size={15} strokeWidth={1.5}/> },
  { key: "hotel",         label: "Hotels",       icon: <Hotel size={15} strokeWidth={1.5}/> },
  { key: "tourist_spot",  label: "Sights",       icon: <Landmark size={15} strokeWidth={1.5}/> },
  { key: "cafe",          label: "Cafes",        icon: <Coffee size={15} strokeWidth={1.5}/> },
  { key: "entertainment", label: "Entertainment",icon: <Sparkles size={15} strokeWidth={1.5}/> },
  { key: "shopping",      label: "Shopping",     icon: <ShoppingBag size={15} strokeWidth={1.5}/> },
];

// AD badge color theo package tier
const adBadge = (ad) => {
  if (!ad?.isActive) return null;
  const pkg = ad.packageType ?? ad.type;
  if (pkg === "premium") return { cls: "bg-amber-400 text-amber-900", label: "⭐ AD" };
  if (pkg === "standard") return { cls: "bg-blue-600 text-white",    label: "AD" };
  return                         { cls: "bg-gray-700/80 text-white", label: "AD" };
};

const PRICE_LABEL = { free:"Free", budget:"Low", mid:"Medium", high:"High", luxury:"Luxury" };

const PRICE_HUMAN = { free:"Free", budget:"Low", mid:"Medium", high:"High", luxury:"Luxury" };

// Format giá thực tế từ priceRange.min
const fmtPrice = (loc) => {
  const min = loc.priceRange?.min;
  if (min > 0) {
    if (min >= 1000000) return `₫${(min/1000000).toFixed(1).replace(".0","")}M`;
    if (min >= 1000)    return `₫${Math.round(min/1000)}k`;
    return `₫${min.toLocaleString("vi-VN")}`;
  }
  if (loc.priceRange?.label === "free") return "Free";
  return null; // no price → return null, card won't show price row
};

const fmtPriceNote = (loc) => {
  if (loc.priceRange?.min === 0 || loc.priceRange?.label === "free") return null;
  return loc.category === "hotel" ? "/night" : "/person";
};

// ─── Nearby section ───────────────────────────────────────────────────────────
function NearbySection({ favorites, onFavToggle, user }) {
  const navigate = useNavigate();
  const { position, request, loading: geoLoading } = useGeolocation();
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!position) return;
    setLoading(true);
    api.get("/search/locations", {
      params: {
        lat: position.lat, lng: position.lng,
        radius: 5000, sortBy: "near_me", limit: 8,
        status: "approved",
      },
    })
      .then(r => setLocations(r.data.data?.locations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [position]);

  const handleRequest = () => {
    setRequested(true);
    request();
  };

  // Don't show if already have positions but no results
  if (position && !loading && locations.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">📍 Near you</h2>
        {position && (
          <span className="text-xs text-gray-400 dark:text-slate-500">
            Within 5km
          </span>
        )}
      </div>

      {!position && !geoLoading && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                        rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20
                          flex items-center justify-center text-xl shrink-0">
            📍
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
              Discover places near you
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Allow location access to see hotels, restaurants & more nearby
            </p>
          </div>
          <button onClick={handleRequest}
            className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                       text-sm font-semibold rounded-xl transition-colors">
            {requested ? "Waiting..." : "Use my location"}
          </button>
        </div>
      )}

      {(geoLoading || loading) && (
        <div className="flex gap-3 overflow-hidden">
          {[1,2,3,4].map(i => (
            <div key={i} className="shrink-0 w-40 animate-pulse">
              <div className="h-28 bg-gray-200 dark:bg-slate-800 rounded-2xl mb-2"/>
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-28 mb-1"/>
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-20"/>
            </div>
          ))}
        </div>
      )}

      {position && !loading && locations.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
          {locations.map(loc => {
            const img = loc.images?.find(i=>i.isPrimary)?.url || loc.images?.[0]?.url;
            const isFav = favorites?.includes(loc._id);
            const [lng, lat] = loc.coordinates?.coordinates || [];
            const dist = lat && position
              ? (() => {
                  const R = 6371, dLat=(lat-position.lat)*Math.PI/180, dLng=(lng-position.lng)*Math.PI/180;
                  const a = Math.sin(dLat/2)**2 + Math.cos(position.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
                  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  return km < 1 ? `${Math.round(km*1000)}m` : `${km.toFixed(1)}km`;
                })()
              : null;
            return (
              <div key={loc._id}
                onClick={() => navigate(`/locations/${loc._id}`)}
                className="shrink-0 w-40 cursor-pointer group">
                <div className="relative h-28 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 mb-2">
                  {img
                    ? <img src={img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🏞️</div>
                  }
                  {dist && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px]
                                    font-semibold px-2 py-0.5 rounded-full">
                      📍 {dist}
                    </div>
                  )}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{loc.name}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                    {loc.address?.district || loc.address?.city || "—"}
                  </p>
                  <span className="text-xs text-amber-500 font-medium shrink-0">
                    ★ {loc.rating?.finalScore?.toFixed(1) || "0.0"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LocationCard({ loc, isFav, onFavToggle }) {
  const navigate = useNavigate();
  const [faving, setFaving] = useState(false);
  const { trackView } = useTracking();
  const img   = loc.images?.find(i => i.isPrimary)?.url || loc.images?.[0]?.url;
  const badge = adBadge(loc.advertisement);
  const isAd  = !!badge;

  // Urgency — thực tế từ backend
  const available   = loc._availableUnits;
  const urgencyText = loc.category === "hotel" && typeof available === "number"
    ? available === 0 ? "Not available" : available <= 3 ? `Only ${available} left` : null
    : null;

  // Sale badge
  const discount = loc._discount;
  const saleBadge = discount
    ? discount.type === "percentage"
      ? `${discount.value}% OFF`
      : `₫${Math.round(discount.value / 1000)}k OFF`
    : null;

  const handleFav = async (e) => {
    e.stopPropagation();
    setFaving(true);
    try { await onFavToggle(loc._id); }
    finally { setFaving(false); }
  };

  const handleClick = () => {
    navigate(`/locations/${loc._id}`);
    trackView(loc._id, loc.category, loc.priceRange?.label);
    if (isAd) adService.trackClick(loc._id).catch(()=>{});
  };

  return (
    <div onClick={handleClick} className="cursor-pointer group">

      {/* Image — Airbnb ratio ~4:3 */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden
                      bg-gray-100 dark:bg-slate-800 mb-3">
        {img
          ? <img src={img} alt={loc.name}
              className="w-full h-full object-cover
                         group-hover:scale-[1.03] transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl">🏞️</div>
        }

        {/* AD badge */}
        {badge && (
          <span className={`absolute top-3 left-3 text-[11px] font-bold
                            px-2 py-0.5 rounded-md ${badge.cls}`}>
            {badge.label}
          </span>
        )}

        {/* Sale badge — bottom left, xanh lá */}
        {saleBadge && (
          <span className="absolute bottom-3 left-3 bg-emerald-500 text-white
                           text-[11px] font-bold px-2 py-0.5 rounded-md">
            🏷️ {saleBadge}
          </span>
        )}
        {loc.verifiedBy?.length > 0 && !saleBadge && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1
                           bg-teal-600/90 text-white text-[10px] font-semibold
                           px-2 py-0.5 rounded-full">
            ✅ Verified
          </span>
        )}

        {/* Fav */}
        {onFavToggle && (
          <button onClick={handleFav} disabled={faving}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center
                        justify-center backdrop-blur-sm transition-all text-base
                        ${isFav
                          ? "bg-white text-red-500"
                          : "bg-white/70 text-gray-500 hover:bg-white"}`}>
            {faving ? "·" : isFav ? "♥" : "♡"}
          </button>
        )}
      </div>

      {/* Info — kiểu Airbnb: không có border/box, chỉ text */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="font-semibold text-gray-900 dark:text-white text-sm
                        truncate leading-snug">
            {loc.name}
          </p>
          {/* Rating nhỏ bên phải tên */}
          {loc.rating?.finalScore > 0 && (
            <span className="flex items-center gap-0.5 shrink-0 text-sm">
              <svg className="w-3 h-3 fill-gray-900 dark:fill-white" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-gray-900 dark:text-white text-xs font-medium">
                {loc.rating.finalScore.toFixed(1)}
              </span>
            </span>
          )}
        </div>

        <p className="text-gray-400 dark:text-slate-500 text-xs mb-1 truncate">
          {loc.address?.city || loc.address?.district || "—"}
        </p>

        {/* Urgency */}
        {urgencyText && (
          <p className={`text-xs font-semibold mb-1
            ${available === 0
              ? "text-gray-400 dark:text-slate-500"
              : "text-rose-500 dark:text-rose-400"}`}>
            {available === 0 ? "Not available" : `🔥 ${urgencyText}`}
          </p>
        )}

        {/* Price — giá thực tế */}
        {fmtPrice(loc) && (
          <p className="text-sm text-gray-900 dark:text-white">
            <span className="font-semibold">{fmtPrice(loc)}</span>
            {fmtPriceNote(loc) && (
              <span className="font-normal text-gray-500 dark:text-slate-400">
                {" "}· {fmtPriceNote(loc)}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionRow({ section, favorites, onFavToggle, user }) {
  const navigate = useNavigate();
  if (!section.locations?.length) return null;
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">
              {section.subtitle}
            </p>
          )}
        </div>
        {section.showViewAll && (
          <button onClick={() => navigate(`/explore/section/${section.key}`)}
            className="text-sm font-medium text-gray-900 dark:text-white
                       underline underline-offset-2 hover:text-gray-600 shrink-0">
            Explore more
          </button>
        )}
      </div>

      {/* Responsive grid — 2 / 3 / 4 cột */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
        {section.locations.map(loc => (
          <LocationCard key={loc._id} loc={loc}
            isFav={favorites?.includes(loc._id)}
            onFavToggle={user ? onFavToggle : null}/>
        ))}
      </div>
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div className="mb-10 animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded-full w-40"/>
        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded-full w-16"/>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i}>
            <div className="aspect-[4/3] bg-gray-200 dark:bg-slate-800 rounded-2xl mb-3"/>
            <div className="h-3.5 bg-gray-200 dark:bg-slate-800 rounded-full w-4/5 mb-2"/>
            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full w-1/2 mb-2"/>
            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full w-1/3"/>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuestBanner() {
  return (
    <div className="bg-blue-600 rounded-2xl px-6 py-5 mb-6 flex items-center justify-between gap-4">
      <div>
        <p className="font-bold text-white text-base">🗺️ Get personalized recommendations</p>
        <p className="text-blue-100 text-sm mt-0.5">Sign in to see locations tailored to your interests</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link to="/login" className="bg-white text-blue-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">Log in</Link>
        <Link to="/register" className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-800 transition-colors border border-blue-400">Sign up</Link>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { trackCategoryFilter, trackView } = useTracking();

  const [feed,      setFeed]     = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [favorites, setFavorites] = useState([]);

  const [activeCategory, setActiveCategory] = useState("");
  const [search,    setSearch]    = useState("");
  const [debouncedSearch, setDS]  = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSR]    = useState([]);
  const [searchLoading, setSL]    = useState(false);
  const timer = useRef(null);

  // Load feed
  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    api.get("/explore/feed", { headers })
      .then(r => setFeed(r.data.data.feed))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?._id]);

  // Load favorites
  useEffect(() => {
    if (!user) return;
    userAppService.getFavorites()
      .then(favs => setFavorites(favs.map(f => f._id)))
      .catch(() => {});
  }, [user?._id]);

  // Debounce search
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDS(search), 400);
    return () => clearTimeout(timer.current);
  }, [search]);

  // Search/filter
  useEffect(() => {
    if (!debouncedSearch && !activeCategory) {
      setSearchMode(false); setSR([]); return;
    }
    setSearchMode(true); setSL(true);
    const params = { status:"approved", limit:24 };
    if (debouncedSearch) params.search   = debouncedSearch;
    if (activeCategory)  params.category = activeCategory;
    api.get("/locations", { params })
      .then(r => setSR(r.data.data.locations))
      .catch(console.error)
      .finally(() => setSL(false));
  }, [debouncedSearch, activeCategory]);

  const handleFavToggle = async (locationId) => {
    if (!user) { navigate("/login"); return; }
    await userAppService.toggleFavorite(locationId);
    setFavorites(prev => prev.includes(locationId) ? prev.filter(id=>id!==locationId) : [...prev, locationId]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">

      {/* Promo modal — chỉ hiện cho guest sau 4 giây */}
      <PromoModal user={user} />

      <div className="max-w-6xl mx-auto px-5 py-5">
        {/* Hero Search — chỉ hiện trong feed mode */}
        {!searchMode && <HeroSearch mode="location" />} 
        
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {CATEGORIES.map(({ key, label, icon }) => (
            <button key={key} onClick={() => { const val = key === "all" ? "" : key; setActiveCategory(val); if (val) trackCategoryFilter(val); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
            border transition-all whitespace-nowrap
            ${(key === "all" ? activeCategory === "" : activeCategory === key)
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500"}`}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* SEARCH MODE */}
        {searchMode && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {searchLoading ? "Searching..." : `${searchResults.length} results`}
                {search && ` for "${search}"`}
              </p>
              <button onClick={() => { setSearch(""); setActiveCategory(""); }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Back to feed
              </button>
            </div>
            {searchLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200 dark:bg-slate-800 rounded-2xl mb-3"/>
                    <div className="h-3.5 bg-gray-200 dark:bg-slate-800 rounded-full w-4/5 mb-2"/>
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full w-1/2 mb-2"/>
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full w-1/3"/>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm">No results found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
                {searchResults.map(loc => (
                  <LocationCard key={loc._id} loc={loc}
                    isFav={favorites?.includes(loc._id)}
                    onFavToggle={user ? handleFavToggle : null}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEED MODE */}
        {!searchMode && (
          <div>
            {!user && <GuestBanner/>}
            {loading ? (
              <><SectionSkeleton/><SectionSkeleton/><SectionSkeleton/></>
            ) : feed.length === 0 ? (
              <div className="text-center py-20 text-gray-400 dark:text-slate-500">
                <p className="text-4xl mb-2">🌏</p>
                <p className="text-sm">No content available yet</p>
              </div>
            ) : (
              <>
                {/* ── Tour Products banner ── */}
                <div onClick={() => navigate("/tours/products")}
                  className="mb-6 cursor-pointer rounded-2xl overflow-hidden relative h-36
                             bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700
                             flex items-center px-6 gap-4 group
                             hover:from-blue-700 hover:to-indigo-800 transition-all">
                  <div className="text-5xl group-hover:scale-110 transition-transform">🗺️</div>
                  <div className="flex-1">
                    <p className="text-white font-black text-lg leading-tight">Travel Tours</p>
                    <p className="text-blue-200 text-sm mt-1">All-inclusive tours operated by trusted companies</p>
                    <span className="inline-block mt-2 bg-white/20 text-white text-xs
                                     font-semibold px-3 py-1 rounded-full">
                      Explore now
                    </span>
                  </div>
                  {/* Decorative circles */}
                  <div className="absolute right-4 top-2 w-20 h-20 rounded-full bg-white/5"/>
                  <div className="absolute right-10 bottom-2 w-12 h-12 rounded-full bg-white/5"/>
                </div>

                {feed.map(section => (
                  <SectionRow key={section.key} section={section}
                    favorites={favorites} onFavToggle={handleFavToggle} user={user}/>
                ))}

                {/* ── Nearby section ── */}
                <NearbySection favorites={favorites} onFavToggle={handleFavToggle} user={user}/>

                {/* ── Personalized recommendations (logged-in only) ── */}
                {user && (
                  <div className="mt-2 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">✨ For you</h2>
                    </div>
                    <RecommendationsSection />
                  </div>
                )}
              </>
              )}
          </div>
        )}
      </div>
    </div>
  );
}