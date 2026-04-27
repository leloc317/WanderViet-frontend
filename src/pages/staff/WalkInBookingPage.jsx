import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";

const today = () => new Date().toISOString().split("T")[0];
const inputCls = `w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                  text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25`;
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5";

export default function WalkInBookingPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const locationId = user?.staffInfo?.location?._id ?? user?.staffInfo?.location;

  const [bookingType, setBookingType] = useState("hotel");
  const [contact, setContact] = useState({ name:"", phone:"", email:"", age:"", gender:"" });
  const [hotel,   setHotel]   = useState({
    checkIn: today(), checkOut:"", nights:1,
    rooms:1, roomType:"standard", adults:1, children:0, specialReq:"",
  });
  const [restaurant, setRestaurant] = useState({
    date: today(), time:"12:00", partySize:2, seatingPref:"no_preference", specialReq:"",
  });
  const [ent, setEnt]   = useState({ date:today(), time:"", ticketType:"", quantity:1, specialReq:"" });
  const [note, setNote] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(null);

  const set = (setter, k, v) => setter(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!contact.name || !contact.phone) return setError("Tên và số điện thoại bắt buộc");
    if (!locationId) return setError("No location assigned");
    setSaving(true); setError("");
    try {
      const body = {
        locationId,
        bookingType,
        contactName:  contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        age:          contact.age ? Number(contact.age) : undefined,
        gender:       contact.gender,
        userNote:     note,
        isWalkIn:     true,
      };
      if (bookingType === "hotel")         body.hotelDetails         = hotel;
      if (bookingType === "restaurant")    body.restaurantDetails    = restaurant;
      if (bookingType === "entertainment") body.entertainmentDetails = ent;

      const { data } = await api.post("/bookings/walk-in", body);
      setSuccess(data.data.order);
    } catch (e) { setError(e.response?.data?.message ?? "Lỗi tạo booking"); }
    finally { setSaving(false); }
  };

  if (success) return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/15 rounded-full flex items-center
                      justify-center mx-auto mb-5 text-4xl">✅</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Walk-in Booking Created</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
        {success.contactName} — #{success._id.slice(-8).toUpperCase()}
      </p>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Status: <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{success.status}</span>
      </p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate(`/staff/bookings/${success._id}`)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
          View Booking
        </button>
        <button onClick={() => { setSuccess(null); setContact({ name:"",phone:"",email:"",age:"",gender:"" }); }}
          className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-600 dark:text-slate-400">
          New Walk-in
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Walk-in Booking</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Tạo booking trực tiếp cho khách tại quầy
        </p>
      </div>

      {/* Booking type */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Loại booking
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key:"hotel",         icon:"🏨", label:"Hotel" },
            { key:"restaurant",    icon:"🍽️", label:"Restaurant" },
            { key:"entertainment", icon:"🎡", label:"Entertainment" },
          ].map(t => (
            <button key={t.key} onClick={() => setBookingType(t.key)}
              className={`py-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1
                          ${bookingType === t.key
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Thông tin khách
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tên khách *</label>
              <input value={contact.name} onChange={e => set(setContact,"name",e.target.value)} placeholder="Nguyễn Văn A" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Số điện thoại *</label>
              <input value={contact.phone} onChange={e => set(setContact,"phone",e.target.value)} placeholder="0912..." className={inputCls}/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Email</label>
              <input value={contact.email} onChange={e => set(setContact,"email",e.target.value)} placeholder="email@..." className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Tuổi</label>
              <input type="number" value={contact.age} onChange={e => set(setContact,"age",e.target.value)} placeholder="30" className={inputCls}/>
            </div>
          </div>
        </div>
      </div>

      {/* Booking details */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Chi tiết đặt chỗ
        </p>

        {bookingType === "hotel" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Check-in</label>
                <input type="date" value={hotel.checkIn} min={today()}
                  onChange={e => { const ci=e.target.value; const co=hotel.checkOut&&hotel.checkOut>ci?hotel.checkOut:""; const n=co?Math.ceil((new Date(co)-new Date(ci))/86400000):1; setHotel({...hotel,checkIn:ci,checkOut:co,nights:n}); }}
                  className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Check-out</label>
                <input type="date" value={hotel.checkOut} min={hotel.checkIn||today()}
                  onChange={e => { const co=e.target.value; const n=Math.ceil((new Date(co)-new Date(hotel.checkIn))/86400000); setHotel({...hotel,checkOut:co,nights:n>0?n:1}); }}
                  className={inputCls}/>
              </div>
            </div>
            {hotel.checkIn && hotel.checkOut && (
              <p className="text-xs text-blue-600 dark:text-blue-400">📅 {hotel.nights} đêm</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Phòng</label>
                <input type="number" min={1} value={hotel.rooms} onChange={e => set(setHotel,"rooms",Number(e.target.value))} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Người lớn</label>
                <input type="number" min={1} value={hotel.adults} onChange={e => set(setHotel,"adults",Number(e.target.value))} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Trẻ em</label>
                <input type="number" min={0} value={hotel.children} onChange={e => set(setHotel,"children",Number(e.target.value))} className={inputCls}/>
              </div>
            </div>
            <div>
              <label className={labelCls}>Loại phòng</label>
              <select value={hotel.roomType} onChange={e => set(setHotel,"roomType",e.target.value)} className={inputCls}>
                <option value="standard">Standard</option>
                <option value="deluxe">Deluxe</option>
                <option value="suite">Suite</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          </div>
        )}

        {bookingType === "restaurant" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ngày</label>
                <input type="date" value={restaurant.date} min={today()} onChange={e => set(setRestaurant,"date",e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Giờ</label>
                <input type="time" value={restaurant.time} onChange={e => set(setRestaurant,"time",e.target.value)} className={inputCls}/>
              </div>
            </div>
            <div>
              <label className={labelCls}>Số khách</label>
              <input type="number" min={1} value={restaurant.partySize} onChange={e => set(setRestaurant,"partySize",Number(e.target.value))} className={inputCls}/>
            </div>
          </div>
        )}

        {bookingType === "entertainment" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ngày</label>
                <input type="date" value={ent.date} min={today()} onChange={e => set(setEnt,"date",e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Giờ</label>
                <input type="time" value={ent.time} onChange={e => set(setEnt,"time",e.target.value)} className={inputCls}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Loại vé</label>
                <input value={ent.ticketType} onChange={e => set(setEnt,"ticketType",e.target.value)} placeholder="Standard" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Số lượng</label>
                <input type="number" min={1} value={ent.quantity} onChange={e => set(setEnt,"quantity",Number(e.target.value))} className={inputCls}/>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <label className={labelCls}>Ghi chú</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
          placeholder="Yêu cầu đặc biệt của khách..."
          className={`${inputCls} resize-none`}/>
      </div>

      {/* Walk-in notice */}
      <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20
                      rounded-2xl px-4 py-3 mb-5">
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          ✅ Walk-in booking sẽ được xác nhận ngay, không cần qua thanh toán online
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold
                   text-sm transition-colors disabled:opacity-60">
        {saving ? "Đang tạo..." : "✓ Tạo Walk-in Booking"}
      </button>
    </div>
  );
}