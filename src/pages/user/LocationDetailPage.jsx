import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import userAppService from "../../services/userApp.service";
import useTracking from "../../hooks/useTracking";
import ClaimLocationModal from "../../components/modals/ClaimLocationModal";
import BookingModal       from "../../components/modals/BookingModal";
import MapView            from "../../components/ui/MapView";
import { fmtDistance, haversineDistance } from "../../hooks/useGeolocation";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

// ─── Star rating display ──────────────────────────────────────────────────────
function Stars({ rating, size = "sm" }) {
  const dim = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`${dim} ${i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-slate-700 fill-current"}`}
             viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

// ─── Star picker ──────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className={`text-3xl transition-transform hover:scale-110
                      ${s <= (hover || value) ? "text-amber-400" : "text-gray-300 dark:text-slate-600"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Map Modal ────────────────────────────────────────────────────────────────
function MapModal({ location, onClose }) {
  if (!location) return null;
  const [lng, lat] = location.coordinates?.coordinates || [105.8412, 21.0245];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{location.name}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{location.address?.full}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Mở trong Google Maps →
            </a>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none
                         text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800">
              ×
            </button>
          </div>
        </div>
        <div style={{ height: "400px" }}>
          <MapView
            center={{ lat, lng }}
            zoom={15}
            height="100%"
            showUserBtn={true}
            markers={[{
              lat, lng,
              title:       location.name,
              description: location.address?.full,
            }]}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
// ─── Hotel amenities section ──────────────────────────────────────────────────
const AMENITY_CATEGORY_ICON = {
  pool:"🏊", fitness:"🏋️", spa:"💆", dining:"🍽️",
  transport:"🚗", service:"🛎️", business:"💼",
  entertainment:"🎬", other:"✨",
};

function HotelAmenitiesSection({ amenities }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? amenities : amenities.slice(0, 10);
  const grouped = visible.reduce((acc, a) => {
    const cat = a.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200
                    dark:border-slate-800 rounded-2xl p-5">
      <h2 className="font-bold text-gray-900 dark:text-white mb-4">
        What this place offers
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {visible.map((a, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-base shrink-0">{a.icon || AMENITY_CATEGORY_ICON[a.category] || "✨"}</span>
            <span className="text-sm text-gray-700 dark:text-slate-300">
              {a.name}
              {!a.isFree && <span className="text-gray-400 text-xs ml-1">(paid)</span>}
            </span>
          </div>
        ))}
      </div>
      {amenities.length > 10 && (
        <button onClick={() => setShowAll(!showAll)}
          className="mt-4 text-sm font-semibold text-gray-900 dark:text-white underline
                     underline-offset-2 hover:text-gray-600">
          {showAll ? "Show less" : `Show all ${amenities.length} amenities`}
        </button>
      )}
    </div>
  );
}

// ─── Rooms section ────────────────────────────────────────────────────────────
const BED_LABEL = {
  king:"1 king bed", queen:"1 queen bed", double:"1 double bed",
  twin:"2 single beds", single:"1 single bed", bunk:"Bunk bed",
  sofa_bed:"Sofa bed", tatami:"Tatami",
};
const VIEW_LABEL = {
  city:"City view", sea:"Sea view", pool:"Pool view",
  garden:"Garden view", mountain:"Mountain view", courtyard:"Courtyard view", none:"",
};
const CANCEL_LABEL = {
  flexible:       { text:"Free cancellation", color:"text-emerald-600 dark:text-emerald-400" },
  moderate:       { text:"Free cancellation 72h before", color:"text-emerald-600 dark:text-emerald-400" },
  strict:         { text:"Free cancellation 7 days before", color:"text-amber-600 dark:text-amber-400" },
  non_refundable: { text:"Non-refundable", color:"text-red-500 dark:text-red-400" },
};

function RoomsSection({ locationId, onBook }) {
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/units/public", { params: { locationId, unitType:"room", includeInactive:"false" } })
      .then(r => {
        const units = r.data.data ?? [];
        // Group by roomType, keep track of available count
        const grouped = {};
        units.forEach(u => {
          const key = u.roomType || "standard";
          if (!grouped[key]) {
            grouped[key] = { ...u, totalCount: 0, availableCount: 0 };
          }
          grouped[key].totalCount++;
          if (u.status === "available") grouped[key].availableCount++;
        });
        setRooms(Object.values(grouped));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locationId]);

  if (loading) return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200
                    dark:border-slate-800 rounded-2xl p-5 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-4"/>
      {[1,2].map(i => <div key={i} className="h-36 bg-gray-100 dark:bg-slate-800 rounded-xl mb-3"/>)}
    </div>
  );
  if (!rooms.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200
                    dark:border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-800">
        <h2 className="font-bold text-gray-900 dark:text-white">Available rooms</h2>
      </div>

      {rooms.map((room, i) => {
        const img     = room.images?.find(x => x.isPrimary)?.url || room.images?.[0]?.url;
        const cancel  = CANCEL_LABEL[room.cancellationPolicy];
        const isLow   = room.availableCount > 0 && room.availableCount <= 3;
        const isSoldOut = room.availableCount === 0;
        const discount  = room.originalPrice > 0 && room.originalPrice > room.pricePerUnit
          ? Math.round((1 - room.pricePerUnit / room.originalPrice) * 100)
          : null;

        return (
          <div key={i}
            className={`flex flex-col sm:flex-row gap-0
                        ${i > 0 ? "border-t border-gray-100 dark:border-slate-800" : ""}`}>

            {/* Room image + type */}
            <div className="p-4 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-slate-800">
              {img ? (
                <img src={img} alt={room.roomType}
                  className="w-full h-28 sm:h-32 object-cover rounded-xl mb-3"/>
              ) : (
                <div className="w-full h-28 sm:h-32 bg-gray-100 dark:bg-slate-800
                                rounded-xl mb-3 flex items-center justify-center text-3xl">
                  🛏️
                </div>
              )}
              <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">
                {room.roomType} room
              </p>
              {room.roomSize && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  📐 {room.roomSize} m²
                </p>
              )}
              {BED_LABEL[room.bedType] && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  🛏 {BED_LABEL[room.bedType]}
                </p>
              )}
              {VIEW_LABEL[room.viewType] && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  🪟 {VIEW_LABEL[room.viewType]}
                </p>
              )}
              {/* Per-room amenities */}
              {room.amenities?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {room.amenities.slice(0, 4).map((a, j) => (
                    <p key={j} className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                      <span className="text-xs">{a.icon || "·"}</span> {a.name}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Room options */}
            <div className="flex-1 p-4 sm:p-5">
              {/* Guests */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500
                              dark:text-slate-400 mb-3">
                <span>👥</span>
                <span>Up to {room.capacity} guests</span>
              </div>

              {/* Options list */}
              <div className="space-y-3">
                {/* Option: without breakfast */}
                <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                    {room.roomType?.charAt(0).toUpperCase()+room.roomType?.slice(1)} — Room only
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {room.includesBreakfast ? "Without breakfast" : "Room only"}
                  </p>

                  {/* Features */}
                  <div className="space-y-1 mb-3">
                    {cancel && (
                      <p className={`text-xs flex items-center gap-1.5 ${cancel.color}`}>
                        <span>✓</span> {cancel.text}
                      </p>
                    )}
                    {room.includesBreakfast && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span>🍳</span> Breakfast included
                      </p>
                    )}
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-end justify-between">
                    <div>
                      {discount && room.originalPrice > 0 && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-gray-400 line-through">
                            ₫{room.originalPrice.toLocaleString("en-US")}
                          </span>
                          <span className="text-xs font-bold text-orange-500
                                           bg-orange-100 dark:bg-orange-500/15
                                           px-1.5 py-0.5 rounded">
                            -{discount}%
                          </span>
                        </div>
                      )}
                      <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                        ₫{(room.pricePerUnit || 0).toLocaleString("en-US")}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">/night · excl. taxes</p>
                    </div>

                    <div className="text-right">
                      {isLow && !isSoldOut && (
                        <p className="text-xs text-red-500 font-semibold mb-1">
                          Only {room.availableCount} room{room.availableCount>1?"s":""} left!
                        </p>
                      )}
                      {isSoldOut ? (
                        <p className="text-sm text-gray-400 font-medium">Sold out</p>
                      ) : (
                        <button onClick={() => onBook(room.roomType)}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white
                                     text-sm font-semibold rounded-xl transition-colors">
                          Book
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Option: with breakfast (if hotel-level or not included) */}
                {!room.includesBreakfast && (
                  <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-3
                                  bg-emerald-50/40 dark:bg-emerald-500/5">
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                      {room.roomType?.charAt(0).toUpperCase()+room.roomType?.slice(1)} — With breakfast
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Breakfast for 2 guests
                    </p>
                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span>🍳</span> Breakfast included
                      </p>
                      {cancel && (
                        <p className={`text-xs flex items-center gap-1.5 ${cancel.color}`}>
                          <span>✓</span> {cancel.text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                          ₫{Math.round((room.pricePerUnit || 0) * 1.15).toLocaleString("en-US")}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">/night · excl. taxes</p>
                      </div>
                      {!isSoldOut && (
                        <button onClick={() => onBook(room.roomType)}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white
                                     text-sm font-semibold rounded-xl transition-colors">
                          Book
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Policy card ──────────────────────────────────────────────────────────────
function PolicyCard({ location }) {
  const hi  = location.hotelInfo  || {};
  const pol = location.policy     || {};

  const POLICY_MAP = {
    smoking: {
      allowed:      { icon:"🚬", label:"Smoking allowed" },
      outdoor_only: { icon:"🚬", label:"Outdoor smoking only" },
      not_allowed:  { icon:"🚭", label:"No smoking" },
    },
    pets: {
      allowed:    { icon:"🐾", label:"Pets allowed" },
      on_request: { icon:"🐾", label:"Pets on request" },
      not_allowed:{ icon:"🚫", label:"No pets" },
    },
    children: {
      allowed:     { icon:"👶", label:"All ages welcome" },
      age_12_up:   { icon:"🧒", label:"Age 12+" },
      not_allowed: { icon:"🚫", label:"Adults only" },
    },
  };

  const items = [];
  if (hi.checkInTime)  items.push({ icon:"🔑", label:`Check-in: from ${hi.checkInTime}` });
  if (hi.checkOutTime) items.push({ icon:"🚪", label:`Check-out: by ${hi.checkOutTime}` });
  if (pol.cancellation) items.push({
    icon: pol.cancellation === "non_refundable" ? "⚠️" : "✅",
    label: CANCEL_LABEL[pol.cancellation]?.text || pol.cancellation,
  });
  if (pol.smoking  && POLICY_MAP.smoking[pol.smoking])   items.push(POLICY_MAP.smoking[pol.smoking]);
  if (pol.pets     && POLICY_MAP.pets[pol.pets])         items.push(POLICY_MAP.pets[pol.pets]);
  if (pol.children && POLICY_MAP.children[pol.children]) items.push(POLICY_MAP.children[pol.children]);

  if (!items.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200
                    dark:border-slate-800 rounded-2xl p-5">
      <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
        House rules
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-base shrink-0">{item.icon}</span>
            <span className="text-sm text-gray-700 dark:text-slate-300">{item.label}</span>
          </div>
        ))}
        {pol.customNotes && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 pt-2
                        border-t border-gray-100 dark:border-slate-800">
            {pol.customNotes}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LocationDetailPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { trackView, trackSave, trackUnsave, trackReview } = useTracking();

  const [location, setLocation]   = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [isFav,    setIsFav]      = useState(false);
  const [showMap,      setShowMap]     = useState(false);
  const [showClaim,    setShowClaim]   = useState(false);
  const [showBook,     setShowBook]    = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [distanceKm,   setDistanceKm] = useState(null); // distance from user to location
  const [userBooking,  setUserBooking] = useState(null); // existing active booking

  // Reviews
  const [reviews,  setReviews]    = useState([]);
  const [revSummary, setRevSummary] = useState(null);
  const [revLoading, setRevLoading] = useState(false);
  const [revPage,  setRevPage]    = useState(1);
  const [revTotal, setRevTotal]   = useState(0);
  const [revPages, setRevPages]   = useState(1);
  const [revSort,  setRevSort]    = useState("newest");

  // Write review
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [myRating, setMyRating]   = useState(0);
  const [myContent, setMyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewed, setReviewed]   = useState(false);

  // Active image
  const [activeImg, setActiveImg] = useState(0);

  // Fetch location
  useEffect(() => {
    api.get(`/locations/${id}`)
      .then(r => {
        const loc = r.data.data.location;
        setLocation(loc);
        setLoading(false);
        // Track view behavior
        trackView(id, loc.category, loc.priceRange?.label);
        // Check if user has active booking for this location
        if (user) {
          api.get("/bookings/my", { params: { limit: 50 } })
            .then(res => {
              const active = res.data.data.orders?.find(o =>
                (o.location?._id || o.location) === id &&
                ["pending","confirmed"].includes(o.status)
              );
              setUserBooking(active || null);
            }).catch(() => {});
        }
      })
      .catch(() => { setLoading(false); navigate("/explore"); });
  }, [id]);

  // Fetch reviews
  const fetchReviews = async (p = 1) => {
    setRevLoading(true);
    try {
      const result = await userAppService.getReviews(id, { page: p, limit: 5, sort: revSort });
      if (p === 1) setReviews(result.reviews);
      else setReviews(prev => [...prev, ...result.reviews]);
      setRevSummary(result.summary);
      setRevTotal(result.pagination.total);
      setRevPages(result.pagination.totalPages);
      setRevPage(p);
    } catch(e){ console.error(e); }
    finally { setRevLoading(false); }
  };

  useEffect(() => { if (id) { setReviews([]); fetchReviews(1); } }, [id, revSort]);

  // Check favorite
  useEffect(() => {
    if (!user || !id) return;
    userAppService.checkFavorite(id).then(setIsFav).catch(() => {});
  }, [user, id]);

  const handleFavorite = async () => {
    if (!user) { navigate("/login"); return; }
    const result = await userAppService.toggleFavorite(id);
    setIsFav(result.isFavorite);
    if (result.isFavorite) {
      trackSave(id, location?.category, location?.priceRange?.label);
    } else {
      trackUnsave(id);
    }
  };

  const handleSubmitReview = async () => {
    if (!myRating)                    { setReviewError("Please select a rating"); return; }
    if (myContent.trim().length < 10) { setReviewError("Review must be at least 10 characters"); return; }
    setSubmitting(true); setReviewError("");
    try {
      await userAppService.writeReview(id, { rating: myRating, content: myContent });
      trackReview(id, location?.category);
      setReviewed(true);
      setShowReviewForm(false);
      setMyRating(0); setMyContent("");
      fetchReviews(1);
    } catch(e) {
      setReviewError(e.response?.data?.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="animate-pulse text-blue-600">Loading...</div>
    </div>
  );

  if (!location) return null;

  const images      = location.images || [];
  const atReviews   = location.verifiedBy || [];
  const openHours   = location.openingHours;
  const isOpen      = true; // simplified

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* NAV */}
      <div className="max-w-6xl mx-auto px-5 py-5">
        {/* Breadcrumb + actions row */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 min-w-0">
            <Link to="/explore" className="hover:text-gray-600 dark:hover:text-slate-300 shrink-0">Home</Link>
            <span>›</span>
            <span className="capitalize shrink-0">{location.category?.replace("_"," ")}</span>
            <span>›</span>
            <span className="text-gray-700 dark:text-slate-300 font-medium truncate">{location.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleFavorite}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
                          border transition-all
                          ${isFav
                            ? "bg-red-50 dark:bg-red-500/15 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400"
                            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300"}`}>
              {isFav ? "❤️ Saved" : "🤍 Save"}
            </button>
            {user?.role === "company" && location && !location.managedBy && (
              <button onClick={() => setShowClaim(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
                           border bg-blue-50 dark:bg-blue-600/15 border-blue-300 dark:border-blue-500/40
                           text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all">
                📋 Claim
              </button>
            )}
            {location?.booking?.isBookable === true && user && (
              userBooking ? (
                <button onClick={() => navigate("/profile/bookings")}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold
                             bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400
                             border border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-200 transition-all">
                  ✅ Đã đặt
                </button>
              ) : (
                <button onClick={() => setShowBook(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold
                             bg-blue-600 hover:bg-blue-700 text-white transition-all">
                  📅 Đặt ngay
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ── LEFT (main content) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Image gallery */}
            <div className="rounded-2xl overflow-hidden">
              {images.length === 0 ? (
                <div className="h-72 bg-gray-200 dark:bg-slate-800 flex items-center justify-center text-5xl">🏞️</div>
              ) : (
                <div>
                  <div className="relative h-72">
                    <img src={images[activeImg]?.url} alt={location.name}
                      className="w-full h-full object-cover"/>
                    {/* Category badge */}
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                        {location.category?.replace("_"," ")}
                      </span>
                    </div>
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {images.map((img, i) => (
                        <button key={i} onClick={() => setActiveImg(i)}
                          className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all
                                      ${activeImg === i ? "border-blue-500" : "border-transparent"}`}>
                          <img src={img.url} alt="" className="w-full h-full object-cover"/>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title + rating */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">{location.name}</h1>
                {atReviews.length > 0 && (
                  <span className="shrink-0 bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400
                                   text-xs font-semibold px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-500/30">
                    ✅ AT Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Stars rating={Math.round(location.rating?.finalScore || 0)} size="md"/>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {location.rating?.finalScore?.toFixed(1) || "0.0"}
                  </span>
                  <span className="text-gray-500 dark:text-slate-400 text-sm">
                    ({location.rating?.totalReviews || 0} reviews)
                  </span>
                </div>
                <span className="text-gray-300 dark:text-slate-700">·</span>
                <span className="text-gray-500 dark:text-slate-400 text-sm capitalize">
                  📍 {location.address?.city || location.address?.full}
                </span>
              </div>
            </div>

            {/* Description */}
            {location.description && (
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white mb-2">About this place</h2>
                <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                  {location.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {location.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {location.tags.map(tag => {
                  const label = typeof tag === "string" ? tag : (tag?.name ?? tag?._id);
                  const key   = typeof tag === "string" ? tag : (tag?._id ?? tag);
                  return (
                    <span key={key}
                      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                                 text-gray-600 dark:text-slate-300 text-sm px-4 py-1.5 rounded-full">
                      {label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* ── Hotel highlights ── */}
            {location.hotelInfo?.highlights?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-gray-200
                              dark:border-slate-800 rounded-2xl p-5">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4">
                  Why guests love it
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {location.hotelInfo.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-500/20
                                      flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-teal-600 dark:text-teal-400" fill="none"
                          stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-slate-300">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Hotel-wide amenities ── */}
            {location.hotelInfo?.amenities?.length > 0 && (
              <HotelAmenitiesSection amenities={location.hotelInfo.amenities}/>
            )}

            {/* ── Available rooms ── (hotel only, if bookable) */}
            {location.category === "hotel" && location.booking?.isBookable && (
              <RoomsSection locationId={location._id} onBook={(roomType) => {
                setSelectedRoomType(roomType || null);
                setShowBook(true);
              }}/>
            )}

            {/* AT Reviews */}
            {atReviews.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">Approved Team Reviews</h2>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                      Verified insights from travel experts
                    </p>
                  </div>
                  <span className="text-2xl">✅</span>
                </div>
                <div className="space-y-4">
                  {atReviews.map((r, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-600/20
                                          flex items-center justify-center text-teal-600 dark:text-teal-400
                                          font-bold text-sm shrink-0">
                            {r.member?.name?.[0]?.toUpperCase() || "AT"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                              {r.member?.name || "Approved Team Member"}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              Trust Score: {r.member?.trustScore || 0}/100
                            </p>
                          </div>
                        </div>
                        {r.rating && <Stars rating={r.rating} size="sm"/>}
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed italic">
                        "{r.note}"
                      </p>
                      {r.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.tags.map(t => (
                            <span key={t} className="text-[10px] bg-teal-100 dark:bg-teal-500/20
                                                     text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Community Reviews
                  {revSummary?.total > 0 && (
                    <span className="text-gray-400 dark:text-slate-500 font-normal text-sm ml-2">
                      ({revSummary.total})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  <select value={revSort} onChange={e => setRevSort(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               text-gray-600 dark:text-slate-300 rounded-lg px-2 py-1.5
                               focus:outline-none transition-all">
                    <option value="newest">Newest</option>
                    <option value="highest">Highest</option>
                    <option value="lowest">Lowest</option>
                  </select>
                </div>
              </div>

              {/* Rating summary */}
              {revSummary?.total > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                                rounded-2xl p-4 mb-4 flex items-center gap-6">
                  <div className="text-center shrink-0">
                    <p className="text-4xl font-black text-amber-400">{revSummary.avg?.toFixed(1)}</p>
                    <Stars rating={Math.round(revSummary.avg)} size="sm"/>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{revSummary.total} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {revSummary.distribution?.map(({ star, count, pct }) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-slate-400 w-3 shrink-0">{star}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width:`${pct}%` }}/>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-slate-500 w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Write review button */}
              {user && !reviewed && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)}
                  className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700
                             text-gray-500 dark:text-slate-400 text-sm font-medium
                             hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400
                             transition-all">
                  ✍️ Write a review
                </button>
              )}

              {reviewed && (
                <div className="mb-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30
                                rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  ✅ Your review has been submitted!
                </div>
              )}

              {/* Review form */}
              {showReviewForm && (
                <div className="mb-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                                rounded-2xl p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Your Review</h3>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Rating</p>
                    <StarPicker value={myRating} onChange={setMyRating}/>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Your experience</p>
                    <textarea value={myContent} onChange={e => setMyContent(e.target.value)}
                      rows={4} placeholder="Share your experience, tips, what you liked..."
                      className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                                 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm resize-none
                                 placeholder-gray-400 dark:placeholder-slate-500
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"/>
                    <p className={`text-xs mt-1 ${myContent.length < 10 ? "text-red-400" : "text-gray-400 dark:text-slate-500"}`}>
                      {myContent.length} / 10 min
                    </p>
                  </div>
                  {reviewError && (
                    <p className="text-sm text-red-500">{reviewError}</p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setShowReviewForm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700
                                 text-gray-600 dark:text-slate-400 text-sm font-medium
                                 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSubmitReview} disabled={submitting}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white
                                 text-sm font-semibold transition-colors disabled:opacity-60">
                      {submitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </div>
              )}

              {/* Reviews list */}
              {revLoading && reviews.length === 0 ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                                           rounded-xl p-4 animate-pulse space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/3"/>
                      <div className="h-3 bg-gray-100 dark:bg-slate-800/60 rounded w-full"/>
                      <div className="h-3 bg-gray-100 dark:bg-slate-800/60 rounded w-2/3"/>
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                  <p className="text-3xl mb-2">💬</p>
                  Be the first to review this place!
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center
                                      justify-center text-gray-500 dark:text-slate-400 font-semibold text-sm shrink-0">
                        {r.user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {r.user?.name || "User"}
                          </p>
                          <Stars rating={r.rating} size="sm"/>
                        </div>
                        <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">{r.content}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{fmtDate(r.createdAt)}</p>
                      </div>
                    </div>
                  ))}

                  {/* Load more */}
                  {revPage < revPages && (
                    <button onClick={() => fetchReviews(revPage + 1)} disabled={revLoading}
                      className="w-full py-2.5 text-sm text-blue-600 dark:text-blue-400 font-medium
                                 border border-blue-200 dark:border-blue-500/40 rounded-xl
                                 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50">
                      {revLoading ? "Loading..." : `Load more reviews (${revTotal - reviews.length} remaining)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="space-y-4">
            {/* Visitor info card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Visitor Information</h3>
              <div className="space-y-3.5">
                {location.address?.full && (
                  <div className="flex gap-3">
                    <span className="text-gray-400 text-lg shrink-0">📍</span>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-0.5">Address</p>
                      <p className="text-sm text-gray-700 dark:text-slate-300">{location.address.full}</p>
                    </div>
                  </div>
                )}

                {location.priceRange?.label && (
                  <div className="flex gap-3">
                    <span className="text-gray-400 text-lg shrink-0">💰</span>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-0.5">Price Range</p>
                      <p className="text-sm text-gray-700 dark:text-slate-300 capitalize">
                        {location.priceRange.label}
                        {location.priceRange.min > 0 && ` · ${location.priceRange.min.toLocaleString()}đ`}
                        {location.priceRange.max > 0 && ` – ${location.priceRange.max.toLocaleString()}đ`}
                      </p>
                    </div>
                  </div>
                )}

                {location.openingHours && (() => {
                  const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
                  const dayLabels = { monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun" };
                  const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                  const todayHours = location.openingHours[today];
                  const isOpen = todayHours && !todayHours.closed;
                  return (
                    <div className="flex gap-3">
                      <span className="text-gray-400 text-lg shrink-0">🕐</span>
                      <div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-0.5">Hours</p>
                        {isOpen ? (
                          <p className="text-sm text-gray-700 dark:text-slate-300">
                            Today: {todayHours.open} – {todayHours.close}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-slate-400">Closed today</p>
                        )}
                        <span className={`text-xs font-semibold ${isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                          {isOpen ? "OPEN NOW" : "CLOSED"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {location.contact?.phone && (
                  <div className="flex gap-3">
                    <span className="text-gray-400 text-lg shrink-0">📞</span>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-0.5">Phone</p>
                      <a href={`tel:${location.contact.phone}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {location.contact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {location.contact?.website && (
                  <div className="flex gap-3">
                    <span className="text-gray-400 text-lg shrink-0">🌐</span>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-0.5">Website</p>
                      <a href={location.contact.website} target="_blank" rel="noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block">
                        {location.contact.website.replace(/https?:\/\//, "")}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Map */}
              {(() => {
                const [lng, lat] = location.coordinates?.coordinates || [0, 0];
                const hasCoords  = lng !== 0 || lat !== 0;
                return (
                  <div className="mt-4">
                    {/* Distance badge */}
                    {distanceKm !== null && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-blue-600
                                      dark:text-blue-400 font-medium">
                        <span>📍</span>
                        <span>Cách bạn {fmtDistance(distanceKm)}</span>
                      </div>
                    )}
                    <div className="rounded-xl overflow-hidden border border-gray-200
                                    dark:border-slate-700 h-52">
                      {hasCoords ? (
                        <MapView
                          center={{ lat, lng }}
                          zoom={15}
                          height="100%"
                          showUserBtn={true}
                          onDistanceCalc={setDistanceKm}
                          markers={[{
                            lat, lng,
                            title:       location.name,
                            description: location.address?.full,
                            img:         location.images?.find(i=>i.isPrimary)?.url ?? location.images?.[0]?.url,
                          }]}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-slate-800 flex flex-col
                                        items-center justify-center text-gray-400 dark:text-slate-500">
                          <span className="text-3xl mb-1">🗺️</span>
                          <p className="text-xs">Chưa có tọa độ</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Policy */}
            {(location.policy || location.hotelInfo?.checkInTime) && (
              <PolicyCard location={location}/>
            )}

            {/* Quick stats */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:"Views",     value: (location.stats?.detailViews || 0).toLocaleString(), icon:"👁️" },
                  { label:"Reviews",   value: location.rating?.totalReviews || 0,               icon:"💬" },
                  { label:"AT Reviews",value: atReviews.length,                                 icon:"✅" },
                  { label:"Saves",     value: "—",                                              icon:"❤️" },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-center">
                    <span className="text-base">{icon}</span>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">{value}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMap && (
        <MapModal location={location} onClose={() => setShowMap(false)}/>
      )}
      <ClaimLocationModal open={showClaim} locationId={location?._id}
        locationName={location?.name} onClose={() => setShowClaim(false)}/>
      <BookingModal open={showBook} location={location} onClose={() => setShowBook(false)}
        prefillRoomType={selectedRoomType}/>
    </div>
  );
}