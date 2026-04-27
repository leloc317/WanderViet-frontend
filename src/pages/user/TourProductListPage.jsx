import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/axios";

// ── Constants ─────────────────────────────────────────────────────────────────
const CAT_OPTS = [
  { key: "",           label: "Tất cả"       },
  { key: "food_tour",  label: "🍜 Food Tour"  },
  { key: "sightseeing",label: "🏛️ Sightseeing"},
  { key: "adventure",  label: "🧗 Adventure"  },
  { key: "cultural",   label: "🎭 Cultural"   },
  { key: "relaxation", label: "🧘 Relaxation" },
  { key: "shopping",   label: "🛍️ Shopping"  },
  { key: "mixed",      label: "🗺️ Mixed"     },
];

const SORT_OPTS = [
  { key: "createdAt",   label: "Mới nhất"     },
  { key: "price_asc",   label: "Giá tăng dần" },
  { key: "price_desc",  label: "Giá giảm dần" },
];

const fmtVND = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";

// ── TourProductCard ───────────────────────────────────────────────────────────
function TourProductCard({ tour }) {
  const navigate = useNavigate();
  const img      = tour.coverImage?.url;

  return (
    <div
      onClick={() => navigate(`/tours/products/${tour._id}`)}
      className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800
                 rounded-2xl overflow-hidden cursor-pointer group
                 hover:border-blue-200 dark:hover:border-blue-500/40
                 hover:shadow-lg hover:shadow-blue-50 dark:hover:shadow-blue-900/10
                 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100 dark:bg-slate-800 overflow-hidden">
        {img
          ? <img src={img} alt={tour.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
          : <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🗺️</div>
        }
        {/* Duration badge */}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] font-semibold
                        px-2.5 py-1 rounded-full backdrop-blur-sm">
          {tour.duration?.days}N{tour.duration?.nights}Đ
        </div>
        {/* Departure count */}
        {tour.upcomingDepartures > 0 && (
          <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] font-bold
                          px-2 py-0.5 rounded-full">
            {tour.upcomingDepartures} lịch
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="font-bold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2 leading-snug">
          {tour.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
          🏢 {tour.company?.name}
          {tour.nearestDeparture && (
            <span className="ml-2 text-blue-500 dark:text-blue-400 font-medium">
              · {new Date(tour.nearestDeparture).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500">Từ</p>
            <p className="text-base font-black text-blue-600 dark:text-blue-400">
              {fmtVND(tour.pricePerPerson)}
              <span className="text-xs font-normal text-gray-400">/người</span>
            </p>
          </div>
          {tour.upcomingDepartures === 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500 italic">Chưa có lịch</span>
          )}
          {tour.upcomingDepartures > 0 && (
            <span className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400
                             px-2.5 py-1 rounded-full font-medium border border-blue-100 dark:border-blue-500/20">
              Đặt ngay →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200 dark:bg-slate-800"/>
      <div className="p-4 space-y-2.5">
        <div className="h-3.5 bg-gray-200 dark:bg-slate-800 rounded-full w-4/5"/>
        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full w-3/5"/>
        <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded-full w-2/5 mt-4"/>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TourProductListPage() {
  const navigate                        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tours,      setTours]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });

  // Filters from URL
  const category = searchParams.get("category") || "";
  const q        = searchParams.get("q")        || "";
  const sortBy   = searchParams.get("sort")     || "createdAt";
  const page     = parseInt(searchParams.get("page") || "1");

  // Local search input (debounced)
  const [search, setSearch] = useState(q);

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tour-products", {
        params: {
          category: category || undefined,
          q:        q || undefined,
          sortBy,
          page,
          limit: 12,
        },
      });
      setTours(data.data.tours);
      setPagination(data.data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [category, q, sortBy, page]);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (search) p.set("q", search); else p.delete("q");
      p.delete("page");
      setSearchParams(p);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    p.delete("page");
    setSearchParams(p);
  };

  const goPage = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", p);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-5 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-white font-black text-3xl mb-2">🗺️ Tour Du Lịch</h1>
          <p className="text-blue-200 text-sm mb-6">Khám phá các tour do công ty uy tín vận hành</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => navigate("/tours")}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border-2
                         border-white/30 text-white/80 hover:bg-white/10 transition-colors">
              📋 Trip Plans
            </button>
            <button className="px-5 py-2.5 rounded-xl text-sm font-bold border-2
                               border-white bg-white/20 text-white">
              🗺️ Tour Products
            </button>
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl flex items-center px-4 gap-3 shadow-xl">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tour theo tên, điểm đến..."
                className="flex-1 py-3.5 text-sm text-gray-900 dark:text-white bg-transparent
                           placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => { setSearch(""); setParam("q", ""); }}
                  className="text-gray-300 hover:text-gray-500 text-xl leading-none transition-colors">×</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-none">
            {CAT_OPTS.map(c => (
              <button key={c.key} onClick={() => setParam("category", c.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border shrink-0 transition-all
                  ${category === c.key
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300"
                  }`}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setParam("sort", e.target.value)}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                       text-gray-700 dark:text-slate-300 rounded-xl px-3 py-2 text-xs
                       focus:outline-none shrink-0">
            {SORT_OPTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            {pagination.total} tour{q && ` cho "${q}"`}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i}/>)}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-slate-500">
            <p className="text-5xl mb-3">🗺️</p>
            <p className="font-semibold text-gray-600 dark:text-slate-400 mb-1">Không tìm thấy tour nào</p>
            <p className="text-sm">Thử bỏ bộ lọc hoặc tìm kiếm khác</p>
            {(category || q) && (
              <button onClick={() => { setSearch(""); setSearchParams({}); }}
                className="mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm">
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tours.map(t => <TourProductCard key={t._id} tour={t}/>)}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button onClick={() => goPage(page - 1)} disabled={page <= 1}
              className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                         dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40 transition-colors">
              ← Trước
            </button>
            <span className="text-sm text-gray-500 dark:text-slate-400 px-2">
              {page} / {pagination.totalPages}
            </span>
            <button onClick={() => goPage(page + 1)} disabled={page >= pagination.totalPages}
              className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                         dark:border-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40 transition-colors">
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}