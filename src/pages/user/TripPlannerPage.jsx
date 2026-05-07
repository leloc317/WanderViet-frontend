import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import tripService from "../../services/trip.service";
import BundleBookingFlow from "../../components/BundleBookingFlow";
import BookingModal from "../../components/modals/BookingModal";
import api from "../../lib/axios";
import MapView from "../../components/ui/MapView";
import LocationSearchModal from "../../components/modals/LocationSearchModal";

import {
  Globe, UtensilsCrossed, Hotel, Landmark,
  Coffee, Sparkles, ShoppingBag
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const CAT_ICON = [
  { key: "all",           label: "All",          icon: <Globe size={15} strokeWidth={1.5}/> },
  { key: "restaurant",    label: "Restaurants",  icon: <UtensilsCrossed size={15} strokeWidth={1.5}/> },
  { key: "hotel",         label: "Hotels",       icon: <Hotel size={15} strokeWidth={1.5}/> },
  { key: "tourist_spot",  label: "Sights",       icon: <Landmark size={15} strokeWidth={1.5}/> },
  { key: "cafe",          label: "Cafes",        icon: <Coffee size={15} strokeWidth={1.5}/> },
  { key: "entertainment", label: "Entertainment",icon: <Sparkles size={15} strokeWidth={1.5}/> },
  { key: "shopping",      label: "Shopping",     icon: <ShoppingBag size={15} strokeWidth={1.5}/> },
];
const TRANSPORT_LABEL = {
  walk:"🚶 Walk", motorbike:"🏍️ Motorbike", car:"🚗 Car",
  taxi:"🚕 Taxi", bus:"🚌 Bus", other:"🚌 Other",
};
const fmtBudget = (n) => {
  if (!n || n === 0) return "Free";
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M₫`;
  return `${Math.round(n/1000)}k₫`;
};
const TRANSPORT_TIME = { walk: 15, motorbike: 10, car: 10, taxi: 10, bus: 20, other: 15 };

// ── StopCard (image 3 style) ──────────────────────────────────────────────────
function StopCard({ stop, isLast, onDelete, onBook, onMoveUp, onMoveDown, index }) {
  const loc = stop.location;
  const img = loc?.images?.find(i => i.isPrimary)?.url ?? loc?.images?.[0]?.url;
  const avg = loc?.priceRange?.max
    ? (loc.priceRange.min + loc.priceRange.max) / 2
    : 0;
  const rating = loc?.rating?.finalScore ?? loc?.rating?.userScore ?? 0;

  return (
    <div className="relative group">
      {/* Timeline dot */}
      <div className="absolute left-0 top-5 flex flex-col items-center" style={{width: 16}}>
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900 shrink-0 z-10"/>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-700 mt-1" style={{minHeight: 32}}/>}
      </div>

      {/* Card */}
      <div className="ml-6 mb-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800
                        hover:border-blue-200 dark:hover:border-blue-500/30
                        hover:shadow-sm transition-all overflow-hidden">
          <div className="flex gap-3 p-3.5">
            {/* Image */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
              {img
                ? <img src={img} alt="" className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center text-2xl opacity-60">
                    {CAT_ICON.find(c => c.key === loc?.category)?.icon || "📍"}
                  </div>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {loc?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {loc?.address?.city ?? ""}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <button onClick={onMoveUp}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700
                                 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-xs">
                      ↑
                    </button>
                  )}
                  {!isLast && (
                    <button onClick={onMoveDown}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700
                                 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-xs">
                      ↓
                    </button>
                  )}
                  <button onClick={onDelete}
                    className="w-6 h-6 flex items-center justify-center text-gray-300 dark:text-slate-600
                               hover:text-red-500 dark:hover:text-red-400 rounded
                               hover:bg-red-50 dark:hover:bg-red-500/10 text-sm">
                    ×
                  </button>
                </div>
              </div>

              {/* Note */}
              {stop.note && (
                <p className="text-xs text-gray-500 dark:text-slate-400 italic mt-0.5 line-clamp-1">
                  {stop.note}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                {stop.startTime && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    🕐 {stop.startTime}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {fmtBudget(avg)}
                </span>
                {stop.duration > 0 && (
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {stop.duration >= 60 ? `${Math.floor(stop.duration/60)}h${stop.duration%60 > 0 ? ` ${stop.duration%60}m` : ""}` : `${stop.duration}m`}
                  </span>
                )}
                {rating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-500 dark:text-amber-400 font-medium">
                    ★ {rating.toFixed(1)}
                  </span>
                )}
                {loc?.booking?.isBookable && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20
                                   text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                    Bookable
                  </span>
                )}
              </div>
            </div>

            {/* Book button */}
            {loc?.booking?.isBookable && onBook && (
              <button
                onClick={() => onBook(loc)}
                className="self-center flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-700
                           text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
              >
                Book
              </button>
            )}
          </div>
        </div>

        {/* Transport divider */}
        {!isLast && stop.transportTo && stop.transportTo !== "other" && (
          <div className="flex items-center gap-2 ml-2 my-1.5">
            <span className="text-[11px] text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800
                             border border-dashed border-gray-200 dark:border-slate-700
                             rounded-full px-2.5 py-0.5">
              {TRANSPORT_LABEL.find(t => t.key === stop.transportTo)?.label || "🚌"} · ~{TRANSPORT_TIME[stop.transportTo] ?? 15} mins
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TripPlannerPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tour,       setTour]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [addDay,     setAddDay]     = useState(null);
  const [bookTarget, setBookTarget] = useState(null);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [editTitle,  setEditTitle]  = useState(false);
  const [titleVal,   setTitleVal]   = useState("");
  const [activeDay,  setActiveDay]  = useState(1);
  const [toast,      setToast]      = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    try {
      const { tour: t } = await tripService.getTripById(id);
      setTour(t);
      setTitleVal(t.title);
      setActiveDay(t.itinerary?.[0]?.day ?? 1);
    } catch { navigate("/trips"); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);


  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddStop = async (day, location) => {
    setAddDay(null); setSaving(true);
    try {
      const updated = await tripService.addStop(id, day, { locationId: location._id, duration: 60, transportTo: "other" });
      setTour(updated);
      showToast(`✅ Đã thêm ${location.name}`);
    } catch (e) { showToast(`❌ ${e.response?.data?.message ?? "Lỗi"}`); }
    finally { setSaving(false); }
  };

  const handleDeleteStop = async (day, stopId) => {
    setSaving(true);
    try {
      const updated = await tripService.deleteStop(id, day, stopId);
      setTour(updated);
      // If the active day no longer exists, switch to first available
      if (!updated.itinerary?.find(d => d.day === activeDay)) {
        setActiveDay(updated.itinerary?.[0]?.day ?? 1);
      }
    } catch (e) { showToast(`❌ ${e.response?.data?.message ?? "Lỗi"}`); }
    finally { setSaving(false); }
  };

  const handleMoveStop = async (day, fromIdx, toIdx) => {
    const dayEntry = tour.itinerary.find(d => d.day === day);
    if (!dayEntry) return;
    const stops = [...dayEntry.stops];
    if (toIdx < 0 || toIdx >= stops.length) return;
    const [moved] = stops.splice(fromIdx, 1);
    stops.splice(toIdx, 0, moved);
    setTour(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(d =>
        d.day === day ? { ...d, stops: stops.map((s, i) => ({ ...s, order: i })) } : d
      ),
    }));
    try { await tripService.reorderStops(id, day, stops.map((s, i) => ({ _id: s._id, order: i }))); }
    catch { load(); }
  };

  const handleAddDay = async () => {
    const maxDay = tour.itinerary?.reduce((m, d) => Math.max(m, d.day), 0) ?? 0;
    const newDay = maxDay + 1;
    setSaving(true);
    try {
      await tripService.updateMeta(id, { duration: { days: newDay, nights: Math.max(0, newDay - 1) } });
      setTour(prev => ({
        ...prev,
        itinerary: [...(prev.itinerary ?? []), { day: newDay, title: `Ngày ${newDay}`, stops: [] }],
        duration: { days: newDay, nights: Math.max(0, newDay - 1) },
      }));
      setActiveDay(newDay);
      showToast(`Đã thêm Ngày ${newDay}`);
    } catch { showToast("Lỗi thêm ngày"); }
    finally { setSaving(false); }
  };

  const handleSaveTitle = async () => {
    if (!titleVal.trim()) return;
    setEditTitle(false);
    try {
      const updated = await tripService.updateMeta(id, { title: titleVal.trim() });
      setTour(prev => ({ ...prev, title: updated.title }));
    } catch { load(); }
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const sortedItinerary = [...(tour?.itinerary ?? [])].sort((a, b) => a.day - b.day);
  const allStops        = sortedItinerary.flatMap(d => d.stops ?? []);
  const bookableCount   = allStops.filter(s => s.location?.booking?.isBookable).length;
  const hasBookable     = bookableCount > 0;

  // Auto-open bundle booking if navigated from MyTripsPage with ?book=1
  useEffect(() => {
    if (tour && searchParams.get("book") === "1" && hasBookable) {
      setBundleOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [tour, searchParams, hasBookable]);
  const totalBudget     = allStops.reduce((t, s) => {
    const loc = s.location;
    return t + (loc?.priceRange?.max ? (loc.priceRange.min + loc.priceRange.max) / 2 : 0);
  }, 0);

  const activeDayEntry = sortedItinerary.find(d => d.day === activeDay);
  const activeStops    = activeDayEntry?.stops ?? [];

  // Destination: first stop's city
  const destination = allStops[0]?.location?.address?.city ?? "—";

  // Map URL (first stop with coordinates)
  const firstCoord = allStops.find(s => s.location?.coordinates?.coordinates)
    ?.location?.coordinates?.coordinates;
  const [mapLng, mapLat] = firstCoord ?? [105.8412, 21.0245];
  // MapView markers — active day stops with coordinates
  const mapMarkers = activeStops
    .filter(s => s.location?.coordinates?.coordinates)
    .map((s, i) => {
      const [lng, lat] = s.location.coordinates.coordinates;
      return {
        lat, lng,
        label:       String(i + 1),
        title:       s.location.name,
        description: s.location.address?.city,
        img:         s.location.images?.find(img => img.isPrimary)?.url ?? s.location.images?.[0]?.url,
      };
    });

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
    </div>
  );
  if (!tour) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">

      {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-4">
          <div className="flex-1"/>
          {/* Editable title */}
          <div className="hidden md:flex items-center gap-2">
            {editTitle ? (
              <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
                onBlur={handleSaveTitle} onKeyDown={e => e.key === "Enter" && handleSaveTitle()}
                className="font-semibold text-gray-900 dark:text-white bg-transparent border-b
                           border-blue-500 outline-none text-sm min-w-0"
                style={{width: Math.max(150, titleVal.length * 8)}}
              />
            ) : (
              <button onClick={() => setEditTitle(true)}
                className="font-semibold text-gray-900 dark:text-white text-sm hover:text-blue-600
                           dark:hover:text-blue-400 transition-colors truncate max-w-xs">
                {tour.title}
              </button>
            )}
            {saving && <span className="text-xs text-gray-400 dark:text-slate-500">đang lưu...</span>}
          </div>

          <div className="flex-1 hidden md:block"/>

        </div>
      </nav>

      {/* ── BODY: 3 columns ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-5 flex gap-5">

        {/* ══ LEFT SIDEBAR ══ */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                          rounded-2xl p-4 sticky top-20 space-y-5">

            {/* Trip title (mobile edit) */}
            <div>
              {editTitle ? (
                <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
                  onBlur={handleSaveTitle} onKeyDown={e => e.key === "Enter" && handleSaveTitle()}
                  className="w-full font-bold text-gray-900 dark:text-white bg-transparent
                             border-b border-blue-500 outline-none text-sm"
                />
              ) : (
                <button onClick={() => setEditTitle(true)}
                  className="font-bold text-gray-900 dark:text-white text-sm text-left w-full
                             hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug">
                  {tour.title}
                </button>
              )}
            </div>

            <hr className="border-gray-100 dark:border-slate-800"/>

            {/* Destination */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Destination
              </p>
              <div className="flex items-center gap-2">
                <span className="text-red-500">📍</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{destination}</span>
              </div>
            </div>

            {/* Duration */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Duration
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-black text-gray-900 dark:text-white">
                    {tour.duration?.days ?? sortedItinerary.length}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500">Days</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-black text-gray-900 dark:text-white">
                    {tour.duration?.nights ?? Math.max(0, sortedItinerary.length - 1)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500">Nights</p>
                </div>
              </div>
            </div>

            {/* Budget */}
            {totalBudget > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Budget Est.
                </p>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-blue-500 rounded-full" style={{width: "65%"}}/>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">~{fmtBudget(totalBudget)}</p>
              </div>
            )}

            <hr className="border-gray-100 dark:border-slate-800"/>

            {/* Nav items */}
            <div className="space-y-0.5">
              {[
                { icon: "📋", label: "Detailed Itinerary", active: true },
                { icon: "💰", label: "Expense Breakdown",  active: false },
                { icon: "🗺️", label: "Interactive Map",     active: false },
              ].map(item => (
                <button key={item.label}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left
                    ${item.active
                      ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold"
                      : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ══ CENTER: ITINERARY ══ */}
        <main className="flex-1 min-w-0">

          {/* Mobile title */}
          <div className="lg:hidden mb-4">
            {editTitle ? (
              <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
                onBlur={handleSaveTitle} onKeyDown={e => e.key === "Enter" && handleSaveTitle()}
                className="w-full font-bold text-gray-900 dark:text-white bg-transparent
                           border-b border-blue-500 outline-none text-base"
              />
            ) : (
              <button onClick={() => setEditTitle(true)}
                className="font-bold text-gray-900 dark:text-white text-base hover:text-blue-600
                           dark:hover:text-blue-400 transition-colors text-left w-full">
                {tour.title}
              </button>
            )}
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {allStops.length} địa điểm · {tour.duration?.days ?? sortedItinerary.length} ngày
            </p>
          </div>

          {sortedItinerary.length === 0 ? (
            /* Empty state */
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                            rounded-2xl text-center py-16 px-8">
              <p className="text-5xl mb-4">🗺️</p>
              <p className="font-bold text-gray-900 dark:text-white mb-2">Trip của bạn đang trống</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Thêm ngày đầu tiên để bắt đầu lên kế hoạch
              </p>
              <button onClick={handleAddDay} disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                           text-sm rounded-xl transition-colors disabled:opacity-50">
                + Thêm ngày đầu tiên
              </button>
            </div>
          ) : (
            <>
              {/* Day tabs */}
              <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
                {sortedItinerary.map(d => (
                  <button key={d.day} onClick={() => setActiveDay(d.day)}
                    className={`w-9 h-9 rounded-full text-sm font-bold shrink-0 transition-all border-2
                      ${activeDay === d.day
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600"
                      }`}>
                    {d.day}
                  </button>
                ))}
                <button onClick={() => setActiveDay(prev => Math.min(sortedItinerary[sortedItinerary.length-1]?.day ?? 1, prev + 1))}
                  disabled={activeDay >= (sortedItinerary[sortedItinerary.length-1]?.day ?? 1)}
                  className="w-9 h-9 rounded-full border-2 border-gray-200 dark:border-slate-700 text-gray-400
                             disabled:opacity-30 text-sm hover:border-gray-300 transition-colors shrink-0">
                </button>
              </div>

              {/* Day header */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                              rounded-2xl px-5 py-4 mb-4">
                <p className="font-bold text-gray-900 dark:text-white">
                  Day {activeDay} Itinerary
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  {activeDayEntry?.title ?? `Ngày ${activeDay}`}
                  {" · "}
                  <span className="text-blue-600 dark:text-blue-400">{activeStops.length} địa điểm</span>
                </p>
              </div>

              {/* Stops */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                              rounded-2xl px-5 py-5">
                {activeStops.length === 0 ? (
                  <button onClick={() => setAddDay(activeDay)}
                    className="w-full py-8 border-2 border-dashed border-gray-200 dark:border-slate-700
                               rounded-2xl text-sm text-gray-400 dark:text-slate-500
                               hover:border-blue-300 dark:hover:border-blue-600
                               hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                    + Thêm địa điểm vào ngày {activeDay}
                  </button>
                ) : (
                  <div>
                    {activeStops.map((stop, i) => (
                      <StopCard
                        key={stop._id ?? i}
                        stop={stop}
                        index={i}
                        isLast={i === activeStops.length - 1}
                        onDelete={() => handleDeleteStop(activeDay, stop._id)}
                        onBook={setBookTarget}
                        onMoveUp={() => handleMoveStop(activeDay, i, i - 1)}
                        onMoveDown={() => handleMoveStop(activeDay, i, i + 1)}
                      />
                    ))}

                    {/* Add stop button */}
                    <button onClick={() => setAddDay(activeDay)}
                      className="w-full mt-2 py-3 border-2 border-dashed border-gray-200 dark:border-slate-700
                                 rounded-2xl text-sm text-gray-400 dark:text-slate-500
                                 hover:border-blue-300 dark:hover:border-blue-600
                                 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                      + Thêm địa điểm
                    </button>
                  </div>
                )}
              </div>

              {/* Add day */}
              <button onClick={handleAddDay} disabled={saving}
                className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-700
                           rounded-2xl text-sm text-gray-400 dark:text-slate-500
                           hover:border-blue-300 dark:hover:border-blue-600
                           hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-40">
                + Thêm ngày {sortedItinerary.length + 1}
              </button>

              {/* Bundle booking CTA (mobile) */}
              {hasBookable && (
                <div className="lg:hidden mt-4 p-4 bg-emerald-50 dark:bg-emerald-500/10
                                border border-emerald-200 dark:border-emerald-500/20 rounded-2xl
                                flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      🗓️ Bundle Booking
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Đặt {bookableCount} địa điểm trong 1 lần
                    </p>
                  </div>
                  <button onClick={() => setBundleOpen(true)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white
                               text-xs font-bold rounded-xl transition-colors shrink-0 ml-3">
                    Bắt đầu →
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* ══ RIGHT SIDEBAR: Trip Overview ══ */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="space-y-3 sticky top-20">

            {/* Map */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="h-48">
                <MapView
                  center={mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : { lat: mapLat, lng: mapLng }}
                  markers={mapMarkers}
                  height="100%"
                  zoom={13}
                  showUserBtn={true}
                />
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {mapMarkers.length} điểm hôm nay
                </span>
                <a href={`https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLng}&zoom=13`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  🗺️ Mở full map
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Trip Overview</p>

              {totalBudget > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                    <span>💰</span> <span>Estimated Budget</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {fmtBudget(totalBudget)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <span>📍</span> <span>Total Stops</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{allStops.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <span>📅</span> <span>Duration</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {tour.duration?.days ?? sortedItinerary.length}D {tour.duration?.nights ?? Math.max(0, sortedItinerary.length - 1)}N
                </span>
              </div>

              {hasBookable && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <span>🗓️</span> <span>Bookable</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{bookableCount}</span>
                </div>
              )}
            </div>

            {/* Today's stops */}
            {activeStops.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Stops Today (Day {activeDay})
                </p>
                <div className="space-y-2.5">
                  {activeStops.slice(0, 5).map((stop, i) => {
                    const loc = stop.location;
                    const img = loc?.images?.find(im => im.isPrimary)?.url ?? loc?.images?.[0]?.url;
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                          {img
                            ? <img src={img} alt="" className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center text-sm">
                                {CAT_ICON[loc?.category] ?? "📍"}
                              </div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {loc?.name ?? "Unknown"}
                          </p>
                          {stop.startTime && (
                            <p className="text-[10px] text-gray-400 dark:text-slate-500">{stop.startTime}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeStops.length > 5 && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 pl-10">
                      +{activeStops.length - 5} more stops
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Bundle booking sticky CTA */}
            {hasBookable && (
              <button onClick={() => setBundleOpen(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold
                           rounded-xl transition-colors shadow-sm">
                📅 Đặt Trip ({bookableCount} nơi)
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {addDay !== null && (
        <LocationSearchModal
          day={addDay}
          onAdd={(loc) => handleAddStop(addDay, loc)}
          onClose={() => setAddDay(null)}
        />
      )}

      {bookTarget && (
        <BookingModal
          open={true}
          location={bookTarget}
          tourRef={tour._id}
          onClose={() => setBookTarget(null)}
        />
      )}

      {bundleOpen && tour && (
        <BundleBookingFlow tour={tour} onClose={() => setBundleOpen(false)}/>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        bg-gray-900 dark:bg-slate-700 text-white text-sm
                        px-5 py-3 rounded-2xl shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}