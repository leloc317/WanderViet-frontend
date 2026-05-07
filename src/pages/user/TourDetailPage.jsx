import { useState, useEffect, useRef } from "react";
import BookingModal       from "../../components/modals/BookingModal";
import BundleBookingFlow  from "../../components/BundleBookingFlow";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";
import useTracking from "../../hooks/useTracking";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtVND = (n) => n > 0 ? `${(n/1000).toFixed(0)}k₫` : "Free";
const fmtDuration = (mins) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const CAT_ICON = {
  restaurant:"🍽️", hotel:"🏨", tourist_spot:"🏛️",
  cafe:"☕", entertainment:"🎡", shopping:"🛍️", other:"📍",
};

const TRANSPORT_LABEL = {
  walk:"🚶 Walk", motorbike:"🏍️ Motorbike", car:"🚗 Car",
  bus:"🚌 Bus", taxi:"🚕 Taxi/Grab", other:"🚌 Transit",
};

// ─── Stop Card ────────────────────────────────────────────────────────────────
function StopCard({ stop, index, canEdit, onEdit, onDelete, isLast, onBook }) {
  const loc = stop.location;
  const img = loc?.images?.find(i=>i.isPrimary)?.url || loc?.images?.[0]?.url;

  return (
    <div className="flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center shrink-0 w-20">
        {stop.startTime && (
          <div className="bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400
                          text-xs font-semibold px-2 py-1 rounded-full mb-2 whitespace-nowrap">
            {stop.startTime}
          </div>
        )}
        <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0 mt-1"/>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-700 mt-1 min-h-8"/>
        )}
      </div>

      {/* Card */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                      rounded-2xl p-4 mb-4 group hover:border-blue-300 dark:hover:border-blue-600 transition-all">
        <div className="flex gap-3">
          {/* Image */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
            {img
              ? <img src={img} alt={loc?.name} className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-xl">
                  {CAT_ICON[loc?.category] || "📍"}
                </div>
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{loc?.name || "Unknown"}</p>
                {loc?.address?.city && (
                  <p className="text-xs text-gray-400 dark:text-slate-500">{loc.address.city}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Book button — hiện khi location có isBookable */}
                {loc?.booking?.isBookable && onBook && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onBook(loc); }}
                    className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white
                               px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap">
                    Đặt chỗ
                  </button>
                )}
                {canEdit && (
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(stop)}
                      className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400
                                 flex items-center justify-center text-sm hover:bg-blue-100 transition-colors">
                      ✏️
                    </button>
                    <button onClick={() => onDelete(stop._id)}
                      className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-600/20 text-red-500 dark:text-red-400
                                 flex items-center justify-center text-sm hover:bg-red-100 transition-colors">
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>

            {stop.note && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic line-clamp-2">{stop.note}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-slate-500">
              {loc?.priceRange && (
                <span className="flex items-center gap-1">
                  💰 {loc.priceRange.label === "free" ? "Free"
                      : loc.priceRange.max > 0
                        ? fmtVND((loc.priceRange.min + loc.priceRange.max) / 2)
                        : loc.priceRange.label}
                </span>
              )}
              {stop.duration > 0 && (
                <span className="flex items-center gap-1">🕐 {fmtDuration(stop.duration)}</span>
              )}
              {loc?.rating?.finalScore > 0 && (
                <span className="flex items-center gap-1">⭐ {loc.rating.finalScore.toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Travel time separator ────────────────────────────────────────────────────
function TravelDivider({ transport }) {
  return (
    <div className="flex items-center gap-3 mb-2 ml-20 pl-4">
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800
                      border border-dashed border-gray-200 dark:border-slate-700 rounded-full px-3 py-1">
        {TRANSPORT_LABEL[transport] || "🚌 Transit"}
        <span>· ~15 mins</span>
      </div>
    </div>
  );
}

// ─── Add stop modal ───────────────────────────────────────────────────────────
function AddStopModal({ open, onClose, onAdd, currentDay }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ startTime:"", duration:60, note:"", transportTo:"taxi" });
  const [adding, setAdding]     = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setSelected(null); }
  }, [open]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get("/locations", { params: { search: query, status:"approved", limit:8 } });
        setResults(data.data.locations);
      } catch{}
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query]);

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      await onAdd({ locationId: selected._id, day: currentDay, ...form });
      onClose();
    } finally { setAdding(false); }
  };

  if (!open) return null;

  const inputCls = `w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                    text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                      rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white">Add Activity — Day {currentDay}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Search location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Search Location *
            </label>
            <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
              placeholder="Search restaurants, sights, hotels..."
              className={inputCls}/>

            {/* Results */}
            {(results.length > 0 || searching) && !selected && (
              <div className="mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                              rounded-xl overflow-hidden shadow-lg">
                {searching ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
                ) : results.map(loc => {
                  const img = loc.images?.find(i=>i.isPrimary)?.url || loc.images?.[0]?.url;
                  return (
                    <button key={loc._id} onClick={() => setSelected(loc)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-left transition-colors">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0">
                        {img ? <img src={img} alt="" className="w-full h-full object-cover"/> :
                          <div className="w-full h-full flex items-center justify-center">{CAT_ICON[loc.category]||"📍"}</div>}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{loc.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{loc.address?.city} · {loc.category}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected */}
            {selected && (
              <div className="mt-2 flex items-center gap-3 bg-blue-50 dark:bg-blue-600/15 border border-blue-200
                              dark:border-blue-500/40 rounded-xl px-4 py-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">{selected.name}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">{selected.address?.city}</p>
                </div>
                <button onClick={() => { setSelected(null); setQuery(""); }}
                  className="text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Start Time</label>
              <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime:e.target.value})}
                className={inputCls}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Duration (mins)</label>
              <input type="number" min={15} step={15} value={form.duration}
                onChange={e => setForm({...form, duration: Number(e.target.value)})}
                className={inputCls}/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Transport to next stop</label>
            <select value={form.transportTo} onChange={e => setForm({...form, transportTo:e.target.value})}
              className={`${inputCls} appearance-none`}>
              <option value="walk">🚶 Walk</option>
              <option value="taxi">🚕 Taxi / Grab</option>
              <option value="motorbike">🏍️ Motorbike</option>
              <option value="car">🚗 Car</option>
              <option value="bus">🚌 Bus</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Note</label>
            <textarea value={form.note} onChange={e => setForm({...form, note:e.target.value})}
              rows={2} placeholder="Tips, what to order, booking required..."
              className={`${inputCls} resize-none`}/>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-slate-800">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-sm
                       font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!selected || adding}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-semibold transition-colors disabled:opacity-50">
            {adding ? "Adding..." : "+ Add Activity"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit stop modal ──────────────────────────────────────────────────────────
function EditStopModal({ stop, open, onClose, onSave }) {
  const [form, setForm] = useState({ startTime:"", duration:60, note:"", transportTo:"taxi" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stop) setForm({
      startTime:   stop.startTime   || "",
      duration:    stop.duration    || 60,
      note:        stop.note        || "",
      transportTo: stop.transportTo || "taxi",
    });
  }, [stop]);

  if (!open || !stop) return null;

  const inputCls = `w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                    text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all`;

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(stop._id, form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                      rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Edit Stop</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500">{stop.location?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Start Time</label>
              <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime:e.target.value})} className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Duration (mins)</label>
              <input type="number" min={15} step={15} value={form.duration}
                onChange={e => setForm({...form, duration:Number(e.target.value)})} className={inputCls}/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Transport to next</label>
            <select value={form.transportTo} onChange={e => setForm({...form, transportTo:e.target.value})} className={`${inputCls} appearance-none`}>
              <option value="walk">🚶 Walk</option>
              <option value="taxi">🚕 Taxi / Grab</option>
              <option value="motorbike">🏍️ Motorbike</option>
              <option value="car">🚗 Car</option>
              <option value="bus">🚌 Bus</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm({...form, note:e.target.value})}
              rows={3} className={`${inputCls} resize-none`}/>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-400">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function TourDetailPage() {
  const { id }     = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { trackViewTour, trackForkTour } = useTracking();

  const [tour,    setTour]    = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);

  // Modals
  const [addModal,  setAddModal]  = useState(false);
  const [editStop,  setEditStop]  = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [bookTarget,  setBookTarget]  = useState(null); // location để book từ stop
  const [bundleOpen,  setBundleOpen]  = useState(false);

  // Fetch tour — try own tour first, then public
  useEffect(() => {
    const fetchTour = async () => {
      setLoading(true);
      try {
        let res;
        try {
          res = await api.get(`/me/my-tours/${id}`);
        } catch {
          res = await api.get(`/me/tours/${id}/detail`);
        }
        setTour(res.data.data.tour);
        setCanEdit(res.data.data.canEdit || false);
        setActiveDay(res.data.data.tour?.itinerary?.[0]?.day || 1);
        trackViewTour(id);
      } catch(e) {
        console.error(e);
        navigate("/tours");
      } finally { setLoading(false); }
    };
    fetchTour();
  }, [id]);

  const currentDay = tour?.itinerary?.find(d => d.day === activeDay);
  const stops      = currentDay?.stops?.slice().sort((a,b) => (a.order??0) - (b.order??0)) || [];
  const totalDays  = tour?.itinerary?.length || 0;

  // Budget estimate
  const budgetEstimate = tour?.itinerary?.reduce((total, day) =>
    total + day.stops.reduce((dt, stop) => {
      const loc = stop.location;
      return dt + (loc?.priceRange?.max
        ? (loc.priceRange.min + loc.priceRange.max) / 2
        : 0);
    }, 0), 0) || 0;

  // Map URL for sidebar
  const firstStop = stops[0]?.location;
  const [lng, lat] = firstStop?.coordinates?.coordinates || [105.8412, 21.0245];
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}&z=13&output=embed`;

  const handleAddStop = async (payload) => {
    try {
      const { data } = await api.post(`/me/my-tours/${id}/days/${activeDay}/stops`, payload);
      setTour(data.data.tour);
    } catch(e) { alert(e.response?.data?.message || "Error adding stop"); }
  };

  const handleEditStop = async (stopId, form) => {
    try {
      const { data } = await api.put(`/me/my-tours/${id}/days/${activeDay}/stops/${stopId}`, form);
      setTour(data.data.tour);
    } catch(e) { alert(e.response?.data?.message || "Error updating stop"); }
  };

  const handleDeleteStop = async (stopId) => {
    if (!confirm("Remove this stop?")) return;
    setDeleting(stopId);
    try {
      const { data } = await api.delete(`/me/my-tours/${id}/days/${activeDay}/stops/${stopId}`);
      setTour(data.data.tour);
      // If active day no longer exists, go to first day
      if (!data.data.tour.itinerary?.find(d => d.day === activeDay)) {
        setActiveDay(data.data.tour.itinerary?.[0]?.day || 1);
      }
    } catch(e) { alert(e.response?.data?.message || "Error"); }
    finally { setDeleting(null); }
  };

  const handleFork = async () => {
    try {
      const { data } = await api.post(`/me/my-tours/fork/${id}`);
      trackForkTour(id);
      navigate(`/tours/${data.data.tour._id}`);
    } catch(e) { alert(e.response?.data?.message || "Error forking tour"); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="animate-pulse text-blue-600 text-sm">Loading itinerary...</div>
    </div>
  );

  if (!tour) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* NAV */}
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-sm ml-4 text-gray-400 dark:text-slate-500">
            <Link to="/explore"
              className="hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
              Explore
            </Link>
            <span>›</span>
            <Link to="/tours"
              className="hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
              Tours
            </Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
              {tour?.title || "Itinerary"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate(-1)}
              className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
              ← Back
            </button>
            {user && !canEdit && (
              <div className="flex gap-2">
                <button onClick={handleFork}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  📋 Use This Tour
                </button>
                {/* Bundle booking — hiện khi có ít nhất 1 bookable stop */}
                {tour?.itinerary?.some(d => d.stops?.some(s => s.location?.booking?.isBookable)) && (
                  <button onClick={() => setBundleOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                    🗓️ Book Trip
                  </button>
                )}
              </div>
            )}
            {canEdit && (
              <span className="text-xs bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-medium">
                ✏️ Editing
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-5 py-5 flex gap-6">
        {/* ── LEFT SIDEBAR: Trip Setup ── */}
        {/* <aside className="w-56 shrink-0 hidden lg:block">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600 text-lg">⚙️</span>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Trip Setup</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Destination</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                  <span className="text-gray-400 text-sm">📍</span>
                  <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">
                    {tour.itinerary?.[0]?.stops?.[0]?.location?.address?.city || "Vietnam"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Duration</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                    <p className="text-[9px] text-gray-400 dark:text-slate-500">DAYS</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{tour.duration?.days || 1}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                    <p className="text-[9px] text-gray-400 dark:text-slate-500">NIGHTS</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{tour.duration?.nights || 0}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Budget</p>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-3">
                  <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-2">
                    <span>Min</span><span>Max</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mb-2">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width:"65%" }}/>
                  </div>
                  <p className="text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                    ~{fmtVND(budgetEstimate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav sections */}
            {/* <div className="mt-4 space-y-1 border-t border-gray-100 dark:border-slate-800 pt-4">
              {[
                { icon:"📋", label:"Detailed Itinerary", active:true  },
                { icon:"💰", label:"Expense Breakdown",  active:false },
                { icon:"🗺️",  label:"Interactive Map",   active:false },
              ].map(({ icon, label, active }) => (
                <button key={label}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-all
                              ${active
                                ? "bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-400 font-medium"
                                : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>
        </aside> */}

        {/* ── CENTER: Itinerary ── */}
        <main className="flex-1 min-w-0">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl">
            {/* Day header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-white">
                  Day {activeDay} Itinerary
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {currentDay?.title || `Day ${activeDay} activities`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveDay(d => Math.max(1, d-1))}
                  disabled={activeDay <= 1}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 flex items-center justify-center
                             text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all">
                  ‹
                </button>
                {/* Day dots */}
                <div className="flex gap-1.5">
                  {tour.itinerary?.map(d => (
                    <button key={d.day} onClick={() => setActiveDay(d.day)}
                      className={`w-7 h-7 rounded-full text-xs font-semibold transition-all
                                  ${d.day === activeDay
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"}`}>
                      {d.day}
                    </button>
                  ))}
                </div>
                <button onClick={() => setActiveDay(d => Math.min(totalDays || 1, d+1))}
                  disabled={activeDay >= totalDays}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 flex items-center justify-center
                             text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all">
                  ›
                </button>
              </div>
            </div>

            {/* Stops */}
            <div className="px-6 py-5">
              {stops.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                  <p className="text-3xl mb-2">📍</p>
                  <p className="text-sm">No activities for this day yet</p>
                </div>
              ) : (
                stops.map((stop, idx) => (
                  <div key={stop._id || idx}>
                    <StopCard
                      stop={stop} index={idx}
                      canEdit={canEdit}
                      isLast={idx === stops.length - 1}
                      onEdit={(s) => setEditStop(s)}
                      onDelete={handleDeleteStop}
                      onBook={user ? setBookTarget : null}/>
                    {/* Travel divider between stops */}
                    {idx < stops.length - 1 && stop.transportTo && (
                      <TravelDivider transport={stop.transportTo}/>
                    )}
                  </div>
                ))
              )}

              {/* Add activity button */}
              {canEdit && (
                <button onClick={() => setAddModal(true)}
                  className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700
                             text-gray-400 dark:text-slate-500 text-sm font-medium
                             hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400
                             flex items-center justify-center gap-2 transition-all">
                  <span className="text-lg">⊕</span>
                  Add new activity
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR: Trip Overview ── */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="space-y-3 sticky top-20">
            <p className="font-bold text-gray-900 dark:text-white">Trip Overview</p>

            {/* Map */}
            <div className="relative h-40 rounded-2xl overflow-hidden bg-gray-200 dark:bg-slate-800">
              <iframe src={mapUrl} width="100%" height="100%" style={{ border:0 }} allowFullScreen loading="lazy" title="Map"/>
              <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
                className="absolute bottom-3 right-3 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300
                           text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1
                           hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
                </svg>
                View full map
              </a>
            </div>

            {/* Stats */}
            {[
              { icon:"💰", label:"Estimated Budget", value: fmtVND(budgetEstimate) },
              { icon:"📍", label:"Total Stops", value: tour.itinerary?.reduce((t,d) => t + d.stops.length, 0) || 0 },
              { icon:"🗓️",  label:"Duration", value: `${tour.duration?.days||1}D ${tour.duration?.nights||0}N` },
            ].map(({ icon, label, value }) => (
              <div key={label}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                           rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm text-gray-600 dark:text-slate-300">{label}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">{value}</span>
              </div>
            ))}

            {/* Suggestions from stops in other days */}
            {stops.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Stops Today
                </p>
                <div className="space-y-2">
                  {stops.slice(0,4).map((s, i) => {
                    const loc = s.location;
                    const img = loc?.images?.[0]?.url;
                    return (
                      <Link key={i} to={`/locations/${loc?._id}`}
                        className="flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl p-1.5 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 overflow-hidden shrink-0">
                          {img
                            ? <img src={img} alt="" className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center text-sm">{CAT_ICON[loc?.category]||"📍"}</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{loc?.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500">{s.startTime || `Stop ${i+1}`}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Modals */}
      {/* Bundle booking flow */}
      {bundleOpen && tour && (
        <BundleBookingFlow
          tour={tour}
          onClose={() => setBundleOpen(false)}
        />
      )}

      {/* BookingModal — triggered từ StopCard */}
      {bookTarget && (
        <BookingModal
          open={!!bookTarget}
          location={bookTarget}
          tourRef={tour?._id}       // gắn tourRef để track conversion
          onClose={() => setBookTarget(null)}
        />
      )}

      <AddStopModal
        open={addModal}
        currentDay={activeDay}
        onClose={() => setAddModal(false)}
        onAdd={handleAddStop}
      />
      <EditStopModal
        open={!!editStop}
        stop={editStop}
        onClose={() => setEditStop(null)}
        onSave={handleEditStop}
      />
    </div>
  );
}