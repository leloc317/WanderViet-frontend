import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";
import BookingModal from "../../components/modals/BookingModal";
import useTracking from "../../hooks/useTracking";
import useGeolocation, { haversineDistance, fmtDistance } from "../../hooks/useGeolocation";

// ─── Constants ────────────────────────────────────────────────────────────────
const CAT_LABEL = {
  hotel:"Hotels", restaurant:"Restaurants", sightseeing:"Sightseeing",
  cafe:"Cafes", entertainment:"Entertainment", tour:"Tours",
};
const CAT_ICON = {
  hotel:"🏨", restaurant:"🍽️", sightseeing:"🏛️",
  cafe:"☕", entertainment:"🎡", tour:"🗺️",
};
const PRICE_RANGES = [
  { key:"",       label:"Any price",           sub:""                    },
  { key:"free",   label:"Free",                sub:"₫0"                  },
  { key:"budget", label:"Budget",              sub:"Under ₫300k"         },
  { key:"mid",    label:"Mid-range",           sub:"₫300k – ₫1M"        },
  { key:"high",   label:"High-end",            sub:"₫1M – ₫3M"          },
  { key:"luxury", label:"Luxury",              sub:"Above ₫3M"           },
];
const SORT_OPTS = [
  { key:"recommended", label:"Recommended" },
  { key:"rating",      label:"Top Rated"   },
  { key:"popular",     label:"Most Popular"},
  { key:"newest",      label:"Newest"      },
  { key:"near_me",     label:"📍 Gần tôi"  },
];
const GROUP_TYPE_LABELS = {
  solo:"Solo traveller", couple:"Couple", friends_male:"Male group",
  friends_female:"Female group", friends_mixed:"Mixed group", family:"Family",
};

// ─── Location card ─────────────────────────────────────────────────────────────
const fmtPrice = (item, isLocation) => {
  if (!isLocation) return item.budget?.label || null;
  const min = item.priceRange?.min;
  if (min > 0) {
    if (min >= 1_000_000) return `₫${(min/1_000_000).toFixed(1).replace(".0","")}M`;
    return `₫${Math.round(min/1000)}k`;
  }
  if (item.priceRange?.label === "free") return "Free";
  return null;
};

function ResultCard({ item, category, onBook, userPosition, nights }) {
  const navigate = useNavigate();
  const { trackView, trackViewTour } = useTracking();
  const isLocation = category !== "tour";
  const img = isLocation
    ? (item.images?.find(i=>i.isPrimary)?.url || item.images?.[0]?.url)
    : (item.itinerary?.[0]?.stops?.[0]?.location?.images?.[0]?.url);

  // Distance
  let dist = null;
  if (userPosition && isLocation && item.coordinates?.coordinates) {
    const [lng, lat] = item.coordinates.coordinates;
    if (lat && lng) dist = fmtDistance(haversineDistance(userPosition.lat, userPosition.lng, lat, lng));
  }

  const handleClick = () => {
    if (isLocation) { navigate(`/locations/${item._id}`); trackView(item._id, item.category, item.priceRange?.label); }
    else            { navigate(`/tours/${item._id}`);     trackViewTour(item._id); }
  };

  const unitInfo   = item._unitInfo;
  const totalPrice = item._totalPrice;
  const itemNights = item._nights || nights;

  const fmtVND = (n) => {
    if (!n) return null;
    if (n >= 1_000_000) return `₫${(n/1_000_000).toFixed(1).replace(".0","")}M`;
    return `₫${Math.round(n/1000)}k`;
  };

  // Price display: prefer unit min price, fallback to priceRange.min
  const basePrice  = unitInfo?.minPrice || item.priceRange?.min || 0;
  const perNight   = fmtVND(basePrice);
  const total      = totalPrice ? fmtVND(totalPrice) : (basePrice && itemNights ? fmtVND(basePrice * itemNights) : null);
  const priceLabel = !basePrice && item.priceRange?.label !== "free"
    ? null
    : item.priceRange?.label === "free" ? "Free" : null;

  return (
    <div onClick={handleClick} className="cursor-pointer group">
      {/* Image */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 mb-3">
        {img
          ? <img src={img} alt={item.name||item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
              {CAT_ICON[category]||"📍"}
            </div>
        }
        {/* Badges */}
        {item.advertisement?.isActive && (
          <span className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[9px]
                           font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide">AD</span>
        )}
        {item._score > 0 && (
          <span className="absolute top-2.5 right-2.5 bg-blue-600/90 text-white text-[9px]
                           font-semibold px-2 py-0.5 rounded-full">
            {Math.round(item._score)}% match
          </span>
        )}
        {isLocation && item.verifiedBy?.length > 0 && (
          <span className="absolute bottom-2.5 left-2.5 bg-teal-600/90 text-white text-[9px]
                           font-semibold px-2 py-0.5 rounded-full">✅ Verified</span>
        )}
        {!isLocation && (
          <span className="absolute bottom-2.5 left-2.5 bg-black/60 text-white text-[9px]
                           font-medium px-2 py-0.5 rounded-full">
            {item.duration?.days}D {item.duration?.nights}N
          </span>
        )}
        {/* Slots urgency */}
        {item._slotsLeft !== undefined && item._slotsLeft <= 3 && item._slotsLeft > 0 && (
          <span className="absolute bottom-2.5 right-2.5 bg-red-500/90 text-white text-[9px]
                           font-semibold px-2 py-0.5 rounded-full">
            🔥 {item._slotsLeft} left
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-0.5">
        {/* Name + rating on same row */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate leading-snug">
            {item.name || item.title}
          </p>
          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-xs text-gray-900 dark:text-white font-medium">
              ★ {isLocation
                ? (item.rating?.finalScore?.toFixed(1)||"0.0")
                : (item.rating?.avg?.toFixed(1)||"0.0")}
            </span>
          </div>
        </div>

        {/* Location / distance */}
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1 truncate">
          {isLocation ? item.address?.city||"—" : item.category}
          {dist && <span className="text-blue-600 dark:text-blue-400"> · {dist}</span>}
        </p>

        {/* Tags */}
        {isLocation && item.tags?.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {item.tags.slice(0,2).map(t => (
              <span key={t._id||t}
                className="text-[10px] bg-gray-100 dark:bg-slate-800
                           text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {t.icon} {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Capacity badge (if guests filter active and unit info found) */}
        {unitInfo && (
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/15
                             text-emerald-700 dark:text-emerald-400
                             px-2 py-0.5 rounded-full font-medium">
              ✓ {unitInfo.availableCount} room{unitInfo.availableCount > 1 ? "s" : ""} for {unitInfo.maxCapacity}+ guests
            </span>
          </div>
        )}

        {/* Price row */}
        <div className="flex items-end justify-between">
          <div>
            {isLocation && (perNight || priceLabel) ? (
              <>
                {/* Per-night price */}
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-semibold">{perNight || priceLabel}</span>
                  {perNight && (
                    <span className="font-normal text-gray-500 dark:text-slate-400 text-xs">
                      {" "}· {item.category === "hotel" ? "night" : "person"}
                    </span>
                  )}
                </p>
                {/* Total price if nights known */}
                {total && itemNights && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                    <span className="text-gray-900 dark:text-white font-semibold">{total}</span>
                    {" "}total · {itemNights} night{itemNights > 1 ? "s" : ""}
                  </p>
                )}
              </>
            ) : !isLocation && item.budget?.label ? (
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.budget.label}
              </p>
            ) : null}
          </div>

          {isLocation && item.booking?.isBookable && (
            <button
              onClick={e => { e.stopPropagation(); onBook(item); }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400
                         hover:text-blue-700 dark:hover:text-blue-300 transition-colors shrink-0">
              Book →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SearchResultsPage() {
  const { category }              = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user }                  = useAuth();
  const navigate                  = useNavigate();
  const { trackPriceFilter, trackCategoryFilter, trackView } = useTracking();
  const { position, loading: geoLoading, request: requestGeo } = useGeolocation();

  const [results,     setResults]     = useState([]);
  const [nights,      setNights]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [groupProfile, setGroupProfile] = useState(null);
  const [bookTarget,  setBookTarget]  = useState(null);

  // Filter state
  const [priceLabel,  setPriceLabel]  = useState(searchParams.get("priceLabel") || "");
  const [atVerified,  setAtVerified]  = useState(false);
  const [isBookable,  setIsBookable]  = useState(false);
  const [minRating,   setMinRating]   = useState("");   // "", "3", "4", "4.5"
  const [openNow,     setOpenNow]     = useState(false);
  const [sortBy,      setSortBy]      = useState("recommended");

  // Pre-filled guests from search params
  const guestsFromSearch = {
    adults:   parseInt(searchParams.get("adults"))   || 1,
    children: parseInt(searchParams.get("children")) || 0,
    male:     parseInt(searchParams.get("male"))     || 0,
    female:   parseInt(searchParams.get("female"))   || 0,
    avgAge:   parseFloat(searchParams.get("avgAge")) || 0,
  };

  const fetchResults = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = {
        ...Object.fromEntries(searchParams),
        page: p, limit: 12,
        priceLabel, atVerified: atVerified ? "true" : undefined,
        minRating:  minRating  || undefined,
        openNow:    openNow    ? "true"    : undefined,
        isBookable: isBookable ? "true" : undefined,
        // near_me is client-side sort, send recommended to backend
        sortBy: sortBy === "near_me" ? "recommended" : sortBy,
      };
      const { data } = await api.get(`/search/${category}`, { params, headers });
      let items = data.data.results;

      // Client-side distance sort when user position available
      if (sortBy === "near_me" && position) {
        items = [...items].sort((a, b) => {
          const [aLng, aLat] = a.coordinates?.coordinates ?? [0, 0];
          const [bLng, bLat] = b.coordinates?.coordinates ?? [0, 0];
          if (!aLat && !bLat) return 0;
          if (!aLat) return 1;
          if (!bLat) return -1;
          return haversineDistance(position.lat, position.lng, aLat, aLng)
               - haversineDistance(position.lat, position.lng, bLat, bLng);
        });
      }

      setResults(items);
      setTotal(data.data.total);
      setTotalPages(data.data.pagination.totalPages);
      setGroupProfile(data.data.groupProfile);
      setNights(data.data.nights || null);
      setPage(p);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [category, searchParams, priceLabel, atVerified, isBookable, minRating, openNow, sortBy, position]);

  useEffect(() => { fetchResults(1); }, [category, priceLabel, atVerified, isBookable, minRating, openNow, sortBy]);

  // When near_me selected and no position yet → request geolocation
  useEffect(() => {
    if (sortBy === "near_me" && !position && !geoLoading) requestGeo();
  }, [sortBy]);

  // Re-sort when position arrives
  useEffect(() => {
    if (sortBy === "near_me" && position) fetchResults(1);
  }, [position]);

  const city     = searchParams.get("city") || "";
  const checkin  = searchParams.get("checkin") || "";
  const checkout = searchParams.get("checkout") || "";
  const date     = searchParams.get("date") || checkin || "";
  const isLoggedIn = !!user;

  // Format date nicely
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">

      <div className="max-w-7xl mx-auto px-5 py-6 flex gap-6">
        {/* ── SIDEBAR FILTERS ── */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                          rounded-2xl p-4 sticky top-20 space-y-5">
            <p className="font-bold text-gray-900 dark:text-white text-sm">Filters</p>

            {/* Price */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Price</p>
              <div className="space-y-1.5">
                {PRICE_RANGES.map(({ key, label, sub }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group/price">
                    <input type="radio" name="price" value={key} checked={priceLabel === key}
                      onChange={() => setPriceLabel(key)}
                      className="accent-blue-600 w-3.5 h-3.5 shrink-0"/>
                    <span className="flex-1 min-w-0">
                      <span className={`text-sm block ${priceLabel === key ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300"}`}>
                        {label}
                      </span>
                      {sub && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">{sub}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* AT Verified */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={atVerified} onChange={e => setAtVerified(e.target.checked)}
                className="w-4 h-4 accent-teal-600"/>
              <span className="text-sm text-gray-700 dark:text-slate-300">✅ AT Verified only</span>
            </label>

            {/* Bookable */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBookable} onChange={e => setIsBookable(e.target.checked)}
                className="w-4 h-4 accent-blue-600"/>
              <span className="text-sm text-gray-700 dark:text-slate-300">📅 Bookable only</span>
            </label>

            {/* Open now */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={openNow} onChange={e => setOpenNow(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"/>
              <span className="text-sm text-gray-700 dark:text-slate-300">🟢 Open now</span>
            </label>

            {/* Min rating */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Min Rating
              </p>
              <div className="space-y-1">
                {[
                  { key:"",    label:"Any rating" },
                  { key:"3",   label:"3+ ★★★" },
                  { key:"4",   label:"4+ ★★★★" },
                  { key:"4.5", label:"4.5+ ★★★★½" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="rating" value={key} checked={minRating === key}
                      onChange={() => setMinRating(key)}
                      className="accent-amber-500 w-3.5 h-3.5"/>
                    <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset filters */}
            {(priceLabel || atVerified || isBookable || openNow || minRating) && (
              <button
                onClick={() => { setPriceLabel(""); setAtVerified(false); setIsBookable(false); setOpenNow(false); setMinRating(""); }}
                className="w-full text-xs text-red-500 dark:text-red-400 hover:underline text-left">
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* ── RESULTS ── */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {CAT_ICON[category]} {CAT_LABEL[category] || category}
                {city && ` in ${city}`}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {loading ? "Searching..." : `${total} result${total !== 1 ? "s" : ""}`}
                {nights && (
                  <span className="ml-2 text-gray-700 dark:text-slate-300 font-medium">
                    · {nights} night{nights > 1 ? "s" : ""}
                  </span>
                )}
                {guestsFromSearch.adults + guestsFromSearch.children > 0 && (
                  <span className="ml-2 text-gray-700 dark:text-slate-300">
                    · {guestsFromSearch.adults + guestsFromSearch.children} guest{guestsFromSearch.adults + guestsFromSearch.children > 1 ? "s" : ""}
                  </span>
                )}
                {groupProfile && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    · Sorted for {GROUP_TYPE_LABELS[groupProfile.groupType]}
                    {isLoggedIn && " + your interests"}
                  </span>
                )}
              </p>

              {/* Active search context chips */}
              {(checkin || guestsFromSearch.adults + guestsFromSearch.children > 1) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {checkin && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-500/15
                                     text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
                      📅 {fmtDate(checkin)}{checkout ? ` → ${fmtDate(checkout)}` : ""}
                      {nights ? ` · ${nights}N` : ""}
                    </span>
                  )}
                  {guestsFromSearch.adults + guestsFromSearch.children > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-500/15
                                     text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
                      👥 {guestsFromSearch.adults} adult{guestsFromSearch.adults > 1 ? "s" : ""}
                      {guestsFromSearch.children > 0 ? ` · ${guestsFromSearch.children} child${guestsFromSearch.children > 1 ? "ren" : ""}` : ""}
                    </span>
                  )}
                  {nights && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 px-2.5 py-1
                                     bg-emerald-50 dark:bg-emerald-500/15 rounded-full font-medium">
                      ✓ Filtered by capacity & availability
                    </span>
                  )}
                </div>
              )}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                         text-gray-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm
                         focus:outline-none">
              {SORT_OPTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({length:6}).map((_,i) => (
                <div key={i} className="h-72 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-2">{CAT_ICON[category]}</p>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">No results found</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Try adjusting your filters or search a different city
              </p>
              <Link to="/explore" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                ← Back to Explore
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(item => (
                  <ResultCard
                    key={item._id}
                    item={item}
                    category={category}
                    onBook={setBookTarget}
                    userPosition={position}
                    nights={nights}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button onClick={() => fetchResults(page-1)} disabled={page<=1}
                    className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                               dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40">
                    ← Prev
                  </button>
                  <span className="self-center text-sm text-gray-500 dark:text-slate-400">{page}/{totalPages}</span>
                  <button onClick={() => fetchResults(page+1)} disabled={page>=totalPages}
                    className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                               dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40">
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* BookingModal pre-filled with search params */}
      {bookTarget && (
        <BookingModal
          open={!!bookTarget}
          location={bookTarget}
          prefillGuests={guestsFromSearch}
          onClose={() => setBookTarget(null)}
        />
      )}
    </div>
  );
}