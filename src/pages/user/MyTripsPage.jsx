import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import tripService from "../../services/trip.service";

const CAT_ICON = {
  food_tour:"🍜", sightseeing:"🏛️", adventure:"🧗",
  cultural:"🎭", relaxation:"🧘", shopping:"🛍️", mixed:"🗺️",
};

const STATUS_STYLE = {
  draft:          { label:"Draft",        bg:"bg-gray-100 dark:bg-slate-800",       text:"text-gray-500 dark:text-slate-400" },
  pending_review: { label:"In Review",    bg:"bg-amber-100 dark:bg-amber-400/20",   text:"text-amber-700 dark:text-amber-400" },
  approved:       { label:"Approved",     bg:"bg-emerald-100 dark:bg-emerald-400/20", text:"text-emerald-700 dark:text-emerald-400" },
  rejected:       { label:"Rejected",     bg:"bg-red-100 dark:bg-red-400/20",       text:"text-red-600 dark:text-red-400" },
};

function TripCard({ trip, onDelete }) {
  const navigate   = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const st  = STATUS_STYLE[trip.status] ?? STATUS_STYLE.draft;
  const stops = trip.itinerary?.reduce((t, d) => t + (d.stops?.length ?? 0), 0) ?? 0;
  const bookableStops = trip.itinerary?.reduce((t, d) =>
    t + (d.stops?.filter(s => s.location?.booking?.isBookable)?.length ?? 0), 0) ?? 0;
  const coverImg = trip.itinerary?.[0]?.stops?.[0]?.location?.images?.[0]?.url;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Xóa trip "${trip.title}"?`)) return;
    setDeleting(true);
    try { await onDelete(trip._id); }
    finally { setDeleting(false); }
  };

  return (
    <div
      onClick={() => navigate(`/trips/${trip._id}`)}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                 rounded-2xl overflow-hidden cursor-pointer group
                 hover:border-blue-300 dark:hover:border-blue-600
                 hover:shadow-lg hover:shadow-blue-50 dark:hover:shadow-blue-900/10
                 transition-all duration-200"
    >
      {/* Cover image */}
      <div className="relative h-40 bg-gradient-to-br from-blue-50 to-indigo-100
                      dark:from-slate-800 dark:to-slate-700 overflow-hidden">
        {coverImg
          ? <img src={coverImg} alt={trip.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
          : <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
              {CAT_ICON[trip.category] ?? "🗺️"}
            </div>
        }
        {/* Status badge */}
        <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
          {st.label}
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px]
                        font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {trip.duration?.days ?? 1}N{trip.duration?.nights ?? 0}Đ
        </div>
        {trip.forkedFrom && (
          <div className="absolute top-2 right-2 bg-purple-600/80 text-white text-[10px]
                          font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
            Forked
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="font-bold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1">
          {trip.title}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500 mb-3">
          <span>📍 {stops} địa điểm</span>
          {bookableStops > 0 && (
            <span className="text-blue-500 dark:text-blue-400 font-medium">
              · {bookableStops} có thể đặt
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/trips/${trip._id}`); }}
            className="flex-1 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400
                       border border-blue-200 dark:border-blue-500/30 rounded-xl
                       hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            Chỉnh sửa
          </button>
          {bookableStops > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/trips/${trip._id}?book=1`); }}
              className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600
                         hover:bg-emerald-700 rounded-xl transition-colors"
            >
              🗓️ Đặt ({bookableStops})
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="py-2 px-3 text-xs text-red-400 dark:text-red-500
                       hover:text-red-600 dark:hover:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-500/10
                       rounded-xl transition-colors disabled:opacity-40"
          >
            {deleting ? "..." : "🗑"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyTripsPage() {
  const navigate       = useNavigate();
  const [trips, setTrips]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const data = await tripService.getMyTrips();
      setTrips(data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const trip = await tripService.createTrip({
        title:    "Trip mới",
        category: "mixed",
        duration: { days: 3, nights: 2 },
        status:   "draft",
        itinerary: [],
      });
      navigate(`/trips/${trip._id}`);
    } catch (e) {
      alert(e.response?.data?.message ?? "Không thể tạo trip");
    } finally { setCreating(false); }
  };

  const handleDelete = async (id) => {
    await tripService.deleteTrip(id);
    setTrips(prev => prev.filter(t => t._id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-lg">Trip của tôi</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {trips.length} trip · Lên kế hoạch và đặt chỗ dễ dàng
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                       text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {creating ? "⏳" : "+"} Tạo trip mới
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="font-bold text-gray-900 dark:text-white text-lg mb-2">
              Chưa có trip nào
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Tạo trip đầu tiên, thêm địa điểm yêu thích và đặt chỗ trong một lần
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                         rounded-xl transition-colors disabled:opacity-50"
            >
              {creating ? "Đang tạo..." : "Tạo trip đầu tiên"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trips.map(trip => (
              <TripCard key={trip._id} trip={trip} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Explore templates */}
        {trips.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200
                          dark:border-blue-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Tìm cảm hứng?
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Fork từ các tour template đã được duyệt
              </p>
            </div>
            <button
              onClick={() => navigate("/tours")}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400
                         hover:underline whitespace-nowrap ml-4"
            >
              Xem templates →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}