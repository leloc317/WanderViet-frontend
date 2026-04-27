import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";

const CATEGORIES = [
  { key: "hotel",         label: "Hotels",        icon: "🏨" },
  { key: "restaurant",    label: "Restaurants",   icon: "🍽️" },
  { key: "sightseeing",   label: "Sightseeing",   icon: "🏛️" },
  { key: "cafe",          label: "Cafes",         icon: "☕" },
  { key: "entertainment", label: "Entertainment", icon: "🎡" },
  { key: "tour",          label: "Tours",         icon: "🗺️" },
];

const CITIES = ["Hà Nội", "Đà Nẵng", "Hội An", "Đà Lạt", "Nha Trang", "Phú Quốc"];
const PRICE_MAP = { free: "Free", budget: "$", mid: "$$", high: "$$$", luxury: "$$$$" };

function GuestCounter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const adults   = value.adults   ?? 1;
  const children = value.children ?? 0;
  const label    = `${adults + children} người`;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-sm text-gray-700
                   dark:text-slate-300 px-0 py-0">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
        </svg>
        <span>{label}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-56 bg-white dark:bg-slate-900
                        border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[60] p-4 space-y-4">
          {[
            { key: "adults",   label: "Adults",   sub: "Age 13+",  min: 1 },
            { key: "children", label: "Children", sub: "Under 13", min: 0 },
          ].map(({ key, label, sub, min }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => onChange({ ...value, [key]: Math.max(min, (value[key] ?? 0) - 1) })}
                  disabled={(value[key] ?? 0) <= min}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700
                             flex items-center justify-center text-gray-600 dark:text-slate-300
                             disabled:opacity-30 text-lg font-light">−</button>
                <span className="w-5 text-center text-sm font-semibold text-gray-900 dark:text-white">
                  {value[key] ?? 0}
                </span>
                <button type="button"
                  onClick={() => onChange({ ...value, [key]: (value[key] ?? 0) + 1 })}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700
                             flex items-center justify-center text-gray-600 dark:text-slate-300 text-lg font-light">+</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setOpen(false)}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default function HeroSearch({ mode = "location" }) {
  const navigate   = useNavigate();
  const isTourMode = mode === "tour";

  const [category,    setCategory]    = useState(isTourMode ? "tour" : "hotel");
  const [destination, setDestination] = useState("");
  const [date,        setDate]        = useState("");
  const [checkout,    setCheckout]    = useState("");
  const [guests,      setGuests]      = useState({ adults: 1, children: 0 });
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(false);

  const inputRef     = useRef(null);
  const containerRef = useRef(null);
  const timer        = useRef(null);
  const today        = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setShowSug(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchSuggestions = useCallback((q) => {
    clearTimeout(timer.current);
    setSugLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await api.get("/search/suggestions", {
          params: { q: q || undefined, category: category === "tour" ? undefined : category },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setSuggestions(data.data.suggestions || []);
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, q ? 280 : 0);
  }, [category]);

  const goSearch = (overrides = {}) => {
    const dest = overrides.destination ?? destination;
    const cat  = overrides.category    ?? category;
    const params = new URLSearchParams();
    if (overrides.city) {
      params.set("city", overrides.city);
    } else if (dest) {
      const isCity = CITIES.some(c => c.toLowerCase() === dest.toLowerCase().trim());
      params.set(isCity ? "city" : "q", dest);
    }
    if (date)                        params.set(cat === "hotel" ? "checkin" : "date", date);
    if (checkout && cat === "hotel") params.set("checkout", checkout);
    if (guests.adults > 0)           params.set("adults",   guests.adults);
    if (guests.children > 0)         params.set("children", guests.children);
    setShowSug(false);
    navigate(`/search/${cat}?${params.toString()}`);
  };

  const handleSuggestionClick = (s) => {
    const city = s.address?.city || "";
    setDestination(s.name);
    setShowSug(false);
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    params.set("q", s.name);
    if (date)                        params.set(category === "hotel" ? "checkin" : "date", date);
    if (checkout && category === "hotel") params.set("checkout", checkout);
    if (guests.adults > 0)           params.set("adults", guests.adults);
    navigate(`/search/${category}?${params.toString()}`);
  };

  return (
    <div className="mb-8">
      <div className="relative rounded-3xl bg-blue-600 px-4 sm:px-6 pt-6 pb-6">
        {/* Heading */}
        {!isTourMode && (
          <div className="mb-4">
            <h2 className="text-white font-bold text-xl sm:text-2xl leading-tight">
              Where do you want to go?
            </h2>
            <p className="text-blue-200 text-xs sm:text-sm mt-1">
              Khám phá hàng nghìn địa điểm tuyệt vời tại Việt Nam
            </p>
          </div>
        )}

        {/* Category chips — scroll ngang trên mobile */}
        {!isTourMode && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-none -mx-1 px-1">
            {CATEGORIES.map(({ key, label, icon }) => (
              <button key={key} type="button"
                onClick={() => { setCategory(key); if (destination) fetchSuggestions(destination); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-[13px]
                            font-medium transition-all shrink-0
                            ${category === key
                              ? "bg-white text-blue-700 shadow"
                              : "bg-white/15 text-white hover:bg-white/25 border border-white/10"}`}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
        )}

        {/* Search box — desktop: horizontal · mobile: vertical stack */}
        <div ref={containerRef} className="relative">
          {/* Desktop layout (sm+) */}
          <div className="hidden sm:flex bg-white dark:bg-slate-900 rounded-2xl shadow-xl
                          items-stretch overflow-visible">
            {/* Destination */}
            <div className="flex-1 min-w-0 relative">
              <div className="flex items-center gap-2 px-4 py-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                </svg>
                <input ref={inputRef} value={destination}
                  onChange={e => { setDestination(e.target.value); setShowSug(true); fetchSuggestions(e.target.value); }}
                  onFocus={() => { setShowSug(true); if (!destination) fetchSuggestions(""); }}
                  placeholder="Điểm đến, khách sạn..."
                  className="flex-1 text-sm text-gray-900 dark:text-white bg-transparent
                             placeholder-gray-400 focus:outline-none min-w-0"/>
                {destination && (
                  <button type="button" onClick={() => { setDestination(""); setSuggestions([]); }}
                    className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSug && (sugLoading || suggestions.length > 0) && (
                <div className="absolute top-[calc(100%+6px)] left-0 bg-white dark:bg-slate-900
                                border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl
                                z-[70] overflow-hidden" style={{ minWidth: "300px", maxWidth: "400px" }}>
                  {sugLoading && suggestions.length === 0 ? (
                    <div className="px-4 py-3 space-y-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex gap-3 items-center animate-pulse">
                          <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0"/>
                          <div className="flex-1 space-y-1.5">
                            <div className="h-2.5 bg-gray-100 rounded-full w-3/4"/>
                            <div className="h-2 bg-gray-50 rounded-full w-1/2"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : suggestions.map(s => {
                    const img = s.images?.find(i => i.isPrimary)?.url || s.images?.[0]?.url;
                    return (
                      <button key={s._id} type="button" onMouseDown={() => handleSuggestionClick(s)}
                        className="w-full flex items-center gap-3 px-4 py-2.5
                                   hover:bg-gray-50 dark:hover:bg-slate-800 text-left
                                   border-b border-gray-50 dark:border-slate-800 last:border-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {img ? <img src={img} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-sm">📍</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.address?.city}</p>
                        </div>
                        {s.rating?.finalScore > 0 && (
                          <span className="text-xs text-gray-400 shrink-0">★ {s.rating.finalScore.toFixed(1)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="w-px bg-gray-100 dark:bg-slate-800 self-stretch"/>

            {/* Check-in */}
            <div className="flex items-center gap-2 px-4 py-3 shrink-0">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
              <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
                className="text-sm text-gray-700 dark:text-slate-300 bg-transparent focus:outline-none w-[110px]"/>
            </div>

            {category === "hotel" && (
              <>
                <div className="w-px bg-gray-100 dark:bg-slate-800 self-stretch"/>
                <div className="flex items-center gap-2 px-4 py-3 shrink-0">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                  </svg>
                  <input type="date" value={checkout} min={date || today} onChange={e => setCheckout(e.target.value)}
                    className="text-sm text-gray-700 dark:text-slate-300 bg-transparent focus:outline-none w-[110px]"/>
                </div>
              </>
            )}

            <div className="w-px bg-gray-100 dark:bg-slate-800 self-stretch"/>
            <div className="flex items-center px-4 py-3 shrink-0">
              <GuestCounter value={guests} onChange={setGuests}/>
            </div>

            <button type="button" onClick={() => goSearch()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold
                         px-5 rounded-r-2xl flex items-center gap-2 text-sm shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              Search
            </button>
          </div>

          {/* Mobile layout — stacked card */}
          <div className="sm:hidden bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
            {/* Destination */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
              </svg>
              <input value={destination}
                onChange={e => { setDestination(e.target.value); fetchSuggestions(e.target.value); }}
                placeholder="Điểm đến, khách sạn..."
                className="flex-1 text-sm text-gray-900 dark:text-white bg-transparent
                           placeholder-gray-400 focus:outline-none"/>
            </div>

            {/* Dates row */}
            <div className="flex items-center border-b border-gray-100 dark:border-slate-800">
              <div className="flex-1 flex items-center gap-2 px-4 py-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                </svg>
                <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
                  className="text-sm text-gray-700 dark:text-slate-300 bg-transparent focus:outline-none w-full"/>
              </div>
              {category === "hotel" && (
                <>
                  <div className="w-px bg-gray-100 dark:bg-slate-800 self-stretch"/>
                  <div className="flex-1 flex items-center gap-2 px-4 py-3">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                    </svg>
                    <input type="date" value={checkout} min={date || today} onChange={e => setCheckout(e.target.value)}
                      className="text-sm text-gray-700 dark:text-slate-300 bg-transparent focus:outline-none w-full"/>
                  </div>
                </>
              )}
            </div>

            {/* Guests + Search button */}
            <div className="flex items-center px-4 py-3 gap-3">
              <div className="flex-1">
                <GuestCounter value={guests} onChange={setGuests}/>
              </div>
              <button type="button" onClick={() => goSearch()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold
                           px-5 py-2 rounded-xl flex items-center gap-2 text-sm shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                </svg>
                Tìm
              </button>
            </div>
          </div>
        </div>

        {/* City pills */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-none -mx-1 px-1">
          <span className="text-blue-300 text-[10px] font-semibold shrink-0 uppercase tracking-wider">
            Popular:
          </span>
          {CITIES.map(city => (
            <button key={city} type="button"
              onClick={() => { setDestination(city); goSearch({ destination: city, city }); }}
              className="text-xs text-white/75 hover:text-white bg-white/10 hover:bg-white/20
                         px-3 py-1 rounded-full shrink-0 border border-white/10 transition-all">
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}