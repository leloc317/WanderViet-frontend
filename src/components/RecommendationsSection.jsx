import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import useTracking from "../hooks/useTracking";

const CAT_LABEL = {
  restaurant:"🍽️ Restaurant", tourist_spot:"🏛️ Sightseeing", hotel:"🏨 Hotel",
  cafe:"☕ Cafe", entertainment:"🎡 Entertainment", shopping:"🛍️ Shopping",
  service:"🔧 Service", other:"📦 Other",
};
const PRICE_LABEL = {
  free:"🆓 Free", budget:"$ Budget", mid:"$$ Mid", high:"$$$ High", luxury:"$$$$ Luxury",
};
const fmtScore = (n) => (n ?? 0).toFixed(1);
const fmtPrice = (loc) => {
  if (!loc.priceRange) return "";
  if (loc.priceRange.label === "free") return "Free";
  if (loc.priceRange.min > 0) {
    const n = loc.priceRange.min;
    return n >= 1_000_000 ? `₫${(n/1_000_000).toFixed(1)}M` : `₫${Math.round(n/1000)}k`;
  }
  return { budget:"$", mid:"$$", high:"$$$", luxury:"$$$$" }[loc.priceRange.label] || "";
};
const PRICE_SHORT = { free:"Free", budget:"$", mid:"$$", high:"$$$", luxury:"$$$$" };

function InterestBar({ label, score, maxScore, color }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 dark:text-slate-300 w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width:`${pct}%`, background:color }}/>
      </div>
      <span className="text-xs text-gray-400 dark:text-slate-500 w-8 text-right shrink-0">
        {fmtScore(score)}
      </span>
    </div>
  );
}

function LocCard({ loc }) {
  const navigate = useNavigate();
  const { trackView } = useTracking();
  const img = loc.images?.find(i=>i.isPrimary)?.url ?? loc.images?.[0]?.url;
  return (
    <div onClick={() => { navigate(`/locations/${loc._id}`); trackView(loc._id, loc.category, loc.priceRange?.label); }}
      className="shrink-0 w-40 cursor-pointer group">
      <div className="relative h-28 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 mb-2">
        {img
          ? <img src={img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🏞️</div>
        }
        {loc.verifiedBy?.length > 0 && (
          <span className="absolute bottom-1.5 left-1.5 bg-teal-600/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">✅</span>
        )}
        {fmtPrice(loc) && (
          <span className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
            {fmtPrice(loc)}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{loc.name}</p>
      <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{loc.address?.city}</p>
      {loc.rating?.finalScore > 0 && (
        <p className="text-[10px] text-amber-500 mt-0.5">★ {fmtScore(loc.rating.finalScore)}</p>
      )}
    </div>
  );
}

function TourCard({ tour }) {
  const navigate = useNavigate();
  const { trackViewTour } = useTracking();
  const img = tour.itinerary?.[0]?.stops?.[0]?.location?.images?.[0]?.url ?? tour.coverImage?.url;
  const stops = tour.itinerary?.reduce((t,d) => t + (d.stops?.length ?? 0), 0) ?? 0;
  return (
    <div onClick={() => { navigate(`/tours/${tour._id}`); trackViewTour(tour._id); }}
      className="shrink-0 w-48 cursor-pointer group">
      <div className="relative h-28 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 mb-2">
        {img
          ? <img src={img} alt={tour.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🗺️</div>
        }
        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
          {tour.duration?.days ?? 1}N · {stops} điểm
        </span>
        {tour.isTemplate && (
          <span className="absolute top-1.5 right-1.5 bg-blue-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">TEMPLATE</span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{tour.title}</p>
      <p className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">{tour.category}</p>
      {tour.rating?.avg > 0 && (
        <p className="text-[10px] text-amber-500 mt-0.5">★ {fmtScore(tour.rating.avg)}</p>
      )}
    </div>
  );
}

export default function RecommendationsSection() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [tours,     setTours]     = useState([]);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("recs");
  const [source,    setSource]    = useState("popular_fallback");

  useEffect(() => {
    Promise.all([
      api.get("/recommendations?limit=12").then(r => r.data.data),
      api.get("/recommendations/profile").then(r => r.data.data),
      api.get("/tours?limit=8&isTemplate=true&sortBy=stats.used&sortOrder=desc").then(r => r.data.data),
    ])
      .then(([recData, profileData, tourData]) => {
        setLocations(recData.locations ?? []);
        setSource(recData.source ?? "popular_fallback");
        setProfile(profileData);
        setTours(tourData.tours ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxCatScore   = Math.max(...(profile?.topCategories?.map(c=>c.score) ?? [1]), 1);
  const maxPriceScore = Math.max(...(profile?.topPrices?.map(p=>p.score)     ?? [1]), 1);
  const isPersonalized = source === "personalized";
  const hasProfile     = (profile?.totalActions ?? 0) > 0;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded-full w-48"/>
      <div className="flex gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="shrink-0 w-40">
            <div className="h-28 bg-gray-200 dark:bg-slate-800 rounded-2xl mb-2"/>
            <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-28"/>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          {[
            { key:"recs",    label:"For You"    },
            { key:"tours",   label:"Tours"       },
            { key:"profile", label:"My Profile"  },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium
                ${tab === t.key
                  ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === "recs" && (
          isPersonalized
            ? <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-full">✨ Cá nhân hoá</span>
            : <span className="text-[10px] text-gray-400 dark:text-slate-500">Xem thêm để cá nhân hoá →</span>
        )}
      </div>

      {/* Locations */}
      {tab === "recs" && (
        <>
          {locations.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">🗺️</p>
              <p className="text-sm">Chưa có gợi ý nào</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {locations.map(loc => <LocCard key={loc._id} loc={loc}/>)}
            </div>
          )}
          <button onClick={() => navigate("/explore")}
            className="w-full py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl
                       text-xs font-semibold text-gray-600 dark:text-slate-300
                       hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Khám phá thêm →
          </button>
        </>
      )}

      {/* Tours */}
      {tab === "tours" && (
        <>
          {tours.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">🗺️</p><p className="text-sm">Chưa có tour nào</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {tours.map(tour => <TourCard key={tour._id} tour={tour}/>)}
            </div>
          )}
          <button onClick={() => navigate("/tours")}
            className="w-full py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl
                       text-xs font-semibold text-gray-600 dark:text-slate-300
                       hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Xem tất cả tours →
          </button>
        </>
      )}

      {/* Profile */}
      {tab === "profile" && (
        <div className="space-y-5">
          {!hasProfile ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Chưa có dữ liệu hành vi</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Xem, lưu và đánh giá địa điểm để hệ thống học sở thích của bạn
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Dựa trên <strong>{profile.totalActions}</strong> tương tác trong 30 ngày gần nhất.
                  Điểm giảm dần theo thời gian — hành động gần đây có trọng số cao hơn.
                </p>
              </div>

              {(profile.topCategories?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                    Loại địa điểm yêu thích
                  </p>
                  <div className="space-y-2.5">
                    {profile.topCategories.slice(0,6).map(({category, score}) => (
                      <InterestBar key={category} label={CAT_LABEL[category]??category}
                        score={score} maxScore={maxCatScore} color="#3b82f6"/>
                    ))}
                  </div>
                </div>
              )}

              {(profile.topPrices?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                    Phân khúc giá ưa thích
                  </p>
                  <div className="space-y-2.5">
                    {profile.topPrices.map(({label, score}) => (
                      <InterestBar key={label} label={PRICE_LABEL[label]??label}
                        score={score} maxScore={maxPriceScore} color="#10b981"/>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-slate-800 pt-3">
                <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center">
                  Xem +1 · Lưu +3 · Đánh giá +5 · Lọc +2 · Fork tour +4
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}