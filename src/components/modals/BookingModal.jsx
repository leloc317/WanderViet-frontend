import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";

const fmtVND = (n) => `₫${Number(n).toLocaleString("en-US")}`;
const today  = () => new Date().toISOString().split("T")[0];

const inputCls = `w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                  text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm
                  focus:outline-none focus:bg-white dark:focus:bg-slate-700
                  focus:ring-2 focus:ring-blue-500/25 transition-all`;
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5";

function GuestRow({ index, guest, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center">
      <input value={guest.name} onChange={e => onChange(index,"name",e.target.value)}
        placeholder={`Guest ${index+1} name`} className={`${inputCls} flex-1`}/>
      <input type="number" value={guest.age||""} onChange={e => onChange(index,"age",e.target.value)}
        placeholder="Age" className={`${inputCls} w-20`}/>
      <select value={guest.gender||""} onChange={e => onChange(index,"gender",e.target.value)}
        className={`${inputCls} w-28`}>
        <option value="">Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
      <button type="button" onClick={() => onRemove(index)}
        className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/20 text-red-500 text-sm flex items-center justify-center shrink-0">
        ×
      </button>
    </div>
  );
}

export default function BookingModal({ location, open, onClose, prefillGuests = null, tourRef = null, prefillRoomType = null }) {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const bookingType = location?.booking?.bookingType || "restaurant";

  const [step,     setStep]     = useState(0); // 0=form, 1=confirm
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [slotInfo,       setSlotInfo]      = useState(null);
  const [roomPriceInfo,  setRoomPriceInfo] = useState(null);

  const [contact, setContact] = useState({
    name:   user?.name   || "",
    phone:  user?.phone  || "",
    email:  user?.email  || "",
    gender: user?.gender || "",
    age:    user?.age    || "",
  });

  const [restaurant, setRestaurant] = useState({
    date: today(), time:"12:00",
    partySize: prefillGuests ? (prefillGuests.adults + (prefillGuests.children||0)) : 2,
    seatingPref:"no_preference", specialReq:"", guests:[],
  });

  const [hotel, setHotel] = useState({
    checkIn: today(), checkOut:"", nights:1,
    rooms:1, roomType: prefillRoomType || "", adults: prefillGuests?.adults||1,
    children: prefillGuests?.children||0, specialReq:"", guests:[],
  });

  const [ent, setEnt] = useState({
    date: today(), time:"", ticketType:"",
    quantity: prefillGuests ? (prefillGuests.adults + (prefillGuests.children||0)) : 1,
    specialReq:"", guests:[],
  });

  const [tour, setTour] = useState({
    date: today(), adults: prefillGuests?.adults||1,
    children: prefillGuests?.children||0,
    groupType: prefillGuests?.groupType||"friends_mixed", specialReq:"", guests:[], tourRef:"",
  });

  const [noteField, setNoteField] = useState("");

  useEffect(() => {
    if (!open || !location?._id) return;
    const date = bookingType === "hotel" ? hotel.checkIn
               : bookingType === "restaurant" ? restaurant.date
               : bookingType === "entertainment" ? ent.date
               : tour.date;
    if (!date) return;
    api.get("/bookings/check-slots", { params: { locationId: location._id, date, type: bookingType } })
      .then(r => setSlotInfo(r.data.data)).catch(() => setSlotInfo(null));
  }, [open, restaurant.date, hotel.checkIn, ent.date, tour.date]);

  // Sync prefillRoomType → hotel.roomType whenever it changes
  useEffect(() => {
    if (prefillRoomType) {
      setHotel(prev => ({ ...prev, roomType: prefillRoomType }));
    }
  }, [prefillRoomType, open]);

  // Lấy giá phòng khi hotel dates / roomType / rooms thay đổi
  useEffect(() => {
    if (bookingType !== "hotel" || !open || !location?._id) return;
    if (!hotel.checkIn || !hotel.checkOut || hotel.checkOut <= hotel.checkIn) return;
    api.get("/units/check-availability", {
      params: {
        locationId: location._id,
        checkIn:    hotel.checkIn,
        checkOut:   hotel.checkOut,
        roomType:   hotel.roomType || undefined,
        quantity:   hotel.rooms,
      },
    }).then(r => setRoomPriceInfo(r.data)).catch(() => setRoomPriceInfo(null));
  }, [open, bookingType, location?._id, hotel.checkIn, hotel.checkOut, hotel.roomType, hotel.rooms]);

  const updateGuests = (setter, guests, index, field, value) => {
    const updated = [...guests];
    updated[index] = { ...updated[index], [field]: value };
    setter(prev => ({ ...prev, guests: updated }));
  };
  const addGuest    = (setter) => setter(prev => ({ ...prev, guests: [...prev.guests, { name:"",age:"",gender:"" }] }));
  const removeGuest = (setter, guests, index) => setter(prev => ({ ...prev, guests: guests.filter((_,i) => i !== index) }));

  const totalGuests = bookingType === "restaurant" ? restaurant.partySize
                    : bookingType === "hotel"       ? hotel.adults + hotel.children
                    : bookingType === "entertainment"? ent.quantity
                    : tour.adults + tour.children;

  const PHONE_RE = /^(0|\+84)(3[2-9]|5[6-9]|7[0-9]|8[0-9]|9[0-9])\d{7}$/;
  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!contact.name?.trim())  { setError("Vui lòng nhập họ và tên"); return; }
    if (!contact.phone?.trim()) { setError("Vui lòng nhập số điện thoại"); return; }
    if (!PHONE_RE.test(contact.phone.replace(/\s/g,""))) {
      setError("Số điện thoại không hợp lệ (VD: 0912 345 678)"); return;
    }
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      setError("Email không hợp lệ"); return;
    }

    if (bookingType === "hotel") {
      if (!hotel.checkIn)  { setError("Vui lòng chọn ngày nhận phòng"); return; }
      if (!hotel.checkOut) { setError("Vui lòng chọn ngày trả phòng"); return; }
      if (hotel.checkIn < todayStr) { setError("Ngày nhận phòng không thể ở quá khứ"); return; }
      if (hotel.checkOut <= hotel.checkIn) { setError("Ngày trả phòng phải sau ngày nhận phòng"); return; }
      if ((hotel.adults ?? 0) < 1) { setError("Cần ít nhất 1 người lớn"); return; }
    }

    if (bookingType === "restaurant") {
      if (!restaurant.date) { setError("Vui lòng chọn ngày đặt bàn"); return; }
      if (restaurant.date < todayStr) { setError("Ngày đặt không thể ở quá khứ"); return; }
      if ((restaurant.partySize ?? 0) < 1) { setError("Số lượng khách phải ít nhất 1 người"); return; }
      if ((restaurant.partySize ?? 0) > 50) { setError("Số lượng khách không được vượt quá 50"); return; }
    }

    if (bookingType === "entertainment") {
      if (!ent.date) { setError("Vui lòng chọn ngày"); return; }
      if (ent.date < todayStr) { setError("Ngày không thể ở quá khứ"); return; }
      if ((ent.quantity ?? 0) < 1) { setError("Cần ít nhất 1 vé"); return; }
    }

    setLoading(true); setError("");
    try {
      const body = {
        locationId:   location._id,
        bookingType,
        contactName:  contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        gender:       contact.gender,
        age:          contact.age ? Number(contact.age) : undefined,
        userNote:     noteField,
      };
      if (bookingType === "restaurant")    body.restaurantDetails    = restaurant;
      if (bookingType === "hotel") {
        const pu = roomPriceInfo?.pricePerUnit ?? 0;
        body.hotelDetails = { ...hotel, pricePerUnit: pu, totalPrice: pu * hotel.nights * hotel.rooms };
      }
      // Gắn tourRef nếu đến từ Trip Planner
      if (bookingType === "tour" && tourRef) {
        body.tourDetails = { ...(body.tourDetails || tour), tourRef };
      }
      if (bookingType === "entertainment") body.entertainmentDetails = ent;
      if (bookingType === "tour")          body.tourDetails          = tour;

      const { data } = await api.post("/bookings", body);
      const order = data.data.order;

      // ── Navigate sang PaymentPage thay vì show done step ─────────────────
      onClose();
      navigate(`/booking/payment/${order._id}`);
    } catch(e) { setError(e.response?.data?.message || "Booking failed"); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  const BOOKING_ICON = { restaurant:"🍽️", hotel:"🏨", entertainment:"🎡", tour:"🗺️" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl
                      max-h-[92vh] flex flex-col border dark:border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {BOOKING_ICON[bookingType]} Book — {location?.name}
            </h3>
            {slotInfo && (
              <p className={`text-xs mt-0.5 ${slotInfo.available ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {slotInfo.available
                  ? `✅ ${slotInfo.remaining} slot${slotInfo.remaining!==1?"s":""} available`
                  : `❌ ${slotInfo.reason}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* STEP 0 — FORM */}
          {step === 0 && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Contact Information</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input value={contact.name} onChange={e => setContact({...contact,name:e.target.value})} placeholder="Your name" className={inputCls}/>
                    </div>
                    <div>
                      <label className={labelCls}>Phone *</label>
                      <input value={contact.phone} onChange={e => setContact({...contact,phone:e.target.value})} placeholder="+84..." className={inputCls}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Email</label>
                      <input value={contact.email} onChange={e => setContact({...contact,email:e.target.value})} placeholder="email@example.com" className={inputCls}/>
                    </div>
                    <div>
                      <label className={labelCls}>Age</label>
                      <input type="number" value={contact.age} onChange={e => setContact({...contact,age:e.target.value})} placeholder="25" className={inputCls}/>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select value={contact.gender} onChange={e => setContact({...contact,gender:e.target.value})} className={`${inputCls} appearance-none`}>
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Booking Details</p>

                {bookingType === "restaurant" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Date *</label><input type="date" value={restaurant.date} min={today()} onChange={e => setRestaurant({...restaurant,date:e.target.value})} className={inputCls}/></div>
                      <div><label className={labelCls}>Time *</label><input type="time" value={restaurant.time} onChange={e => setRestaurant({...restaurant,time:e.target.value})} className={inputCls}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Party Size *</label><input type="number" min={1} max={location?.booking?.maxGuestsPerBook||20} value={restaurant.partySize} onChange={e => setRestaurant({...restaurant,partySize:Number(e.target.value)})} className={inputCls}/></div>
                      <div>
                        <label className={labelCls}>Seating</label>
                        <select value={restaurant.seatingPref} onChange={e => setRestaurant({...restaurant,seatingPref:e.target.value})} className={`${inputCls} appearance-none`}>
                          <option value="no_preference">No preference</option>
                          <option value="indoor">Indoor</option>
                          <option value="outdoor">Outdoor / Terrace</option>
                          <option value="bar">Bar</option>
                          <option value="private">Private room</option>
                        </select>
                      </div>
                    </div>
                    <div><label className={labelCls}>Special Requests</label><textarea value={restaurant.specialReq} onChange={e => setRestaurant({...restaurant,specialReq:e.target.value})} rows={2} placeholder="Allergies, occasion..." className={`${inputCls} resize-none`}/></div>
                  </div>
                )}

                {bookingType === "hotel" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Check-in *</label><input type="date" value={hotel.checkIn} min={today()} onChange={e => { const ci=e.target.value; const co=hotel.checkOut&&hotel.checkOut>ci?hotel.checkOut:""; const nights=co?Math.ceil((new Date(co)-new Date(ci))/86400000):1; setHotel({...hotel,checkIn:ci,checkOut:co,nights}); }} className={inputCls}/></div>
                      <div><label className={labelCls}>Check-out *</label><input type="date" value={hotel.checkOut} min={hotel.checkIn||today()} onChange={e => { const co=e.target.value; const nights=Math.ceil((new Date(co)-new Date(hotel.checkIn))/86400000); setHotel({...hotel,checkOut:co,nights:nights>0?nights:1}); }} className={inputCls}/></div>
                    </div>
                    {hotel.checkIn && hotel.checkOut && (
                    <div className="space-y-1">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        📅 {hotel.nights} night{hotel.nights!==1?"s":""}
                        {hotel.rooms > 1 && ` × ${hotel.rooms} rooms`}
                      </p>
                      {roomPriceInfo?.pricePerUnit > 0 && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          💵 {(roomPriceInfo.pricePerUnit).toLocaleString("vi-VN")}₫/đêm
                          {" → Tổng: "}
                          {(roomPriceInfo.pricePerUnit * hotel.nights * hotel.rooms).toLocaleString("vi-VN")}₫
                        </p>
                      )}
                      {roomPriceInfo && !roomPriceInfo.available && (
                        <p className="text-xs text-red-500">❌ {roomPriceInfo.message}</p>
                      )}
                    </div>
                  )}
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className={labelCls}>Rooms</label><input type="number" min={1} value={hotel.rooms} onChange={e => setHotel({...hotel,rooms:Number(e.target.value)})} className={inputCls}/></div>
                      <div><label className={labelCls}>Adults</label><input type="number" min={1} value={hotel.adults} onChange={e => setHotel({...hotel,adults:Number(e.target.value)})} className={inputCls}/></div>
                      <div><label className={labelCls}>Children</label><input type="number" min={0} value={hotel.children} onChange={e => setHotel({...hotel,children:Number(e.target.value)})} className={inputCls}/></div>
                    </div>
                    <div>
                      <label className={labelCls}>Room Type</label>
                      <select value={hotel.roomType} onChange={e => setHotel({...hotel,roomType:e.target.value})} className={`${inputCls} appearance-none`}>
                        <option value="">Any type</option>
                        <option value="standard">Standard</option>
                        <option value="deluxe">Deluxe</option>
                        <option value="suite">Suite</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Special Requests</label><textarea value={hotel.specialReq} onChange={e => setHotel({...hotel,specialReq:e.target.value})} rows={2} placeholder="Late check-in, extra bed..." className={`${inputCls} resize-none`}/></div>
                  </div>
                )}

                {bookingType === "entertainment" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Date *</label><input type="date" value={ent.date} min={today()} onChange={e => setEnt({...ent,date:e.target.value})} className={inputCls}/></div>
                      <div><label className={labelCls}>Time</label><input type="time" value={ent.time} onChange={e => setEnt({...ent,time:e.target.value})} className={inputCls}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Ticket Type</label><input value={ent.ticketType} onChange={e => setEnt({...ent,ticketType:e.target.value})} placeholder="Standard, VIP..." className={inputCls}/></div>
                      <div><label className={labelCls}>Quantity</label><input type="number" min={1} value={ent.quantity} onChange={e => setEnt({...ent,quantity:Number(e.target.value)})} className={inputCls}/></div>
                    </div>
                    <div><label className={labelCls}>Special Requests</label><textarea value={ent.specialReq} onChange={e => setEnt({...ent,specialReq:e.target.value})} rows={2} placeholder="Accessibility needs..." className={`${inputCls} resize-none`}/></div>
                  </div>
                )}

                {bookingType === "tour" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Departure Date *</label><input type="date" value={tour.date} min={today()} onChange={e => setTour({...tour,date:e.target.value})} className={inputCls}/></div>
                      <div>
                        <label className={labelCls}>Group Type</label>
                        <select value={tour.groupType} onChange={e => setTour({...tour,groupType:e.target.value})} className={`${inputCls} appearance-none`}>
                          <option value="solo">Solo</option>
                          <option value="couple">Couple</option>
                          <option value="friends_male">Friends (All Male)</option>
                          <option value="friends_female">Friends (All Female)</option>
                          <option value="friends_mixed">Friends (Mixed)</option>
                          <option value="family">Family</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Adults</label><input type="number" min={1} value={tour.adults} onChange={e => setTour({...tour,adults:Number(e.target.value)})} className={inputCls}/></div>
                      <div><label className={labelCls}>Children</label><input type="number" min={0} value={tour.children} onChange={e => setTour({...tour,children:Number(e.target.value)})} className={inputCls}/></div>
                    </div>
                    <div><label className={labelCls}>Special Requests</label><textarea value={tour.specialReq} onChange={e => setTour({...tour,specialReq:e.target.value})} rows={2} placeholder="Dietary needs..." className={`${inputCls} resize-none`}/></div>
                  </div>
                )}
              </div>

              {totalGuests > 2 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Companions</p>
                    {bookingType === "restaurant" && restaurant.guests.length < restaurant.partySize - 1 && (
                      <button type="button" onClick={() => addGuest(setRestaurant)} className="text-xs text-blue-600 hover:underline">+ Add</button>
                    )}
                    {bookingType === "tour" && tour.guests.length < (tour.adults+tour.children-1) && (
                      <button type="button" onClick={() => addGuest(setTour)} className="text-xs text-blue-600 hover:underline">+ Add</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {bookingType === "restaurant" && restaurant.guests.map((g,i) => (
                      <GuestRow key={i} index={i} guest={g} onChange={(idx,f,v) => updateGuests(setRestaurant,restaurant.guests,idx,f,v)} onRemove={(idx) => removeGuest(setRestaurant,restaurant.guests,idx)}/>
                    ))}
                    {bookingType === "tour" && tour.guests.map((g,i) => (
                      <GuestRow key={i} index={i} guest={g} onChange={(idx,f,v) => updateGuests(setTour,tour.guests,idx,f,v)} onRemove={(idx) => removeGuest(setTour,tour.guests,idx)}/>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Additional Note</label>
                <textarea value={noteField} onChange={e => setNoteField(e.target.value)} rows={2} placeholder="Any other info..." className={`${inputCls} resize-none`}/>
              </div>

              {location?.booking?.bookingNote && (
                <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  📝 {location.booking.bookingNote}
                </div>
              )}

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
            </>
          )}

          {/* STEP 1 — CONFIRM */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-slate-400">Please review your booking:</p>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Location</span><span className="font-medium text-gray-900 dark:text-white">{location?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Name</span><span className="font-medium text-gray-900 dark:text-white">{contact.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Phone</span><span className="font-medium text-gray-900 dark:text-white">{contact.phone}</span></div>
                {bookingType === "hotel" && <>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Check-in</span><span className="font-medium text-gray-900 dark:text-white">{hotel.checkIn}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Check-out</span><span className="font-medium text-gray-900 dark:text-white">{hotel.checkOut}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Rooms</span><span className="font-medium text-gray-900 dark:text-white">{hotel.rooms} × {hotel.roomType || "any type"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Guests</span><span className="font-medium text-gray-900 dark:text-white">{hotel.adults}A {hotel.children}C</span></div>
                  {roomPriceInfo?.pricePerUnit > 0 && (
                    <>
                      <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Giá / đêm</span>
                        <span className="font-medium text-gray-900 dark:text-white">{fmtVND(roomPriceInfo.pricePerUnit)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400">
                        <span>Tổng giá trị</span>
                        <span>{fmtVND(roomPriceInfo.pricePerUnit * hotel.nights * hotel.rooms)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                        <span>Cần đặt cọc ngay (30%)</span>
                        <span>{fmtVND(Math.round(roomPriceInfo.pricePerUnit * hotel.nights * hotel.rooms * 0.3))}</span>
                      </div>
                    </>
                  )}
                </>}
                {bookingType === "restaurant" && <>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Date & Time</span><span className="font-medium text-gray-900 dark:text-white">{restaurant.date} {restaurant.time}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Party Size</span><span className="font-medium text-gray-900 dark:text-white">{restaurant.partySize} people</span></div>
                </>}
                {bookingType === "entertainment" && <>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Date</span><span className="font-medium text-gray-900 dark:text-white">{ent.date} {ent.time}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Tickets</span><span className="font-medium text-gray-900 dark:text-white">{ent.quantity}× {ent.ticketType||"Standard"}</span></div>
                </>}
                {bookingType === "tour" && <>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Departure</span><span className="font-medium text-gray-900 dark:text-white">{tour.date}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Group</span><span className="font-medium text-gray-900 dark:text-white">{tour.adults}A {tour.children}C</span></div>
                </>}
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <p>💳 Bước tiếp theo: thanh toán đặt cọc qua VNPay</p>
                <p>⏱️ Bạn có 15 phút để hoàn tất thanh toán</p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3 shrink-0">
          <button onClick={step === 0 ? onClose : () => { setStep(0); setError(""); }}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400
                       rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {step === 0 && (
            <button onClick={() => { setError(""); setStep(1); }}
              disabled={!slotInfo?.available && !!slotInfo}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold
                         transition-colors disabled:opacity-50">
              Review →
            </button>
          )}
          {step === 1 && (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold
                         transition-colors disabled:opacity-60">
              {loading ? "Submitting..." : "Tiến hành thanh toán 💳"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}