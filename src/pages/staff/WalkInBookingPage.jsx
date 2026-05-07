import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";

const fmtVND   = (n) => `₫${Number(n).toLocaleString("vi-VN")}`;
const today    = () => new Date().toISOString().split("T")[0];
const todayStr = new Date().toISOString().split("T")[0];
const fmtDate  = (str) => { if (!str) return ""; const [y,m,d] = str.split("-"); return `${d}/${m}/${y}`; };

const inputCls = `w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                  text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm
                  focus:outline-none focus:bg-white dark:focus:bg-slate-700
                  focus:ring-2 focus:ring-blue-500/25 transition-all`;
const inputErrCls = `w-full bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-500
                     text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-red-500/25 transition-all`;
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5";

const PHONE_RE = /^(0|\+84)(3[2-9]|5[6-9]|7[0-9]|8[0-9]|9[0-9])\d{7}$/;

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

function Row({ label, val, bold, colored }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className={`font-medium text-right ${
        colored === "emerald" ? "text-emerald-600 dark:text-emerald-400"
        : bold ? "text-gray-900 dark:text-white font-semibold"
        : "text-gray-900 dark:text-white"
      }`}>{val}</span>
    </div>
  );
}
function Divider() {
  return <div className="border-t border-gray-200 dark:border-slate-700 my-1"/>;
}

export default function WalkInBookingPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const locationId = user?.staffInfo?.location?._id ?? user?.staffInfo?.location;
  const locationName = user?.staffInfo?.location?.name ?? "Your Location";

  const [bookingType, setBookingType] = useState("hotel");
  const [step,        setStep]        = useState(0); // 0=form, 1=confirm
  const [saving,      setSaving]      = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [slotInfo,    setSlotInfo]    = useState(null);
  const [roomPriceInfo, setRoomPriceInfo] = useState(null);
  const [success,     setSuccess]     = useState(null);

  const [contact, setContact] = useState({
    name: "", phone: "", email: "", gender: "", age: "",
  });
  const [hotel, setHotel] = useState({
    checkIn: today(), checkOut: "", nights: 1,
    rooms: 1, roomType: "", adults: 1, children: 0, specialReq: "",
  });
  const [restaurant, setRestaurant] = useState({
    date: today(), time: "12:00", partySize: 2,
    seatingPref: "no_preference", specialReq: "",
  });
  const [ent, setEnt] = useState({
    date: today(), time: "", ticketType: "", quantity: 1, specialReq: "",
  });
  const [noteField, setNoteField] = useState("");

  const clearField = (name) => setFieldErrors(p => ({ ...p, [name]: "" }));
  const fc = (name) => fieldErrors[name] ? inputErrCls : inputCls;

  // ── Check slots ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!locationId) return;
    const date = bookingType === "hotel" ? hotel.checkIn
      : bookingType === "restaurant"    ? restaurant.date
      : ent.date;
    if (!date) return;
    setSlotInfo(null);
    api.get("/bookings/check-slots", { params: { locationId, date, type: bookingType } })
      .then(r => setSlotInfo(r.data.data))
      .catch(() => setSlotInfo(null));
  }, [bookingType, hotel.checkIn, restaurant.date, ent.date, locationId]);

  // ── Check room price ──────────────────────────────────────────────────────
  useEffect(() => {
    if (bookingType !== "hotel" || !locationId) return;
    if (!hotel.checkIn || !hotel.checkOut || hotel.checkOut <= hotel.checkIn) return;
    setRoomPriceInfo(null);
    api.get("/units/check-availability", {
      params: {
        locationId, checkIn: hotel.checkIn, checkOut: hotel.checkOut,
        roomType: hotel.roomType || undefined, quantity: hotel.rooms,
      },
    }).then(r => setRoomPriceInfo(r.data)).catch(() => setRoomPriceInfo(null));
  }, [bookingType, locationId, hotel.checkIn, hotel.checkOut, hotel.roomType, hotel.rooms]);

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};

    if (!contact.name?.trim())
      e.contactName = "Name is required";
    else if (contact.name.trim().length < 2)
      e.contactName = "Name must be at least 2 characters";

    if (!contact.phone?.trim())
      e.contactPhone = "Phone number is required";
    else if (!PHONE_RE.test(contact.phone.replace(/\s/g, "")))
      e.contactPhone = "Invalid phone number (e.g. 0912 345 678)";

    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
      e.contactEmail = "Invalid email address";

    if (contact.age !== "" && contact.age !== undefined) {
      const n = Number(contact.age);
      if (isNaN(n) || n < 1 || n > 120) e.contactAge = "Age must be 1–120";
    }

    if (bookingType === "hotel") {
      if (!hotel.checkIn)  e.checkIn  = "Check-in date is required";
      else if (hotel.checkIn < todayStr) e.checkIn = "Check-in cannot be in the past";

      if (!hotel.checkOut) e.checkOut = "Check-out date is required";
      else if (hotel.checkOut <= hotel.checkIn) e.checkOut = "Check-out must be after check-in";

      if (!hotel.rooms  || hotel.rooms  < 1) e.rooms  = "At least 1 room required";
      if (!hotel.adults || hotel.adults < 1) e.adults = "At least 1 adult required";

      if (slotInfo && !slotInfo.available)
        e.checkIn = slotInfo.reason || "No slots available for this date";
    }

    if (bookingType === "restaurant") {
      if (!restaurant.date) e.restDate = "Date is required";
      else if (restaurant.date < todayStr) e.restDate = "Date cannot be in the past";
      if (!restaurant.time) e.restTime = "Time is required";
      if (!restaurant.partySize || restaurant.partySize < 1) e.partySize = "At least 1 guest required";
      if (slotInfo && !slotInfo.available)
        e.restDate = slotInfo.reason || "No slots available for this date";
    }

    if (bookingType === "entertainment") {
      if (!ent.date) e.entDate = "Date is required";
      else if (ent.date < todayStr) e.entDate = "Date cannot be in the past";
      if (!ent.quantity || ent.quantity < 1) e.quantity = "At least 1 ticket required";
      if (slotInfo && !slotInfo.available)
        e.entDate = slotInfo.reason || "No slots available for this date";
    }

    if (!locationId) e.global = "No location assigned. Contact your manager.";

    return e;
  };

  const handleReview = () => {
    setSubmitError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setStep(1);
  };

  const handleSubmit = async () => {
    setSaving(true); setSubmitError("");
    try {
      const body = {
        locationId, bookingType,
        contactName:  contact.name.trim(),
        contactPhone: contact.phone.replace(/\s/g, ""),
        contactEmail: contact.email.trim() || undefined,
        gender:       contact.gender || undefined,
        age:          contact.age ? Number(contact.age) : undefined,
        userNote:     noteField.trim() || undefined,
        isWalkIn:     true,
      };

      if (bookingType === "hotel") {
        const pu = roomPriceInfo?.pricePerUnit ?? 0;
        body.hotelDetails = {
          ...hotel,
          pricePerUnit: pu,
          totalPrice:   pu * hotel.nights * hotel.rooms,
        };
      }
      if (bookingType === "restaurant")    body.restaurantDetails    = restaurant;
      if (bookingType === "entertainment") body.entertainmentDetails = ent;

      const { data } = await api.post("/bookings/walk-in", body);
      setSuccess(data.data.order);
    } catch (e) {
      setSubmitError(e.response?.data?.message ?? "Failed to create booking. Please try again.");
    } finally { setSaving(false); }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) return (
    <div className="max-w-md mx-auto text-center py-16 px-4">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/15 rounded-full
                      flex items-center justify-center mx-auto mb-5 text-4xl">✅</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Walk-in Booking Created</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
        {success.contactName} — #{success._id.slice(-8).toUpperCase()}
      </p>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Status: <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{success.status}</span>
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={() => navigate(`/staff/bookings/${success._id}`)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
          View Booking
        </button>
        <button onClick={() => {
          setSuccess(null); setStep(0);
          setContact({ name:"", phone:"", email:"", gender:"", age:"" });
          setNoteField(""); setFieldErrors({}); setSubmitError("");
        }}
          className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl
                     text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          New Walk-in
        </button>
      </div>
    </div>
  );

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-0 pb-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Walk-in Booking</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          {locationName}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {["Information", "Confirmation"].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-6 ${step >= i ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-700"}`}/>}
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-semibold transition-colors
                ${step > i  ? "bg-emerald-500 text-white"
                : step === i ? "bg-blue-600 text-white"
                :              "bg-gray-200 dark:bg-slate-700 text-gray-500"}`}>
                {step > i ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${step === i
                ? "text-gray-900 dark:text-white font-medium"
                : "text-gray-400 dark:text-slate-500"}`}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── STEP 0: FORM ────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Booking type */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Booking Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key:"hotel",         icon:"🏨", label:"Hotel"         },
                { key:"restaurant",    icon:"🍽️", label:"Restaurant"    },
                { key:"entertainment", icon:"🎡", label:"Entertainment" },
              ].map(t => (
                <button key={t.key}
                  onClick={() => { setBookingType(t.key); setFieldErrors({}); setSlotInfo(null); }}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all
                              flex flex-col items-center gap-1
                              ${bookingType === t.key
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300"}`}>
                  <span className="text-xl">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Contact Information
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                  <input value={contact.name}
                    onChange={e => { setContact(p => ({...p, name: e.target.value})); clearField("contactName"); }}
                    placeholder="John Doe" className={fc("contactName")}/>
                  <FieldError msg={fieldErrors.contactName}/>
                </div>
                <div>
                  <label className={labelCls}>Phone <span className="text-red-400">*</span></label>
                  <input value={contact.phone}
                    onChange={e => { setContact(p => ({...p, phone: e.target.value})); clearField("contactPhone"); }}
                    placeholder="0912 345 678" className={fc("contactPhone")}/>
                  <FieldError msg={fieldErrors.contactPhone}/>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Email</label>
                  <input value={contact.email}
                    onChange={e => { setContact(p => ({...p, email: e.target.value})); clearField("contactEmail"); }}
                    placeholder="email@example.com" className={fc("contactEmail")}/>
                  <FieldError msg={fieldErrors.contactEmail}/>
                </div>
                <div>
                  <label className={labelCls}>Age</label>
                  <input type="number" min={1} max={120} value={contact.age}
                    onChange={e => { setContact(p => ({...p, age: e.target.value})); clearField("contactAge"); }}
                    placeholder="30" className={fc("contactAge")}/>
                  <FieldError msg={fieldErrors.contactAge}/>
                </div>
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select value={contact.gender}
                  onChange={e => setContact(p => ({...p, gender: e.target.value}))}
                  className={`${inputCls} appearance-none`}>
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Booking Details
            </p>

            {/* HOTEL */}
            {bookingType === "hotel" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Check-in <span className="text-red-400">*</span></label>
                    <input type="date" value={hotel.checkIn} min={today()}
                      onChange={e => {
                        const ci = e.target.value;
                        const co = hotel.checkOut && hotel.checkOut > ci ? hotel.checkOut : "";
                        const nights = co ? Math.ceil((new Date(co) - new Date(ci)) / 86400000) : 1;
                        setHotel(p => ({...p, checkIn: ci, checkOut: co, nights}));
                        clearField("checkIn");
                      }}
                      className={fc("checkIn")}/>
                    <FieldError msg={fieldErrors.checkIn}/>
                  </div>
                  <div>
                    <label className={labelCls}>Check-out <span className="text-red-400">*</span></label>
                    <input type="date" value={hotel.checkOut}
                      min={hotel.checkIn
                        ? (() => { const d = new Date(hotel.checkIn); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; })()
                        : today()}
                      onChange={e => {
                        const co = e.target.value;
                        const nights = Math.ceil((new Date(co) - new Date(hotel.checkIn)) / 86400000);
                        setHotel(p => ({...p, checkOut: co, nights: nights > 0 ? nights : 1}));
                        clearField("checkOut");
                      }}
                      className={fc("checkOut")}/>
                    <FieldError msg={fieldErrors.checkOut}/>
                  </div>
                </div>

                {hotel.checkIn && hotel.checkOut && hotel.checkOut > hotel.checkIn && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-3 py-2 space-y-0.5">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      📅 {hotel.nights} night{hotel.nights > 1 ? "s" : ""}
                      {hotel.rooms > 1 ? ` × ${hotel.rooms} rooms` : ""}
                    </p>
                    {roomPriceInfo?.pricePerUnit > 0 && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        💵 {roomPriceInfo.pricePerUnit.toLocaleString("vi-VN")}₫/night
                        {" → Total: "}
                        {(roomPriceInfo.pricePerUnit * hotel.nights * hotel.rooms).toLocaleString("vi-VN")}₫
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Rooms <span className="text-red-400">*</span></label>
                    <input type="number" min={1} value={hotel.rooms}
                      onChange={e => { setHotel(p => ({...p, rooms: Number(e.target.value)})); clearField("rooms"); }}
                      className={fc("rooms")}/>
                    <FieldError msg={fieldErrors.rooms}/>
                  </div>
                  <div>
                    <label className={labelCls}>Adults <span className="text-red-400">*</span></label>
                    <input type="number" min={1} value={hotel.adults}
                      onChange={e => { setHotel(p => ({...p, adults: Number(e.target.value)})); clearField("adults"); }}
                      className={fc("adults")}/>
                    <FieldError msg={fieldErrors.adults}/>
                  </div>
                  <div>
                    <label className={labelCls}>Children</label>
                    <input type="number" min={0} value={hotel.children}
                      onChange={e => setHotel(p => ({...p, children: Number(e.target.value)}))}
                      className={inputCls}/>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Room Type</label>
                  <select value={hotel.roomType}
                    onChange={e => setHotel(p => ({...p, roomType: e.target.value}))}
                    className={`${inputCls} appearance-none`}>
                    <option value="">Any type</option>
                    <option value="standard">Standard</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="suite">Suite</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Special Requests</label>
                  <textarea value={hotel.specialReq}
                    onChange={e => setHotel(p => ({...p, specialReq: e.target.value}))}
                    rows={2} placeholder="Late check-in, extra bed..."
                    className={`${inputCls} resize-none`}/>
                </div>
              </div>
            )}

            {/* RESTAURANT */}
            {bookingType === "restaurant" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Date <span className="text-red-400">*</span></label>
                    <input type="date" value={restaurant.date} min={today()}
                      onChange={e => { setRestaurant(p => ({...p, date: e.target.value})); clearField("restDate"); }}
                      className={fc("restDate")}/>
                    <FieldError msg={fieldErrors.restDate}/>
                  </div>
                  <div>
                    <label className={labelCls}>Time <span className="text-red-400">*</span></label>
                    <input type="time" value={restaurant.time}
                      onChange={e => { setRestaurant(p => ({...p, time: e.target.value})); clearField("restTime"); }}
                      className={fc("restTime")}/>
                    <FieldError msg={fieldErrors.restTime}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Party Size <span className="text-red-400">*</span></label>
                    <input type="number" min={1} value={restaurant.partySize}
                      onChange={e => { setRestaurant(p => ({...p, partySize: Number(e.target.value)})); clearField("partySize"); }}
                      className={fc("partySize")}/>
                    <FieldError msg={fieldErrors.partySize}/>
                  </div>
                  <div>
                    <label className={labelCls}>Seating</label>
                    <select value={restaurant.seatingPref}
                      onChange={e => setRestaurant(p => ({...p, seatingPref: e.target.value}))}
                      className={`${inputCls} appearance-none`}>
                      <option value="no_preference">No preference</option>
                      <option value="indoor">Indoor</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="bar">Bar</option>
                      <option value="private">Private room</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Special Requests</label>
                  <textarea value={restaurant.specialReq}
                    onChange={e => setRestaurant(p => ({...p, specialReq: e.target.value}))}
                    rows={2} placeholder="Allergies, occasion..."
                    className={`${inputCls} resize-none`}/>
                </div>
              </div>
            )}

            {/* ENTERTAINMENT */}
            {bookingType === "entertainment" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Date <span className="text-red-400">*</span></label>
                    <input type="date" value={ent.date} min={today()}
                      onChange={e => { setEnt(p => ({...p, date: e.target.value})); clearField("entDate"); }}
                      className={fc("entDate")}/>
                    <FieldError msg={fieldErrors.entDate}/>
                  </div>
                  <div>
                    <label className={labelCls}>Time</label>
                    <input type="time" value={ent.time}
                      onChange={e => setEnt(p => ({...p, time: e.target.value}))}
                      className={inputCls}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Ticket Type</label>
                    <input value={ent.ticketType}
                      onChange={e => setEnt(p => ({...p, ticketType: e.target.value}))}
                      placeholder="Standard, VIP..." className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>Quantity <span className="text-red-400">*</span></label>
                    <input type="number" min={1} value={ent.quantity}
                      onChange={e => { setEnt(p => ({...p, quantity: Number(e.target.value)})); clearField("quantity"); }}
                      className={fc("quantity")}/>
                    <FieldError msg={fieldErrors.quantity}/>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Special Requests</label>
                  <textarea value={ent.specialReq}
                    onChange={e => setEnt(p => ({...p, specialReq: e.target.value}))}
                    rows={2} placeholder="Accessibility needs..."
                    className={`${inputCls} resize-none`}/>
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
            <label className={labelCls}>Staff Note</label>
            <textarea value={noteField} onChange={e => setNoteField(e.target.value)}
              rows={2} placeholder="Internal notes..."
              className={`${inputCls} resize-none`}/>
          </div>

          {/* Walk-in notice */}
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200
                          dark:border-emerald-500/20 rounded-2xl px-4 py-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              ✅ Walk-in — confirmed immediately, payment collected at checkout
            </p>
          </div>

          {/* Global error */}
          {(fieldErrors.global || Object.keys(fieldErrors).length > 0) && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200
                            dark:border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.global || "⚠️ Please fix the errors above before continuing."}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => navigate(-1)}
              className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-600
                         dark:text-slate-400 rounded-xl text-sm font-medium
                         hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button onClick={handleReview}
              disabled={slotInfo && !slotInfo.available}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                         text-sm font-semibold transition-colors disabled:opacity-50">
              Review →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: CONFIRM ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-sm">
            <Row label="Location"   val={locationName}/>
            <Row label="Booker"     val={contact.name}/>
            <Row label="Phone"      val={contact.phone}/>
            {contact.email && <Row label="Email"  val={contact.email}/>}
            {contact.gender && <Row label="Gender" val={contact.gender}/>}

            {bookingType === "hotel" && <>
              <Divider/>
              <Row label="Check-in"  val={fmtDate(hotel.checkIn)}/>
              <Row label="Check-out" val={fmtDate(hotel.checkOut)}/>
              <Row label="Rooms"     val={`${hotel.rooms} × ${hotel.roomType || "any type"}`}/>
              <Row label="Guests"    val={`${hotel.adults} adults${hotel.children ? `, ${hotel.children} children` : ""}`}/>
              {roomPriceInfo?.pricePerUnit > 0 && <>
                <Divider/>
                <Row label="Price/night" val={fmtVND(roomPriceInfo.pricePerUnit)}/>
                <Row label="Total"       val={fmtVND(roomPriceInfo.pricePerUnit * hotel.nights * hotel.rooms)} bold/>
                <Row label="Payment"     val="Collected at checkout (cash)" colored="emerald"/>
              </>}
            </>}

            {bookingType === "restaurant" && <>
              <Divider/>
              <Row label="Date & Time" val={`${fmtDate(restaurant.date)} ${restaurant.time}`}/>
              <Row label="Party Size"  val={`${restaurant.partySize} guests`}/>
              {restaurant.seatingPref !== "no_preference" && (
                <Row label="Seating" val={restaurant.seatingPref}/>
              )}
            </>}

            {bookingType === "entertainment" && <>
              <Divider/>
              <Row label="Date"    val={`${fmtDate(ent.date)}${ent.time ? ` ${ent.time}` : ""}`}/>
              <Row label="Tickets" val={`${ent.quantity}× ${ent.ticketType || "Standard"}`}/>
            </>}

            {noteField && <><Divider/><Row label="Note" val={noteField}/></>}
          </div>

          <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200
                          dark:border-amber-400/20 rounded-xl px-4 py-3 text-sm
                          text-amber-700 dark:text-amber-400">
            ⚡ Walk-in booking will be confirmed immediately. Guest pays at checkout.
          </div>

          {submitError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200
                            dark:border-red-500/30 rounded-xl px-4 py-3 text-sm
                            text-red-600 dark:text-red-400">
              ❌ {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setStep(0); setSubmitError(""); }}
              className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-600
                         dark:text-slate-400 rounded-xl text-sm font-medium
                         hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl
                         text-sm font-semibold transition-colors disabled:opacity-60
                         flex items-center justify-center gap-2">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating...</>
                : "✓ Create Walk-in Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}