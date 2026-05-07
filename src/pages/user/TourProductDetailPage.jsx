import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";

import {
  Globe, UtensilsCrossed, Hotel, Landmark,
  Coffee, Sparkles, ShoppingBag
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtVND  = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { weekday:"long", day:"2-digit", month:"2-digit", year:"numeric" }) : "—";
const fmtShort = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—";

const CAT_ICON  = [
  { key: "all",           label: "All",          icon: <Globe size={15} strokeWidth={1.5}/> },
  { key: "restaurant",    label: "Restaurants",  icon: <UtensilsCrossed size={15} strokeWidth={1.5}/> },
  { key: "hotel",         label: "Hotels",       icon: <Hotel size={15} strokeWidth={1.5}/> },
  { key: "tourist_spot",  label: "Sights",       icon: <Landmark size={15} strokeWidth={1.5}/> },
  { key: "cafe",          label: "Cafes",        icon: <Coffee size={15} strokeWidth={1.5}/> },
  { key: "entertainment", label: "Entertainment",icon: <Sparkles size={15} strokeWidth={1.5}/> },
  { key: "shopping",      label: "Shopping",     icon: <ShoppingBag size={15} strokeWidth={1.5}/> },
];
const TRANSPORT_LABEL = { walk:"🚶", motorbike:"🏍️", car:"🚗", bus:"🚌", taxi:"🚕", other:"🚌" };

// ── DeparturePicker — compact với month grouping + scroll ────────────────────
function DeparturePicker({ departures, selected, onSelect }) {
  const [openMonth, setOpenMonth] = useState(null);

  const upcoming = departures.filter(d => d.status !== "cancelled");
  if (upcoming.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
        <p className="text-sm text-gray-400 dark:text-slate-500">No upcoming departures</p>
      </div>
    );
  }

  // Group by month
  const grouped = upcoming.reduce((acc, dep) => {
    const d    = new Date(dep.departureDate);
    const key  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const label = d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = { label, items: [] };
    acc[key].items.push(dep);
    return acc;
  }, {});

  const months = Object.entries(grouped);

  // Auto-open month of selected dep or first month
  const defaultOpen = selected
    ? (() => { const d = new Date(selected.departureDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })()
    : months[0]?.[0];

  const activeMonth = openMonth ?? defaultOpen;

  return (
    <div className="space-y-2">
      {/* Month selector — horizontal scroll pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {months.map(([key, { label }]) => (
          <button key={key} onClick={() => setOpenMonth(key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
              ${activeMonth === key
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Dates for active month — max height + scroll */}
      {months.filter(([key]) => key === activeMonth).map(([key, { items }]) => (
        <div key={key} className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin
                                   scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
          {items.map(dep => {
            const available = dep.maxSlots - dep.bookedSlots - dep.heldSlots;
            const isFull    = available <= 0;
            const isSelected = selected?._id === dep._id;
            const d = new Date(dep.departureDate);

            return (
              <button key={dep._id} type="button"
                onClick={() => !isFull && onSelect(dep)}
                disabled={isFull}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all
                  ${isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                    : isFull
                      ? "border-gray-100 dark:border-slate-800 opacity-40 cursor-not-allowed"
                      : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Date badge */}
                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0
                      ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"}`}>
                      <span className="text-[10px] font-medium leading-none opacity-75">
                        {d.toLocaleDateString("vi-VN", { weekday: "short" })}
                      </span>
                      <span className="text-sm font-black leading-tight">{d.getDate()}</span>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                        {d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">
                        → {new Date(dep.returnDate).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit" })}
                        {dep.note && ` · ${dep.note}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {dep.priceOverride && (
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {fmtVND(dep.priceOverride)}
                      </p>
                    )}
                    <p className={`text-[10px] font-semibold mt-0.5 ${
                      isFull ? "text-red-500"
                      : available <= 3 ? "text-amber-500"
                      : "text-emerald-600 dark:text-emerald-400"}`}>
                      {isFull ? "Full" : available <= 3 ? `⚡${available} left` : `✓ ${available}`}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Selected</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Count */}
      <p className="text-[10px] text-gray-400 dark:text-slate-500 text-right">
        {upcoming.length} departure{upcoming.length > 1 ? "s" : ""} available
      </p>
    </div>
  );
}

// ── BookingPanel ──────────────────────────────────────────────────────────────
function BookingPanel({ tour, selectedDep, onBook }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [adults,   setAdults]   = useState(1);
  const [children, setChildren] = useState(0);

  if (!selectedDep) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
          👆 Select a departure date to view prices
        </p>
      </div>
    );
  }

  const pricePerPerson = selectedDep.priceOverride ?? tour.pricePerPerson;
  const childPrice     = selectedDep.childPriceOverride ?? tour.childPrice ?? pricePerPerson;
  const totalPrice     = pricePerPerson * adults + childPrice * children;
  const available      = selectedDep.maxSlots - selectedDep.bookedSlots - selectedDep.heldSlots;

  const handleBook = () => {
    if (!user) { navigate("/login"); return; }
    onBook({ departure: selectedDep, adults, children, totalPrice, pricePerPerson, childPrice });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-2xl font-black text-gray-900 dark:text-white">
          {fmtVND(pricePerPerson)}
          <span className="text-sm font-normal text-gray-400 dark:text-slate-500"> / adult</span>
        </p>
        {childPrice !== pricePerPerson && (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Children: {fmtVND(childPrice)}/child
          </p>
        )}
      </div>

      {/* Guest counter */}
      <div className="space-y-2">
        {[
          { label: "Adults", val: adults,   set: setAdults,   min: 1 },
          { label: "Children",    val: children, set: setChildren, min: 0 },
        ].map(({ label, val, set, min }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set(Math.max(min, val - 1))} disabled={val <= min}
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 flex items-center justify-center
                           text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800
                           disabled:opacity-30 transition-colors text-lg font-light">−</button>
              <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">{val}</span>
              <button type="button"
                onClick={() => { if (adults + children < available) set(val + 1); }}
                disabled={adults + children >= available}
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 flex items-center justify-center
                           text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800
                           disabled:opacity-30 transition-colors text-lg font-light">+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t border-gray-100 dark:border-slate-800 pt-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">
            {adults} Adults × {fmtVND(pricePerPerson)}
          </span>
          <span className="text-gray-700 dark:text-slate-300">{fmtVND(pricePerPerson * adults)}</span>
        </div>
        {children > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">
              {children} Children × {fmtVND(childPrice)}
            </span>
            <span className="text-gray-700 dark:text-slate-300">{fmtVND(childPrice * children)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1">
          <span className="text-gray-900 dark:text-white">Total</span>
          <span className="text-blue-600 dark:text-blue-400">{fmtVND(totalPrice)}</span>
        </div>
      </div>

      <button onClick={handleBook}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white
                   font-bold rounded-2xl transition-all text-sm shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
        {user ? "Book Now 🗺️" : "Login to Book Tour"}
      </button>

      <p className="text-xs text-center text-gray-400 dark:text-slate-500">
        Book a deposit of 30% · Free cancellation before 24h
      </p>
    </div>
  );
}

// ── BookingModal (inline, không dùng lại BookingModal chung vì khác flow) ────
function TourProductBookingModal({ tour, dep, bookingInfo, open, onClose }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [contact, setContact] = useState({ name: user?.name || "", phone: user?.phone || "", email: user?.email || "" });
  const [specialReq, setSpecialReq] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [step,     setStep]     = useState(0); // 0: form, 1: confirm

  useEffect(() => { if (open) { setStep(0); setError(""); } }, [open]);

  if (!open || !dep || !bookingInfo) return null;

  const { adults, children, totalPrice, pricePerPerson, childPrice } = bookingInfo;
  const depositRate  = 0.3;
  const depositAmount = Math.round(totalPrice * depositRate);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/bookings", {
        bookingType: "tour_product",
        contactName:  contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        tourProductDetails: {
          tourProductId: tour._id,
          departureId:   dep._id,
          adults, children, specialReq,
        },
      });
      onClose();
      navigate(`/booking/payment/${data.data.order._id}`);
    } catch (e) {
      setError(e.response?.data?.message || "Lỗi khi đặt tour");
    } finally { setLoading(false); }
  };

  const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl
                      max-h-[92vh] flex flex-col border dark:border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">🗺️ Book Tour</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{tour.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {step === 0 ? (
            <>
              {/* Trip summary */}
              <div className="bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/20 rounded-2xl p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-300">{fmtDate(dep.departureDate)}</p>
                <p className="text-blue-600 dark:text-blue-400">
                  👥 {adults} Adults{children > 0 ? ` · ${children} Children` : ""}
                  {" · "}
                  {tour.duration?.days}N{tour.duration?.nights}Đ
                </p>
                <p className="text-blue-700 dark:text-blue-300 font-bold">{fmtVND(totalPrice)}</p>
              </div>

              {/* Contact */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Contact Information</p>
                <input value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}
                  placeholder="Full Name *" className={inputCls}/>
                <input value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}
                  placeholder="Phone Number *" className={inputCls}/>
                <input value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}
                  placeholder="Email" className={inputCls}/>
                <textarea value={specialReq} onChange={e=>setSpecialReq(e.target.value)}
                  rows={2} placeholder="Special Requests (vegan diet, wheelchair, ...)"
                  className={`${inputCls} resize-none`}/>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
            </>
          ) : (
            // Confirm step
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-slate-400">Confirm Booking Information:</p>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 space-y-2 text-sm">
                {[
                  ["Tour",      tour.title],
                  ["Departure", fmtDate(dep.departureDate)],
                  ["Return",    fmtShort(dep.returnDate)],
                  ["Guests",    `${adults} Adults${children > 0 ? ` · ${children} Children` : ""}`],
                  ["Contact",   `${contact.name} · ${contact.phone}`],
                  ["Total Price", fmtVND(totalPrice)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-gray-500 dark:text-slate-400 shrink-0">{k}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right">{v}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-blue-600 dark:text-blue-400">
                  <span>Book a deposit of 30%</span>
                  <span>{fmtVND(depositAmount)}</span>
                </div>
              </div>

              {/* Meeting point */}
              {tour.meetingPoint?.address && (
                <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-xl px-4 py-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300 mb-0.5">📍 Meeting Point</p>
                  <p className="text-amber-700 dark:text-amber-400">{tour.meetingPoint.address}</p>
                  {tour.meetingPoint.note && <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{tour.meetingPoint.note}</p>}
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3 shrink-0">
          <button onClick={step === 0 ? onClose : () => setStep(0)}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400
                       rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {step === 0 ? (
            <button onClick={() => { if (!contact.name || !contact.phone) { setError("Please enter your name and phone number"); return; } setError(""); setStep(1); }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
              {loading ? "Processing…" : "Proceed to Payment 💳"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TourProductDetailPage() {
  const { id }     = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [tour,       setTour]       = useState(null);
  const [departures, setDepartures] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selDep,     setSelDep]     = useState(null);
  const [bookModal,  setBookModal]  = useState({ open: false, dep: null, info: null });
  const [activeDay,  setActiveDay]  = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/tour-products/${id}`);
        setTour(data.data.tour);
        setDepartures(data.data.departures || []);
        if (data.data.departures?.length > 0) {
          const avail = data.data.departures.find(d => d.status === "available");
          if (avail) setSelDep(avail);
        }
      } catch { navigate("/tours"); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-gray-400 dark:text-slate-500">Loading…</div>
    </div>
  );
  if (!tour) return null;

  const days   = tour.itinerary || [];
  const stops  = days.find(d => d.day === activeDay)?.stops || [];
  const allStops = days.flatMap(d => d.stops);
  const bookableStops = allStops.filter(s => s.location?.booking?.isBookable);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="relative h-72 sm:h-96 bg-gray-200 dark:bg-slate-800 overflow-hidden">
        {tour.coverImage?.url
          ? <img src={tour.coverImage.url} alt={tour.title} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🗺️</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Link to="/tours" className="text-white/70 hover:text-white text-sm mb-2 inline-block transition-colors">
            ← All Tours
          </Link>
          <h1 className="text-white font-black text-2xl sm:text-3xl leading-tight mb-2">{tour.title}</h1>
          <div className="flex items-center gap-3 flex-wrap text-sm text-white/80">
            <span>🏢 {tour.company?.name}</span>
            <span>🗓️ {tour.duration?.days}N{tour.duration?.nights}Đ</span>
            <span>📍 {allStops.length} locations</span>
            {departures.length > 0 && (
              <span className="bg-emerald-500/80 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {departures.filter(d=>d.status==="available").length} upcoming schedules
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── LEFT: Content ── */}
          <div className="flex-1 min-w-0">
            {/* Description */}
            {tour.description && (
              <div className="mb-6">
                <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{tour.description}</p>
              </div>
            )}

            {/* Includes / Excludes */}
            {(tour.includes?.length > 0 || tour.excludes?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {tour.includes?.length > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20 rounded-2xl p-4">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">✅ Included</p>
                    <ul className="space-y-1">
                      {tour.includes.map((item, i) => (
                        <li key={i} className="text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                          <span className="shrink-0">·</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tour.excludes?.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/20 rounded-2xl p-4">
                    <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-2">❌ Not Included</p>
                    <ul className="space-y-1">
                      {tour.excludes.map((item, i) => (
                        <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                          <span className="shrink-0">·</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Itinerary */}
            {days.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Detailed Itinerary</h2>

                {/* Day tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
                  {days.map(d => (
                    <button key={d.day} onClick={() => setActiveDay(d.day)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium shrink-0 border transition-colors
                        ${activeDay === d.day
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                        }`}>
                      Day {d.day}
                      {d.title && <span className="hidden sm:inline ml-1 opacity-75">– {d.title}</span>}
                    </button>
                  ))}
                </div>

                {/* Day header */}
                {days.find(d=>d.day===activeDay)?.title && (
                  <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4">
                    Day {activeDay}: {days.find(d=>d.day===activeDay).title}
                  </h3>
                )}

                {/* Stops */}
                <div className="space-y-0">
                  {stops.map((stop, idx) => {
                    const loc  = stop.location;
                    const img  = loc?.images?.find(i=>i.isPrimary)?.url || loc?.images?.[0]?.url;
                    const isLast = idx === stops.length - 1;

                    return (
                      <div key={stop._id || idx} className="flex gap-4">
                        {/* Timeline */}
                        <div className="flex flex-col items-center shrink-0 w-16">
                          {stop.startTime && (
                            <div className="bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400
                                            text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 whitespace-nowrap">
                              {stop.startTime}
                            </div>
                          )}
                          <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0 mt-1"/>
                          {!isLast && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-700 mt-1 min-h-8"/>}
                        </div>

                        {/* Card */}
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                                        rounded-2xl p-4 mb-4 hover:border-blue-200 dark:hover:border-blue-600/50 transition-colors">
                          <div className="flex gap-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                              {img
                                ? <img src={img} alt={loc?.name} className="w-full h-full object-cover"/>
                                : <div className="w-full h-full flex items-center justify-center text-xl">{CAT_ICON[loc?.category]||"📍"}</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{loc?.name || "—"}</p>
                                  <p className="text-xs text-gray-400 dark:text-slate-500">{loc?.address?.city}</p>
                                </div>
                                {loc?.booking?.isBookable && (
                                  <Link to={`/locations/${loc._id}`}
                                    className="shrink-0 text-[10px] bg-blue-100 dark:bg-blue-500/20
                                               text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full
                                               font-medium hover:bg-blue-200 transition-colors whitespace-nowrap">
                                    Book →
                                  </Link>
                                )}
                              </div>
                              {stop.note && (
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">{stop.note}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                                {stop.duration > 0 && <span>🕐 {stop.duration}ph</span>}
                                {loc?.rating?.finalScore > 0 && <span>⭐ {loc.rating.finalScore.toFixed(1)}</span>}
                              </div>
                            </div>
                          </div>
                          {/* Transport to next */}
                          {!isLast && stop.transportTo && (
                            <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                              <span className="text-xs text-gray-400 dark:text-slate-500">
                                {TRANSPORT_LABEL[stop.transportTo]} Arrive to next stop.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bookable stops hint */}
            {bookableStops.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/20 rounded-2xl p-4 mb-6">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  💡 {bookableStops.length} locations in the tour can be booked separately
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Click "Book →" in the itinerary to book each location individually
                </p>
              </div>
            )}

            {/* Meeting point */}
            {tour.meetingPoint?.address && (
              <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">📍 Meeting Point</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">{tour.meetingPoint.address}</p>
                {tour.meetingPoint.note && <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{tour.meetingPoint.note}</p>}
              </div>
            )}
          </div>

          {/* ── RIGHT: Booking ── */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-20 space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Select Departure Time</h3>
              <DeparturePicker departures={departures} selected={selDep} onSelect={setSelDep}/>
              <BookingPanel tour={tour} selectedDep={selDep}
                onBook={(info) => setBookModal({ open: true, dep: selDep, info })}/>
            </div>
          </div>
        </div>
      </div>

      <TourProductBookingModal
        tour={tour}
        dep={bookModal.dep}
        bookingInfo={bookModal.info}
        open={bookModal.open}
        onClose={() => setBookModal({ open: false, dep: null, info: null })}
      />
    </div>
  );
}