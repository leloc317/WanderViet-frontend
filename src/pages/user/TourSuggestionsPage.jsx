import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import userAppService from "../../services/userApp.service";
import HeroSearch from "../../components/HeroSearch";

const CAT_LABEL = {
  food_tour:"🍜 Food Tour", sightseeing:"🏛️ Sightseeing", adventure:"🧗 Adventure",
  cultural:"🎭 Cultural", relaxation:"🧘 Relaxation", shopping:"🛍️ Shopping", mixed:"🗺️ Mixed",
};

const BUDGET_OPTS = [
  { key:"",        label:"Any Budget" },
  { key:"budget",  label:"$ Budget"   },
  { key:"mid",     label:"$$ Mid"     },
  { key:"high",    label:"$$$ High"   },
  { key:"luxury",  label:"$$$$ Luxury"},
];

const DAY_OPTS = [
  { key:"",  label:"Any Length" },
  { key:"1", label:"1 Day"      },
  { key:"2", label:"2 Days"     },
  { key:"3", label:"3 Days"     },
  { key:"5", label:"5 Days"     },
];

const CATS = [
  { key:"",            label:"All Types"  },
  { key:"food_tour",   label:"Food"       },
  { key:"sightseeing", label:"Sightseeing"},
  { key:"adventure",   label:"Adventure"  },
  { key:"cultural",    label:"Cultural"   },
  { key:"relaxation",  label:"Relaxation" },
  { key:"mixed",       label:"Mixed"      },
];

function TourCard({ tour }) {
  const navigate = useNavigate();
  const stops = tour.itinerary?.reduce((t,d) => t + d.stops.length, 0) ?? 0;
  return (
    <div onClick={() => navigate(`/tours/${tour._id}`)}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                 rounded-2xl overflow-hidden cursor-pointer group
                 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all">
      <div className="h-44 bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
        {tour.stops?.[0]?.location?.images?.[0]?.url ? (
          <img src={tour.stops[0].location.images[0].url} alt={tour.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🗺️</div>
        )}
        {tour.isTemplate && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px]
                           font-bold px-2 py-0.5 rounded-full">TEMPLATE</span>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px]
                        font-medium px-2 py-0.5 rounded-full">
          {tour.duration?.days || 1}D {tour.duration?.nights || 0}N
        </div>
      </div>

      <div className="p-4">
        <p className="font-bold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">{tour.title}</p>
        {tour.description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{tour.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {CAT_LABEL[tour.category] || tour.category}
            </span>
            {tour.budget?.label && (
              <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">{tour.budget.label}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 shrink-0">
            <span>📍</span><span>{stops} stops</span>
          </div>
        </div>
        {tour.rating?.avg > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{tour.rating.avg.toFixed(1)}</span>
            <span className="text-xs text-gray-400 dark:text-slate-500">({tour.rating.count || 0})</span>
            {tour.stats?.used > 0 && (
              <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">· {tour.stats.used} uses</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TourSuggestionsPage() {
  const navigate = useNavigate();
  const [tours,   setTours]   = useState([]);
  const [pagination, setPag]  = useState({ page:1, totalPages:1, total:0 });
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);

  const [category, setCategory] = useState("");
  const [budget,   setBudget]   = useState("");
  const [days,     setDays]     = useState("");

  const fetchTours = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 9 };
      if (category) params.category = category;
      if (budget)   params.budget   = budget;
      if (days)     params.days     = days;
      const result = await userAppService.getTours(params);
      setTours(result.tours);
      setPag(result.pagination);
      setPage(p);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [category, budget, days]);

  useEffect(() => { fetchTours(1); }, [category, budget, days]);

  const selectCls = `bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                     text-gray-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">

      <div className="max-w-6xl mx-auto px-5 py-6">

        {/* ── TAB: Trip Plans vs Tour Products ── */}
        <div className="flex gap-2 mb-6">
          <button
            className="px-5 py-2.5 rounded-xl text-sm font-bold border-2
                       border-blue-600 bg-blue-600 text-white shadow-sm">
            📋 Trip Plans
          </button>
          <button onClick={() => navigate("/tours/products")}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border-2
                       border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-300
                       hover:border-blue-400 hover:text-blue-600
                       dark:hover:border-blue-500 dark:hover:text-blue-400
                       transition-colors">
            🗺️ Tour Products
          </button>
        </div>

        {/* ── HERO SEARCH — tour mode ── */}
        <HeroSearch mode="tour" />

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {CATS.map(({ key, label }) => (
            <button key={key} onClick={() => setCategory(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border shrink-0 transition-all
                          ${category === key
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <select value={budget} onChange={e => setBudget(e.target.value)} className={selectCls}>
            {BUDGET_OPTS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
          <select value={days} onChange={e => setDays(e.target.value)} className={selectCls}>
            {DAY_OPTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">
            {pagination.total} tours available
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-72 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">🗺️</p>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">No tours found</p>
            <button onClick={() => { setCategory(""); setBudget(""); setDays(""); }}
              className="mt-2 text-blue-600 dark:text-blue-400 text-sm underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tours.map(tour => <TourCard key={tour._id} tour={tour}/>)}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button onClick={() => fetchTours(page-1)} disabled={page<=1}
              className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                         dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40">
              ← Prev
            </button>
            <span className="self-center text-sm text-gray-500 dark:text-slate-400">
              {page} / {pagination.totalPages}
            </span>
            <button onClick={() => fetchTours(page+1)} disabled={page>=pagination.totalPages}
              className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                         dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}