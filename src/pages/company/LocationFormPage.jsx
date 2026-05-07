import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key:"hotel",         label:"Hotel",          icon:"🏨" },
  { key:"restaurant",    label:"Restaurant",     icon:"🍽️" },
  { key:"cafe",          label:"Café",           icon:"☕" },
  { key:"tourist_spot",  label:"Tourist Spot",   icon:"🏛️" },
  { key:"entertainment", label:"Entertainment",  icon:"🎡" },
  { key:"shopping",      label:"Shopping",       icon:"🛍️" },
  { key:"service",       label:"Service",        icon:"🔧" },
  { key:"other",         label:"Other",          icon:"📍" },
];

const STEPS = ["Information", "Detail", "Policies", "Images", "Review"];

const inputCls = `w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                  rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500`;

const selectCls = inputCls;

function Field({ label, required, error, children }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Category-specific detail forms ──────────────────────────────────────────
function HotelDetails({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Check-in Time">
          <input type="time" value={data.checkInTime || "14:00"}
            onChange={e => set("checkInTime", e.target.value)} className={inputCls}/>
        </Field>
        <Field label="Check-out Time">
          <input type="time" value={data.checkOutTime || "12:00"}
            onChange={e => set("checkOutTime", e.target.value)} className={inputCls}/>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Star Rating">
          <select value={data.starRating || ""} onChange={e => set("starRating", Number(e.target.value) || null)} className={selectCls}>
            <option value="">No rating</option>
            {[1,2,3,4,5].map(s => <option key={s} value={s}>{s} ⭐</option>)}
          </select>
        </Field>
        <Field label="Total Rooms">
          <input type="number" min={1} value={data.totalRooms || ""}
            onChange={e => set("totalRooms", Number(e.target.value) || null)}
            placeholder="e.g. 50" className={inputCls}/>
        </Field>
      </div>
      <Field label="Highlights">
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Press Enter to add, max 5</p>
        <TagInput
          tags={data.highlights || []}
          onChange={tags => set("highlights", tags)}
          max={5} placeholder="e.g. Infinity pool"/>
      </Field>
      <Field label="Hotel Amenities">
        <AmenityInput
          amenities={data.amenities || []}
          onChange={ams => set("amenities", ams)}/>
      </Field>
    </div>
  );
}

function RestaurantDetails({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Cuisine Type">
        <TagInput
          tags={data.cuisineType || []}
          onChange={tags => set("cuisineType", tags)}
          placeholder="e.g. Vietnamese, Seafood"/>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Dress Code">
          <select value={data.dressCode || "none"} onChange={e => set("dressCode", e.target.value)} className={selectCls}>
            <option value="none">No dress code</option>
            <option value="casual">Casual</option>
            <option value="smart_casual">Smart casual</option>
            <option value="formal">Formal</option>
          </select>
        </Field>
        <Field label="Average Meal Duration (minutes)">
          <input type="number" min={15} value={data.avgMealDuration || ""}
            onChange={e => set("avgMealDuration", Number(e.target.value) || null)}
            placeholder="e.g. 90" className={inputCls}/>
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        {[
          ["reservationRequired", "Reservation required"],
          ["servesAlcohol",       "Serves alcohol"],
          ["hasLiveMusic",        "Live music"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!data[key]}
              onChange={e => set(key, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CafeDetails({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Noise Level">
        <select value={data.noiseLevel || "moderate"} onChange={e => set("noiseLevel", e.target.value)} className={selectCls}>
          <option value="quiet">Quiet</option>
          <option value="moderate">Moderate</option>
          <option value="lively">Lively</option>
        </select>
      </Field>
      <div className="flex flex-col gap-2">
        {[
          ["wifiAvailable",      "WiFi available"],
          ["workFriendly",       "Work-friendly"],
          ["hasOutdoorSeating",  "Outdoor seating"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!data[key]}
              onChange={e => set(key, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TouristSpotDetails({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Recommended Visit Duration (minutes)">
          <input type="number" min={15} value={data.recommendedDuration || ""}
            onChange={e => set("recommendedDuration", Number(e.target.value) || null)}
            placeholder="e.g. 120" className={inputCls}/>
        </Field>
        <Field label="Entry Fee (VND, 0 = Free)">
          <input type="number" min={0} value={data.entryFee || 0}
            onChange={e => set("entryFee", Number(e.target.value))} className={inputCls}/>
        </Field>
      </div>
      <Field label="Best Time to Visit">
        <input value={data.bestTimeToVisit || ""}
          onChange={e => set("bestTimeToVisit", e.target.value)}
          placeholder="e.g. Early morning, avoid noon" className={inputCls}/>
      </Field>
      <div className="flex flex-col gap-2">
        {[
          ["accessibility",       "Wheelchair accessible"],
          ["guidedTourAvailable", "Guided tour available"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!data[key]}
              onChange={e => set(key, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function EntertainmentDetails({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Minimum Age">
          <input type="number" min={0} value={data.minAge || 0}
            onChange={e => set("minAge", Number(e.target.value))} className={inputCls}/>
        </Field>
        <Field label="Duration (minutes)">
          <input type="number" min={5} value={data.durationMinutes || ""}
            onChange={e => set("durationMinutes", Number(e.target.value) || null)}
            placeholder="e.g. 60" className={inputCls}/>
        </Field>
        <Field label="Minimum Group Size">
          <input type="number" min={1} value={data.groupSizeMin || 1}
            onChange={e => set("groupSizeMin", Number(e.target.value))} className={inputCls}/>
        </Field>
        <Field label="Maximum Group Size">
          <input type="number" min={1} value={data.groupSizeMax || ""}
            onChange={e => set("groupSizeMax", Number(e.target.value) || null)}
            placeholder="No limit" className={inputCls}/>
        </Field>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!data.requiresBooking}
          onChange={e => set("requiresBooking", e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
        <span className="text-sm text-gray-700 dark:text-slate-300">Booking required in advance</span>
      </label>
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────
function TagInput({ tags, onChange, max = 10, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    const val = input.trim();
    if (!val || tags.includes(val) || tags.length >= max) return;
    onChange([...tags, val]);
    setInput("");
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder} className={inputCls + " flex-1"}/>
        <button type="button" onClick={add}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700">+</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-500/15
                                   text-blue-700 dark:text-blue-400 text-xs px-2.5 py-1 rounded-full">
            {t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}
              className="text-blue-400 hover:text-blue-700 ml-0.5">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function AmenityInput({ amenities, onChange }) {
  const [form, setForm] = useState({ name:"", icon:"🔧", category:"other", isFree:true });
  const CATEGORIES = ["pool","fitness","spa","dining","transport","service","business","entertainment","other"];
  const add = () => {
    if (!form.name.trim()) return;
    // Prevent duplicate amenity names
    if (amenities.some(a => a.name.toLowerCase() === form.name.trim().toLowerCase())) return;
    onChange([...amenities, { ...form, name: form.name.trim() }]);
    setForm({ name:"", icon:"🔧", category:"other", isFree:true });
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input value={form.name} onChange={e => setForm(p=>({...p, name:e.target.value}))}
          placeholder="Amenity name" className={inputCls}/>
        <input value={form.icon} onChange={e => setForm(p=>({...p, icon:e.target.value}))}
          placeholder="Icon (emoji)" className={inputCls}/>
        <select value={form.category} onChange={e => setForm(p=>({...p, category:e.target.value}))}
          className={selectCls}>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isFree}
            onChange={e => setForm(p=>({...p, isFree:e.target.checked}))}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
          <span className="text-sm text-gray-700 dark:text-slate-300">Free</span>
        </label>
      </div>
      <button type="button" onClick={add}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700">
        + Add Amenity
      </button>
      <div className="flex flex-wrap gap-1.5">
        {amenities.map((a, i) => (
          <span key={i} className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800
                                   text-gray-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full">
            {a.icon} {a.name} {a.isFree ? "(free)" : ""}
            <button type="button" onClick={() => onChange(amenities.filter((_, j) => j !== i))}
              className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Policy step ──────────────────────────────────────────────────────────────
function PolicyForm({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v || null });
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Leave blank to inherit from your company default policy.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Chính sách huỷ">
          <select value={data.cancellation || ""} onChange={e => set("cancellation", e.target.value)} className={selectCls}>
            <option value="">Inherit from company</option>
            <option value="flexible">Flexible — full refund 24h before</option>
            <option value="moderate">Moderate — full refund 72h before</option>
            <option value="strict">Strict — full refund 7 days before</option>
            <option value="non_refundable">Non-refundable</option>
          </select>
        </Field>
        <Field label="Hút thuốc">
          <select value={data.smoking || ""} onChange={e => set("smoking", e.target.value)} className={selectCls}>
            <option value="">Inherit from company</option>
            <option value="not_allowed">Not allowed</option>
            <option value="outdoor_only">Outdoor only</option>
            <option value="allowed">Allowed</option>
          </select>
        </Field>
        <Field label="Thú cưng">
          <select value={data.pets || ""} onChange={e => set("pets", e.target.value)} className={selectCls}>
            <option value="">Inherit from company</option>
            <option value="not_allowed">Not allowed</option>
            <option value="on_request">On request</option>
            <option value="allowed">Allowed</option>
          </select>
        </Field>
        <Field label="Trẻ em">
          <select value={data.children || ""} onChange={e => set("children", e.target.value)} className={selectCls}>
            <option value="">Inherit from company</option>
            <option value="allowed">All ages welcome</option>
            <option value="age_12_up">Age 12+</option>
            <option value="not_allowed">No children</option>
          </select>
        </Field>
      </div>
      <Field label="Quy định thêm">
        <textarea value={data.customNotes || ""} onChange={e => onChange({...data, customNotes:e.target.value})}
          rows={3} placeholder="e.g. Check-in deposit required, quiet hours after 10pm"
          className={inputCls}/>
      </Field>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
const DETAIL_INFO_KEY = {
  hotel:         "hotelInfo",
  restaurant:    "restaurantInfo",
  cafe:          "cafeInfo",
  tourist_spot:  "touristSpotInfo",
  entertainment: "entertainmentInfo",
};

export default function LocationFormPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [step,    setStep]    = useState(0);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [savedId, setSavedId] = useState(null); // ID after first save — needed for image upload
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [basic, setBasic] = useState({
    name: "", category: "hotel", description: "",
    address: { street:"", district:"", city:"", province:"", country:"Việt Nam", full:"" },
    priceRange: { label: "budget" },
  });
  const [details,  setDetails]  = useState({});
  const [policy,   setPolicy]   = useState({});

  // Load existing location for edit
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/locations/${id}`).then(({ data }) => {
      const loc = data.data?.location || data.data;
      if (!loc) return;
      const { hotelInfo, restaurantInfo, cafeInfo, touristSpotInfo, entertainmentInfo, policy: pol, ...rest } = loc;
      setBasic(rest);
      setDetails(hotelInfo || restaurantInfo || cafeInfo || touristSpotInfo || entertainmentInfo || {});
      setPolicy(pol || {});
    }).catch(console.error);
  }, [id]);

  const detailInfoKey = DETAIL_INFO_KEY[basic.category];

  const validate = () => {
    const e = {};
    if (!basic.name?.trim())              e.name        = "Tên địa điểm là bắt buộc";
    if (!basic.category)                  e.category    = "Vui lòng chọn loại địa điểm";
    if (!basic.address?.city?.trim())     e.city        = "Thành phố là bắt buộc";
    if (!basic.address?.district?.trim()) e.district    = "Quận/Huyện là bắt buộc";
    if (basic.description && basic.description.trim().length > 0 && basic.description.trim().length < 20)
      e.description = "Mô tả phải có ít nhất 20 ký tự";
    return e;
  };

  const handleNext = () => {
    if (step === 0) {
      const e = validate();
      if (Object.keys(e).length) { setErrors(e); return; }
      setErrors({});
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    // On step 3 (Policy) → save location, then go to Photos step
    if (step === 3) {
      setSaving(true);
      try {
        const payload = { ...basic, [detailInfoKey]: details, policy };
        let locationId = savedId || id;
        if (isEdit && !savedId) {
          await api.put(`/locations/${id}`, payload);
          locationId = id;
        } else if (!locationId) {
          const { data } = await api.post("/locations", payload);
          locationId = data.data?.location?._id || data.data?._id;
          setSavedId(locationId);
        } else {
          await api.put(`/locations/${locationId}`, payload);
        }
        setSavedId(locationId);
        setStep(4); // go to Photos
      } catch (e) {
        setErrors({ server: e.response?.data?.message || "Save failed" });
      } finally { setSaving(false); }
      return;
    }
    // Final publish (from Review step)
    navigate("/company/locations");
  };

  const handleUploadPhotos = async (files) => {
    const locationId = savedId || id;
    if (!locationId || !files.length) return;
    setUploadingPhotos(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("images", f));
      await api.post(`/upload/locations/${locationId}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (e) {
      setErrors({ photos: e.response?.data?.message || "Upload failed" });
    } finally { setUploadingPhotos(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/company/locations")}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white">←</button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {isEdit ? "Edit Location" : "Add New Location"}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < step  ? "bg-emerald-500 text-white"
              : i === step ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-slate-700 text-gray-400"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-gray-900 dark:text-white font-medium" : "text-gray-400"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200 dark:bg-slate-700"/>}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">

        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Tên địa điểm" required error={errors.name}>
              <input value={basic.name} onChange={e => setBasic(p=>({...p, name:e.target.value}))}
                placeholder="e.g. Capella Hanoi" className={inputCls}/>
            </Field>

            <Field label="Loại địa điểm" required error={errors.category}>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(({ key, label, icon }) => (
                  <button key={key} type="button"
                    onClick={() => setBasic(p=>({...p, category:key}))}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs
                                transition-all ${basic.category === key
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                  : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300"}`}>
                    <span className="text-lg">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Mô tả địa điểm" error={errors.description}>
              <textarea value={basic.description || ""} onChange={e => setBasic(p=>({...p, description:e.target.value}))}
                rows={3} placeholder="Giới thiệu về địa điểm của bạn (tối thiểu 20 ký tự)..." className={inputCls}/>
              {basic.description?.length > 0 && (
                <p className={`text-xs mt-1 ${basic.description.trim().length < 20 ? "text-red-400" : "text-gray-400"}`}>
                  {basic.description.trim().length} / 20 ký tự tối thiểu
                </p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Thành phố" required error={errors.city}>
                <input value={basic.address?.city || ""} onChange={e => setBasic(p=>({...p, address:{...p.address, city:e.target.value}}))}
                  placeholder="Hanoi" className={inputCls}/>
              </Field>
              <Field label="Quận / Huyện" required error={errors.district}>
                <input value={basic.address?.district || ""} onChange={e => setBasic(p=>({...p, address:{...p.address, district:e.target.value}}))}
                  placeholder="Hoàn Kiếm" className={inputCls}/>
              </Field>
              <Field label="Địa chỉ đường">
                <input value={basic.address?.street || ""} onChange={e => setBasic(p=>({...p, address:{...p.address, street:e.target.value}}))}
                  placeholder="12 Lê Phụng Hiểu" className={inputCls}/>
              </Field>
              <Field label="Tỉnh / Thành">
                <input value={basic.address?.province || ""} onChange={e => setBasic(p=>({...p, address:{...p.address, province:e.target.value}}))}
                  placeholder="Hà Nội" className={inputCls}/>
              </Field>
            </div>

            <Field label="Mức giá">
              <select value={basic.priceRange?.label || "budget"}
                onChange={e => setBasic(p=>({...p, priceRange:{...p.priceRange, label:e.target.value}}))}
                className={selectCls}>
                <option value="free">Free</option>
                <option value="budget">Budget ($)</option>
                <option value="mid">Mid-range ($$)</option>
                <option value="high">High-end ($$$)</option>
                <option value="luxury">Luxury ($$$$)</option>
              </select>
            </Field>
          </div>
        )}

        {/* ── Step 1: Category-specific Details ── */}
        {step === 1 && (
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">
              {CATEGORIES.find(c=>c.key===basic.category)?.icon} {CATEGORIES.find(c=>c.key===basic.category)?.label} details
            </p>
            {basic.category === "hotel"         && <HotelDetails         data={details} onChange={setDetails}/>}
            {basic.category === "restaurant"    && <RestaurantDetails    data={details} onChange={setDetails}/>}
            {basic.category === "cafe"          && <CafeDetails          data={details} onChange={setDetails}/>}
            {basic.category === "tourist_spot"  && <TouristSpotDetails   data={details} onChange={setDetails}/>}
            {basic.category === "entertainment" && <EntertainmentDetails data={details} onChange={setDetails}/>}
            {!["hotel","restaurant","cafe","tourist_spot","entertainment"].includes(basic.category) && (
              <p className="text-gray-400 dark:text-slate-500 text-sm">No additional details required for this category.</p>
            )}
          </div>
        )}

        {/* ── Step 2: Policy ── */}
        {step === 2 && <PolicyForm data={policy} onChange={setPolicy}/>}

        {/* ── Step 3: Photos ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Upload photos for your location. The first photo will be the main cover image.
            </p>
            <label className={`flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-2xl
                               cursor-pointer transition-colors
                               ${uploadingPhotos
                                 ? "border-gray-200 dark:border-slate-700 opacity-60 cursor-wait"
                                 : "border-gray-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/5"}`}>
              <span className="text-3xl">📷</span>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {uploadingPhotos ? "Uploading..." : "Click to upload photos"}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  JPG, PNG, WEBP · Max 5MB each · Multiple files allowed
                </p>
              </div>
              <input type="file" multiple accept="image/*" className="hidden"
                disabled={uploadingPhotos}
                onChange={e => handleUploadPhotos(e.target.files)}/>
            </label>
            {errors.photos && (
              <p className="text-sm text-red-500">{errors.photos}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-slate-500">
              💡 You can also add or change photos later from your location settings.
            </p>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{basic.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{CATEGORIES.find(c=>c.key===basic.category)?.icon} {basic.category}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{[basic.address?.street, basic.address?.district, basic.address?.city].filter(Boolean).join(", ")}</p>
            </div>
            {errors.server && (
              <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                {errors.server}
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Your location will be submitted for review. Admin will approve within 1-3 business days.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button type="button" disabled={step === 0} onClick={() => setStep(s => s - 1)}
            className="px-5 py-2.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700
                       dark:hover:text-white disabled:opacity-0 transition-colors">
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={step === 3 ? handleSubmit : handleNext}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm
                         font-semibold rounded-xl transition-colors disabled:opacity-60">
              {step === 3 ? (saving ? "Saving..." : "Save & Continue →")
               : step === 4 ? "Next →"
               : "Continue →"}
            </button>
          ) : (
            <button type="button" onClick={() => navigate("/company/locations")} disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm
                         font-semibold rounded-xl transition-colors disabled:opacity-60">
              {isEdit ? "Done" : "Publish Location 🎉"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}