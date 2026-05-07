// ── LocationSearchModal ───────────────────────────────────────────────────────
// Drop-in replacement for the LocationSearchModal in TripPlannerPage.jsx
// Changes:
//   1. Fetch suggested (top-rated) locations on open — no empty state
//   2. Category filter pills to browse by type
//   3. Fix search endpoint: try /search/locations first, fallback to /locations
//   4. Debounced search with proper loading state

import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../lib/axios";
import {
  Globe, UtensilsCrossed, Hotel, Landmark,
  Coffee, Sparkles, ShoppingBag,
} from "lucide-react";

const CAT_ICON = [
  { key: "",              label: "All",           icon: <Globe size={14} strokeWidth={1.5}/> },
  { key: "restaurant",    label: "Restaurants",   icon: <UtensilsCrossed size={14} strokeWidth={1.5}/> },
  { key: "hotel",         label: "Hotels",        icon: <Hotel size={14} strokeWidth={1.5}/> },
  { key: "tourist_spot",  label: "Sights",        icon: <Landmark size={14} strokeWidth={1.5}/> },
  { key: "cafe",          label: "Cafes",         icon: <Coffee size={14} strokeWidth={1.5}/> },
  { key: "entertainment", label: "Fun",           icon: <Sparkles size={14} strokeWidth={1.5}/> },
  { key: "shopping",      label: "Shopping",      icon: <ShoppingBag size={14} strokeWidth={1.5}/> },
];

const getCatIcon = (category) => {
  const match = CAT_ICON.find(c => c.key === category);
  return match ? match.icon : <Globe size={14} strokeWidth={1.5}/>;
};

function LocationItem({ loc, onAdd }) {
  const img     = loc.images?.find(i => i.isPrimary)?.url ?? loc.images?.[0]?.url;
  const rating  = loc.rating?.finalScore ?? loc.rating?.userScore ?? 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(loc)}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl
                 hover:bg-blue-50 dark:hover:bg-blue-500/10
                 transition-colors text-left group"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0 relative">
        {img
          ? <img src={img} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
              {getCatIcon(loc.category)}
            </div>
        }
        {loc.booking?.isBookable && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-tl-md
                          flex items-center justify-center">
            <span className="text-[7px] text-white font-black">B</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-snug">
          {loc.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-slate-500 capitalize">
            {loc.category?.replace("_", " ")}
          </span>
          {loc.address?.city && (
            <>
              <span className="text-gray-200 dark:text-slate-700">·</span>
              <span className="text-xs text-gray-400 dark:text-slate-500">{loc.address.city}</span>
            </>
          )}
          {rating > 0 && (
            <>
              <span className="text-gray-200 dark:text-slate-700">·</span>
              <span className="text-xs text-amber-500 font-medium">★ {rating.toFixed(1)}</span>
            </>
          )}
        </div>
      </div>

      {/* Add indicator */}
      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20
                      flex items-center justify-center shrink-0
                      opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">+</span>
      </div>
    </button>
  );
}

export default function LocationSearchModal({ day, onAdd, onClose }) {
  const [q,           setQ]           = useState("");
  const [activeCat,   setActiveCat]   = useState("");
  const [results,     setResults]     = useState([]);
  const [suggested,   setSuggested]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(true);
  const timer = useRef(null);

  // ── Fetch suggested locations on mount & when category changes ──────────
  const fetchSuggested = useCallback(async (cat = "") => {
    setSugLoading(true);
    try {
      const params = { limit: 12, sortBy: "rating.finalScore", sortOrder: "desc", status: "approved" };
      if (cat) params.category = cat;
      const { data } = await api.get("/locations", { params });
      setSuggested(data.data?.locations ?? data.data ?? []);
    } catch {
      // fallback: try explore endpoint
      try {
        const { data } = await api.get("/explore", { params: { limit: 12 } });
        setSuggested(data.data?.locations ?? []);
      } catch { setSuggested([]); }
    } finally { setSugLoading(false); }
  }, []);

  useEffect(() => {
    fetchSuggested(activeCat);
  }, [activeCat, fetchSuggested]);

  // ── Debounced search ────────────────────────────────────────────────────
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Try search endpoint first, fallback to locations with text search
        let locations = [];
        try {
          const { data } = await api.get("/search/locations", { params: { q, limit: 15 } });
          locations = data.data?.locations ?? data.data ?? [];
        } catch {
          const { data } = await api.get("/locations", {
            params: { search: q, limit: 15, status: "approved" },
          });
          locations = data.data?.locations ?? data.data ?? [];
        }
        setResults(locations);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q]);

  const displayList   = q.trim() ? results : suggested;
  const isSearchMode  = q.trim().length > 0;
  const isEmpty       = !loading && !sugLoading && displayList.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center
                    p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-md
                   rounded-t-3xl sm:rounded-2xl max-h-[88vh] flex flex-col
                   border dark:border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 shrink-0">
          {/* Drag handle (mobile) */}
          <div className="w-10 h-1 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden"/>

          <div className="flex items-center gap-2.5">
            {/* Search input */}
            <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-slate-800
                            rounded-xl px-3.5 py-2.5 border border-transparent
                            focus-within:border-blue-400 dark:focus-within:border-blue-500
                            transition-colors">
              <span className="text-gray-400 dark:text-slate-500 shrink-0">
                {loading
                  ? <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
                    </svg>
                }
              </span>
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search locations, hotels, restaurants..."
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white
                           placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none"
              />
              {q && (
                <button onClick={() => setQ("")}
                  className="text-gray-300 dark:text-slate-600 hover:text-gray-500 text-base leading-none">
                  ×
                </button>
              )}
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl
                         text-gray-400 hover:text-gray-700 dark:hover:text-white
                         hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              ×
            </button>
          </div>

          {/* Add to day label */}
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 px-1">
            Adding to <span className="font-semibold text-gray-600 dark:text-slate-300">Day {day}</span>
          </p>
        </div>

        {/* ── Category pills (only in browse mode) ── */}
        {!isSearchMode && (
          <div className="px-4 pb-3 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {CAT_ICON.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveCat(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                              whitespace-nowrap shrink-0 border transition-all
                              ${activeCat === key
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-blue-300"
                              }`}
                >
                  <span className="opacity-80">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="border-t border-gray-100 dark:border-slate-800 shrink-0"/>

        {/* ── Section label ── */}
        <div className="px-4 py-2.5 shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
            {isSearchMode
              ? loading ? "Searching..." : `${results.length} result${results.length !== 1 ? "s" : ""}`
              : sugLoading ? "Loading suggestions..." : "Suggested locations"}
          </p>
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Loading skeleton */}
          {(sugLoading && !isSearchMode) && (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-slate-800 shrink-0"/>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 dark:bg-slate-800 rounded w-2/3"/>
                    <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/3"/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty search result */}
          {isSearchMode && !loading && results.length === 0 && (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm font-medium">No locations found</p>
              <p className="text-xs mt-1">Try a different name or browse by category</p>
            </div>
          )}

          {/* Empty suggested */}
          {!isSearchMode && !sugLoading && suggested.length === 0 && (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">📍</p>
              <p className="text-sm">No locations available</p>
            </div>
          )}

          {/* Results */}
          {!sugLoading && displayList.map(loc => (
            <LocationItem key={loc._id} loc={loc} onAdd={(l) => { onAdd(l); }} />
          ))}
        </div>
      </div>
    </div>
  );
}