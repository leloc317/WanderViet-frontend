import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";

// ── Helpers ───────────────────────────────────────────────────────────────────
const CAT_ICON = {
  hotel: "🏨", restaurant: "🍽️", cafe: "☕",
  tourist_spot: "🏛️", entertainment: "🎡", shopping: "🛍️", other: "📍",
};
const TYPE_LABEL = {
  hotel: "Hotel", restaurant: "Restaurant", entertainment: "Entertainment", tour: "Tour",
};
const ROOM_TYPE_OPTS = [
  { value: "",         label: "Any room"  },
  { value: "standard", label: "Standard"  },
  { value: "deluxe",   label: "Deluxe"    },
  { value: "suite",    label: "Suite"     },
  { value: "vip",      label: "VIP"       },
];
const today    = () => new Date().toISOString().split("T")[0];
const addDays  = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; };
const diffDays = (a, b) => a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)) : 0;
const fmtVND   = (n) => n > 0 ? `₫${Number(n).toLocaleString("en-US")}` : null;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── ChecklistItem ─────────────────────────────────────────────────────────────
function ChecklistItem({ stop, day, checked, onToggle }) {
  const loc = stop.location;
  const img = loc?.images?.find(i => i.isPrimary)?.url || loc?.images?.[0]?.url;
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none
        ${checked
          ? "border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10"
          : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
        }`}
    >
      <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
        {img ? <img src={img} alt="" className="w-full h-full object-cover"/>
             : <div className="w-full h-full flex items-center justify-center text-xl">{CAT_ICON[loc?.category] ?? "📍"}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{loc?.name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {stop.dayEnd && stop.dayEnd > day ? `Day ${day}–${stop.dayEnd}` : `Day ${day}`}
          {" · "}{TYPE_LABEL[loc?.booking?.bookingType] ?? loc?.category}
          {stop.startTime && ` · ${stop.startTime}`}
        </p>
      </div>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
        ${checked ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-slate-600"}`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        )}
      </div>
    </div>
  );
}

// ── InlineBookingStep ─────────────────────────────────────────────────────────
function InlineBookingStep({ stop, tour, stepIdx, totalSteps, onBooked, onSkip, onClose }) {
  const { user } = useAuth();
  const loc      = stop.location;
  const bookingType = loc?.booking?.bookingType || "restaurant";
  const img      = loc?.images?.find(i => i.isPrimary)?.url || loc?.images?.[0]?.url;

  // Compute hotel dates from stop.day / stop.dayEnd
  const tripStart   = today();
  const tripEndDate = tour.duration?.days ? addDays(tripStart, tour.duration.days - 1) : addDays(tripStart, 3);

  // Hotel: checkIn = day the hotel first appears, checkOut = day after last appearance
  const hotelCheckIn  = stop.day     ? addDays(tripStart, stop.day - 1)     : tripStart;
  const hotelCheckOut = stop.dayEnd  ? addDays(tripStart, stop.dayEnd)       // day AFTER last night
                      : tour.duration?.days ? addDays(tripStart, tour.duration.days - 1)
                      : addDays(tripStart, 1);
  const hotelNights   = diffDays(hotelCheckIn, hotelCheckOut) || 1;

  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [slotInfo,      setSlotInfo]      = useState(null);
  const [roomAvail,     setRoomAvail]     = useState(null);
  const [roomLoading,   setRoomLoading]   = useState(false);

  const [contact, setContact] = useState({
    name: user?.name || "", phone: user?.phone || "", email: user?.email || "",
  });
  const [restaurant, setRestaurant] = useState({
    date: stop.startTime ? tripStart : today(), time: stop.startTime || "12:00",
    partySize: 2, seatingPref: "no_preference", specialReq: "",
  });
  const [hotel, setHotel] = useState({
    checkIn: hotelCheckIn, checkOut: hotelCheckOut,
    nights: hotelNights,
    rooms: 1, roomType: "", adults: 2, children: 0, specialReq: "",
  });
  const [ent, setEnt] = useState({
    date: tripStart, time: stop.startTime || "", ticketType: "", quantity: 1, specialReq: "",
  });

  // Reset on stop change
  useEffect(() => { setError(""); setSlotInfo(null); setRoomAvail(null); }, [stop._id]);

  // Check slot availability
  useEffect(() => {
    if (!loc?._id) return;
    const date = bookingType === "hotel" ? hotel.checkIn
               : bookingType === "restaurant" ? restaurant.date
               : ent.date;
    if (!date) return;
    api.get("/bookings/check-slots", { params: { locationId: loc._id, date, type: bookingType } })
      .then(r => setSlotInfo(r.data.data))
      .catch(() => setSlotInfo(null));
  }, [loc?._id, hotel.checkIn, restaurant.date, ent.date, bookingType]);

  // Fetch room availability + price
  const fetchRoomAvail = useCallback(async () => {
    if (bookingType !== "hotel" || !hotel.checkIn || !hotel.checkOut || hotel.checkOut <= hotel.checkIn) return;
    setRoomLoading(true);
    try {
      const r = await api.get("/units/check-availability", {
        params: { locationId: loc._id, checkIn: hotel.checkIn, checkOut: hotel.checkOut,
                  roomType: hotel.roomType || undefined, quantity: hotel.rooms },
      });
      setRoomAvail(r.data);
    } catch { setRoomAvail(null); }
    finally { setRoomLoading(false); }
  }, [bookingType, loc?._id, hotel.checkIn, hotel.checkOut, hotel.roomType, hotel.rooms]);

  useEffect(() => { fetchRoomAvail(); }, [fetchRoomAvail]);

  const handleBook = async () => {
    if (!contact.name || !contact.phone) { setError("Name and phone are required"); return; }
    if (bookingType === "hotel" && !hotel.checkOut) { setError("Please select check-out date"); return; }
    setLoading(true); setError("");
    try {
      const body = {
        locationId: loc._id, bookingType,
        contactName: contact.name, contactPhone: contact.phone, contactEmail: contact.email,
      };
      if (bookingType === "restaurant")    body.restaurantDetails    = restaurant;
      if (bookingType === "entertainment") body.entertainmentDetails = ent;
      if (bookingType === "hotel") {
        const pu = roomAvail?.pricePerUnit ?? 0;
        body.hotelDetails = {
          ...hotel,
          pricePerUnit: pu,
          totalPrice: pu * hotel.nights * hotel.rooms,
        };
      }
      if (bookingType === "tour") body.tourDetails = { date: today(), adults: 1, children: 0, tourRef: tour._id };

      const { data } = await api.post("/bookings", body);
      onBooked({ orderId: data.data.order._id, locationName: loc.name, bookingType, totalPrice: body.hotelDetails?.totalPrice || 0 });
    } catch (e) { setError(e.response?.data?.message || "Booking failed"); }
    finally { setLoading(false); }
  };

  // Slot availability badge
  const SlotBadge = () => {
    if (!slotInfo) return null;
    if (!slotInfo.available) return (
      <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
        ✗ Full
      </span>
    );
    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
        ✓ {slotInfo.remaining ?? slotInfo.max} slots left
      </span>
    );
  };

  const inp = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all";
  const lbl = "block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl
                      max-h-[92vh] flex flex-col border dark:border-slate-700 shadow-2xl">

        {/* ── Progress header ── */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              Booking {stepIdx + 1} of {totalSteps}
            </p>
            <button onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
              Exit
            </button>
          </div>
          {/* Progress segments */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                ${i < stepIdx  ? "bg-emerald-500"
                : i === stepIdx ? "bg-blue-600"
                :                 "bg-gray-200 dark:bg-slate-700"}`}/>
            ))}
          </div>

          {/* Location card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 dark:bg-slate-700 shrink-0">
              {img ? <img src={img} alt="" className="w-full h-full object-cover"/>
                   : <div className="w-full h-full flex items-center justify-center text-2xl">{CAT_ICON[loc?.category] ?? "📍"}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{loc?.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {CAT_ICON[loc?.category]} {TYPE_LABEL[bookingType]}
                  {bookingType === "hotel" && stop.dayEnd > stop.day
                    ? <span className="text-blue-600 dark:text-blue-400 ml-1">· Day {stop.day}–{stop.dayEnd} ({diffDays(hotelCheckIn, hotelCheckOut)} nights)</span>
                    : stop.startTime && <span className="text-blue-600 dark:text-blue-400 ml-1">· {stop.startTime}</span>
                  }
                </p>
                <SlotBadge/>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form body ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">

          {/* Contact */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Contact Information
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className={lbl}>Full Name *</label>
                <input value={contact.name} onChange={e => setContact({...contact, name: e.target.value})}
                  placeholder="John Doe" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Phone *</label>
                <input value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})}
                  placeholder="0912345678" className={inp}/>
              </div>
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input value={contact.email} onChange={e => setContact({...contact, email: e.target.value})}
                placeholder="email@example.com" className={inp}/>
            </div>
          </div>

          {/* Restaurant fields */}
          {bookingType === "restaurant" && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Reservation Details</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><label className={lbl}>Date</label>
                  <input type="date" value={restaurant.date} onChange={e => setRestaurant({...restaurant, date: e.target.value})} className={inp}/></div>
                <div><label className={lbl}>Time</label>
                  <input type="time" value={restaurant.time} onChange={e => setRestaurant({...restaurant, time: e.target.value})} className={inp}/></div>
              </div>
              <div>
                <label className={lbl}>Party Size</label>
                <input type="number" min={1} max={20} value={restaurant.partySize}
                  onChange={e => setRestaurant({...restaurant, partySize: Number(e.target.value)})} className={inp}/>
              </div>
              <div className="mt-2">
                <label className={lbl}>Seating Preference</label>
                <select value={restaurant.seatingPref} onChange={e => setRestaurant({...restaurant, seatingPref: e.target.value})} className={inp}>
                  <option value="no_preference">No preference</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="window">Window seat</option>
                  <option value="private">Private room</option>
                </select>
              </div>
            </div>
          )}

          {/* Hotel fields */}
          {bookingType === "hotel" && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Room Details</p>

              {/* Room type */}
              <div className="mb-3">
                <label className={lbl}>Room Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROOM_TYPE_OPTS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setHotel({...hotel, roomType: opt.value})}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${hotel.roomType === opt.value
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600"
                        }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><label className={lbl}>Check-in</label>
                  <input type="date" value={hotel.checkIn}
                    onChange={e => {
                      const ci = e.target.value;
                      const co = hotel.checkOut > ci ? hotel.checkOut : tripEndDate;
                      setHotel({...hotel, checkIn: ci, checkOut: co, nights: diffDays(ci, co) || 1});
                    }} className={inp}/></div>
                <div><label className={lbl}>Check-out</label>
                  <input type="date" value={hotel.checkOut} min={hotel.checkIn}
                    onChange={e => {
                      const co = e.target.value;
                      setHotel({...hotel, checkOut: co, nights: diffDays(hotel.checkIn, co) || 1});
                    }} className={inp}/></div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div><label className={lbl}>Nights</label>
                  <div className={`${inp} text-center font-semibold text-blue-600 dark:text-blue-400 cursor-default`}>
                    {hotel.nights || "—"}
                  </div>
                </div>
                <div><label className={lbl}>Adults</label>
                  <input type="number" min={1} value={hotel.adults}
                    onChange={e => setHotel({...hotel, adults: Number(e.target.value)})} className={inp}/></div>
                <div><label className={lbl}>Rooms</label>
                  <input type="number" min={1} value={hotel.rooms}
                    onChange={e => setHotel({...hotel, rooms: Number(e.target.value)})} className={inp}/></div>
              </div>

              {/* Availability + price */}
              {roomLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500 mt-2">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"/>
                  Checking availability...
                </div>
              )}
              {!roomLoading && roomAvail && (
                <div className={`mt-2 px-3 py-2.5 rounded-xl text-xs font-medium
                  ${roomAvail.available
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30"
                  }`}>
                  {roomAvail.available ? (
                    <div className="space-y-0.5">
                      <p className="text-emerald-700 dark:text-emerald-400">
                        ✓ {roomAvail.maxAvailable} room{roomAvail.maxAvailable !== 1 ? "s" : ""} available
                      </p>
                      {roomAvail.pricePerUnit > 0 && (
                        <p className="text-emerald-600 dark:text-emerald-300">
                          {fmtVND(roomAvail.pricePerUnit)}/night
                          {hotel.nights > 0 && hotel.rooms > 0 && (
                            <span className="font-bold ml-1">
                              → Total: {fmtVND(roomAvail.pricePerUnit * hotel.nights * hotel.rooms)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-600 dark:text-red-400">✗ No rooms available for selected dates</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Entertainment fields */}
          {bookingType === "entertainment" && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Ticket Details</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><label className={lbl}>Date</label>
                  <input type="date" value={ent.date} onChange={e => setEnt({...ent, date: e.target.value})} className={inp}/></div>
                <div><label className={lbl}>Time</label>
                  <input type="time" value={ent.time} onChange={e => setEnt({...ent, time: e.target.value})} className={inp}/></div>
              </div>
              <div>
                <label className={lbl}>Quantity</label>
                <input type="number" min={1} value={ent.quantity}
                  onChange={e => setEnt({...ent, quantity: Number(e.target.value)})} className={inp}/>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex gap-2 shrink-0">
          <button onClick={onSkip}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400
                       rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Skip →
          </button>
          <button onClick={handleBook} disabled={loading || (bookingType === "hotel" && roomAvail && !roomAvail.available)}
            className="flex-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Booking...
                </span>
              : "Book this →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Done Screen ───────────────────────────────────────────────────────────────
function DoneScreen({ bookedList, skippedCount, onClose }) {
  const navigate = useNavigate();
  const total = bookedList.reduce((s, b) => s + (b.totalPrice || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border dark:border-slate-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
            🎉
          </div>
          <h2 className="text-xl font-black text-white">All Done!</h2>
          <p className="text-emerald-100 text-sm mt-1">
            {bookedList.length} booking{bookedList.length !== 1 ? "s" : ""} created
            {skippedCount > 0 && ` · ${skippedCount} skipped`}
          </p>
        </div>

        {/* Bookings list */}
        <div className="px-5 py-4 space-y-2 max-h-52 overflow-y-auto">
          {bookedList.map((b, i) => (
            <div key={i}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{b.locationName}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {TYPE_LABEL[b.bookingType] ?? b.bookingType}
                  {b.totalPrice > 0 && <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">· {fmtVND(b.totalPrice)}</span>}
                </p>
              </div>
              <button
                onClick={() => { onClose(); navigate(`/booking/payment/${b.orderId}`); }}
                className="ml-3 shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white
                           text-xs font-bold rounded-lg transition-colors">
                Pay
              </button>
            </div>
          ))}
        </div>

        {/* Summary + actions */}
        <div className="px-5 pb-5 space-y-3">
          {total > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-500/10
                            border border-amber-200 dark:border-amber-500/30 rounded-xl">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                ⏱ Pay within 15 mins to confirm
              </p>
              <p className="text-sm font-black text-amber-700 dark:text-amber-400">
                {fmtVND(total)}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { onClose(); navigate("/profile/bookings"); }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
              View Bookings
            </button>
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400
                         rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main BundleBookingFlow ────────────────────────────────────────────────────
export default function BundleBookingFlow({ tour, onClose }) {

  const allBookableStops = useMemo(() => {
    const raw = [];
    tour.itinerary?.forEach(day => {
      day.stops?.forEach(stop => {
        if (stop.location?.booking?.isBookable) raw.push({ ...stop, day: day.day });
      });
    });

    // Dedup hotels by location._id:
    // If same hotel appears across multiple days → one booking with
    // checkIn = first day, checkOut = last day + 1
    const seen = new Map(); // locationId → index in result
    const result = [];

    raw.forEach(stop => {
      const locId = stop.location?._id;
      const bType = stop.location?.booking?.bookingType;

      if (bType === "hotel" && locId && seen.has(locId)) {
        // Extend the existing hotel stop's dayRange
        const idx = seen.get(locId);
        result[idx] = {
          ...result[idx],
          dayEnd: Math.max(result[idx].dayEnd ?? result[idx].day, stop.day),
        };
      } else {
        const entry = { ...stop, dayEnd: stop.day };
        result.push(entry);
        if (bType === "hotel" && locId) seen.set(locId, result.length - 1);
      }
    });

    return result;
  }, [tour]);

  const [phase,      setPhase]      = useState("select");  // select | booking | done
  const [selected,   setSelected]   = useState(new Set(allBookableStops.map(s => s._id || s.location?._id)));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [bookedList, setBookedList] = useState([]);   // [{ orderId, locationName, bookingType, totalPrice }]
  const [skippedIds, setSkippedIds] = useState(new Set());

  const selectedStops = allBookableStops.filter(s => selected.has(s._id || s.location?._id));
  const currentStop   = selectedStops[currentIdx];
  const isLastStop    = currentIdx === selectedStops.length - 1;

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleBooked = (bookingInfo) => {
    setBookedList(prev => [...prev, bookingInfo]);
    if (isLastStop) setPhase("done"); else setCurrentIdx(i => i + 1);
  };

  const handleSkip = () => {
    setSkippedIds(prev => new Set([...prev, currentStop._id || currentStop.location?._id]));
    if (isLastStop) setPhase("done"); else setCurrentIdx(i => i + 1);
  };

  // ── SELECT phase ───────────────────────────────────────────────────────────
  if (phase === "select") return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl
                      max-h-[90vh] flex flex-col border dark:border-slate-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Book Your Trip</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Select locations to book
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                       hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-xl">
            ×
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {allBookableStops.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">📍</p>
              <p className="text-sm">No bookable locations in this trip</p>
            </div>
          ) : (
            allBookableStops.map(stop => {
              const id = stop._id || stop.location?._id;
              return <ChecklistItem key={id} stop={stop} day={stop.day} checked={selected.has(id)} onToggle={() => toggleSelect(id)}/>;
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              <span className="font-semibold text-gray-900 dark:text-white">{selected.size}</span> / {allBookableStops.length} selected
            </p>
            <button
              onClick={() => selected.size === allBookableStops.length
                ? setSelected(new Set())
                : setSelected(new Set(allBookableStops.map(s => s._id || s.location?._id)))
              }
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              {selected.size === allBookableStops.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400
                         rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { if (selectedStops.length === 0) return; setPhase("booking"); setCurrentIdx(0); }}
              disabled={selected.size === 0}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold
                         transition-colors disabled:opacity-50">
              Book {selected.size} location{selected.size !== 1 ? "s" : ""} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── BOOKING phase ──────────────────────────────────────────────────────────
  if (phase === "booking" && currentStop) return (
    <InlineBookingStep
      stop={currentStop}
      tour={tour}
      stepIdx={currentIdx}
      totalSteps={selectedStops.length}
      onBooked={handleBooked}
      onSkip={handleSkip}
      onClose={onClose}
    />
  );

  // ── DONE phase ─────────────────────────────────────────────────────────────
  return (
    <DoneScreen
      bookedList={bookedList}
      skippedCount={skippedIds.size}
      onClose={onClose}
    />
  );
}