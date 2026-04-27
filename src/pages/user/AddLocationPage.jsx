import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../lib/axios";
import { ImageUpload, TagSelector } from "../../components/ui";
import { useAuth } from "../../context/useAuth";

const CATEGORIES = [
  "Sight & Landmark", "Restaurant", "Hotel & Resort", "Cafe",
  "Entertainment", "Shopping", "Nature & Park", "Museum", "Other",
];
const CATEGORY_MAP = {
  "Sight & Landmark": "tourist_spot", "Restaurant": "restaurant",
  "Hotel & Resort": "hotel", "Cafe": "cafe", "Entertainment": "entertainment",
  "Shopping": "shopping", "Nature & Park": "tourist_spot",
  "Museum": "tourist_spot", "Other": "other",
};
const BOOKING_TYPES = [
  { key:"restaurant", label:"🍽️ Restaurant" }, { key:"hotel", label:"🏨 Hotel" },
  { key:"entertainment", label:"🎡 Entertainment" }, { key:"tour", label:"🗺️ Tour" },
];
const PRICE_TIERS = [
  { key:"budget", label:"$", sub:"Budget" }, { key:"moderate", label:"$$", sub:"Moderate" },
  { key:"luxury", label:"$$$", sub:"Luxury" },
];
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABELS = { monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu", friday:"Fri", saturday:"Sat", sunday:"Sun" };
const TABS_COMPANY = ["Basic Info", "Photos", "Tags", "Hours & Booking", "Address", "Contact"];
const TABS_AT      = ["Basic Info", "Photos", "Tags", "Address"];

const DEFAULT_HOURS = {
  monday:    { open:"08:00", close:"22:00", closed:false },
  tuesday:   { open:"08:00", close:"22:00", closed:false },
  wednesday: { open:"08:00", close:"22:00", closed:false },
  thursday:  { open:"08:00", close:"22:00", closed:false },
  friday:    { open:"08:00", close:"22:00", closed:false },
  saturday:  { open:"08:00", close:"22:00", closed:false },
  sunday:    { open:"08:00", close:"22:00", closed:true  },
};

export default function AddLocationPage() {
  const navigate       = useNavigate();
  const { id: editId } = useParams();
  const { user }       = useAuth();

  const isCompany = ["company","admin"].includes(user?.role);
  const isAT      = ["approved","admin"].includes(user?.role);
  const TABS      = isCompany ? TABS_COMPANY : TABS_AT;

  // ── ALL HOOKS BEFORE ANY RETURN ───────────────────────────────────────────
  const [activeTab,  setActiveTab]  = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [locationId, setLocationId] = useState(editId || null);
  const [images,     setImages]     = useState([]);
  const [tags,       setTags]       = useState([]);
  const [form, setForm] = useState({
    name:"", category:"Sight & Landmark", description:"", priceRange:"moderate",
    street:"", lng:"", lat:"", phone:"", website:"",
    isBookable:false, bookingType:"hotel", totalSlots:0, appSlots:0,
    maxGuestsPerBook:10, minGuestsPerBook:1,
    depositRequired:false, depositAmount:0, bookingNote:"",
    openingHours: DEFAULT_HOURS,
    closedDates:[],
  });

  // Load existing data in edit mode
  useEffect(() => {
    if (!editId) return;
    api.get(`/locations/${editId}`)
      .then(r => {
        const loc = r.data.data?.location ?? r.data.data ?? r.data;
        if (!loc) return;
        setImages(loc.images || []);
        setTags((loc.tags || []).map(t => t._id || t));
        const catReverse = Object.entries(CATEGORY_MAP).find(([,v]) => v === loc.category)?.[0] || "Other";
        setForm(f => ({
          ...f,
          name:        loc.name        || "",
          category:    catReverse,
          description: loc.description || "",
          priceRange:  loc.priceRange?.label || "budget",
          street:      loc.address?.full || loc.address?.street || "",
          lat:         loc.coordinates?.coordinates?.[1] || "",
          lng:         loc.coordinates?.coordinates?.[0] || "",
          phone:       loc.contact?.phone   || "",
          website:     loc.contact?.website || "",
          isBookable:       loc.booking?.isBookable       || false,
          bookingType:      loc.booking?.bookingType      || "hotel",
          totalSlots:       loc.booking?.totalSlots       || 0,
          appSlots:         loc.booking?.appSlots         || 0,
          maxGuestsPerBook: loc.booking?.maxGuestsPerBook || 10,
          minGuestsPerBook: loc.booking?.minGuestsPerBook || 1,
          depositRequired:  loc.booking?.depositRequired  || false,
          depositAmount:    loc.booking?.depositAmount    || 0,
          bookingNote:      loc.booking?.bookingNote      || "",
          openingHours:     loc.openingHours || DEFAULT_HOURS,
          closedDates:      loc.booking?.closedDates      || [],
        }));
      })
      .catch(console.error);
  }, [editId]);

  // ── Permission check AFTER hooks ──────────────────────────────────────────
  if (user && !isCompany && !isAT) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-semibold text-gray-900 mb-1">Permission Required</p>
          <p className="text-sm text-gray-500 mb-4">Only Approved Team and Company accounts can add locations.</p>
          <Link to="/explore" className="text-blue-600 underline text-sm">Back to Explore</Link>
        </div>
      </div>
    );
  }

  const f = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const handleSaveDraft = async () => {
    if (!form.name.trim()) { setError("Location name is required"); return; }
    setSaving(true); setError("");
    try {
      const categorySlug = CATEGORY_MAP[form.category] || "other";
      const payload = {
        name: form.name, category: categorySlug, description: form.description,
        address: { full: form.street },
        coordinates: { type:"Point", coordinates:[parseFloat(form.lng)||0, parseFloat(form.lat)||0] },
        priceRange: { label: form.priceRange },
        tags, openingHours: form.openingHours,
        booking: {
          isBookable: form.isBookable,
          bookingType: form.isBookable ? form.bookingType : "none",
          totalSlots: Number(form.totalSlots), appSlots: Number(form.appSlots),
          maxGuestsPerBook: Number(form.maxGuestsPerBook), minGuestsPerBook: Number(form.minGuestsPerBook),
          depositRequired: form.depositRequired, depositAmount: Number(form.depositAmount),
          bookingNote: form.bookingNote, closedDates: form.closedDates,
        },
        contact: { phone: form.phone, website: form.website },
      };

      if (locationId) {
        await api.put(`/locations/${locationId}`, payload);
      } else {
        const { data } = await api.post("/locations", payload);
        setLocationId(data.data.location._id);
        setImages(data.data.location.images || []);
        if (activeTab === 0) setActiveTab(1);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save location");
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    setSaving(true); setError("");
    try {
      await handleSaveDraft();
      // Navigate về đúng chỗ theo role
      if (isCompany) navigate("/company/locations");
      else           navigate("/approved/locations");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to publish");
    } finally { setSaving(false); }
  };

  const inputCls = `w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm
                    text-gray-900 placeholder-gray-400 focus:outline-none
                    focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all`;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto px-5 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-4">
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">← Back</button>
          <span className="text-gray-400">›</span>
          <span className="text-gray-700 font-medium">{editId ? "Edit Location" : "Add New Location"}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{editId ? "Edit Location" : "Add New Location"}</h1>
        <p className="text-gray-500 text-sm mb-6">Fill in the details to list a new travel spot.</p>

        {/* Tab bar */}
        <div className="flex bg-gray-200 rounded-full p-1 mb-6 w-fit gap-1 flex-wrap">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                          ${activeTab === i ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab}
              {tab === "Photos" && images.length > 0 && <span className="ml-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">{images.length}</span>}
              {tab === "Tags"   && tags.length   > 0 && <span className="ml-1.5 text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">{tags.length}</span>}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">

          {/* TAB 0: BASIC INFO */}
          {activeTab === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1.5">Location Name *</label>
                  <input {...f("name")} placeholder="e.g. The Grand Central Park" className={inputCls}/>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className={`${inputCls} appearance-none`}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">Description</label>
                <textarea {...f("description")} rows={4} placeholder="Tell us more about this place..." className={`${inputCls} resize-none`}/>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-3">Price Range</label>
                <div className="flex gap-3">
                  {PRICE_TIERS.map(({ key, label, sub }) => (
                    <button key={key} onClick={() => setForm({...form, priceRange: key})}
                      className={`flex-1 flex flex-col items-center py-4 rounded-xl border-2 transition-all
                                  ${form.priceRange === key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
                      <span className="font-bold text-base">{label}</span>
                      <span className="text-xs mt-0.5">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
            </div>
          )}

          {/* TAB 1: PHOTOS */}
          {activeTab === 1 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Photos</h3>
              {!locationId ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-4">Save your location first before uploading photos.</p>
                  <button onClick={handleSaveDraft} disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-full disabled:opacity-60">
                    {saving ? "Saving..." : "Save & Continue"}
                  </button>
                </div>
              ) : (
                <ImageUpload locationId={locationId} images={images} onChange={setImages} maxImages={10}/>
              )}
            </div>
          )}

          {/* TAB 2: TAGS */}
          {activeTab === 2 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Tags</h3>
              <TagSelector selected={tags} onChange={setTags} category={CATEGORY_MAP[form.category] || "other"} max={10}/>
            </div>
          )}

          {/* TAB 3: HOURS & BOOKING (company) */}
          {isCompany && activeTab === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Opening Hours</h3>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <div className="w-16 text-sm font-medium text-gray-700 shrink-0">{DAY_LABELS[day]}</div>
                      <label className="flex items-center gap-1.5 shrink-0">
                        <input type="checkbox"
                          checked={form.openingHours[day]?.closed || false}
                          onChange={e => setForm({...form, openingHours: {...form.openingHours, [day]: {...form.openingHours[day], closed: e.target.checked}}})}
                          className="w-3.5 h-3.5 accent-red-500"/>
                        <span className="text-xs text-gray-500">Closed</span>
                      </label>
                      {!form.openingHours[day]?.closed && (
                        <>
                          <input type="time" value={form.openingHours[day]?.open || "08:00"}
                            onChange={e => setForm({...form, openingHours: {...form.openingHours, [day]: {...form.openingHours[day], open: e.target.value}}})}
                            className={`${inputCls} w-32`}/>
                          <span className="text-gray-400 text-sm">→</span>
                          <input type="time" value={form.openingHours[day]?.close || "22:00"}
                            onChange={e => setForm({...form, openingHours: {...form.openingHours, [day]: {...form.openingHours[day], close: e.target.value}}})}
                            className={`${inputCls} w-32`}/>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Booking / Reservation</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">Accept bookings via app</span>
                    <div onClick={() => setForm({...form, isBookable: !form.isBookable})}
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.isBookable ? "bg-blue-600" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.isBookable ? "left-5" : "left-0.5"}`}/>
                    </div>
                  </label>
                </div>
                {form.isBookable && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {BOOKING_TYPES.map(({ key, label }) => (
                        <button key={key} onClick={() => setForm({...form, bookingType: key})}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all
                                      ${form.bookingType === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Total Slots</label><input type="number" min={0} value={form.totalSlots} onChange={e => setForm({...form, totalSlots: e.target.value})} className={inputCls}/></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">App Slots</label><input type="number" min={0} value={form.appSlots} onChange={e => setForm({...form, appSlots: e.target.value})} className={inputCls}/></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Min guests</label><input type="number" min={1} value={form.minGuestsPerBook} onChange={e => setForm({...form, minGuestsPerBook: e.target.value})} className={inputCls}/></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Max guests</label><input type="number" min={1} value={form.maxGuestsPerBook} onChange={e => setForm({...form, maxGuestsPerBook: e.target.value})} className={inputCls}/></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking Note</label>
                      <textarea value={form.bookingNote} onChange={e => setForm({...form, bookingNote: e.target.value})} rows={2} className={`${inputCls} resize-none`}/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ADDRESS */}
          {activeTab === (isCompany ? 4 : 3) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-2">Address & Map</h3>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">Street Address</label>
                <input {...f("street")} placeholder="Search address..." className={inputCls}/>
              </div>
              <div className="bg-gray-200 rounded-2xl h-52 flex items-center justify-center">
                <span className="text-gray-500 text-sm">📍 Map placeholder</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-gray-700 text-sm font-medium mb-1.5">Longitude</label><input {...f("lng")} type="number" step="any" placeholder="105.852" className={inputCls}/></div>
                <div><label className="block text-gray-700 text-sm font-medium mb-1.5">Latitude</label><input {...f("lat")} type="number" step="any" placeholder="21.028" className={inputCls}/></div>
              </div>
            </div>
          )}

          {/* TAB: CONTACT (Company only) */}
          {isCompany && activeTab === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-2">Contact Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-gray-700 text-sm font-medium mb-1.5">Phone</label><input {...f("phone")} placeholder="+84..." className={inputCls}/></div>
                <div><label className="block text-gray-700 text-sm font-medium mb-1.5">Website</label><input {...f("website")} placeholder="https://..." className={inputCls}/></div>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between">
          <button onClick={handleSaveDraft} disabled={saving}
            className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-60">
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <div className="flex gap-3">
            {activeTab > 0 && (
              <button onClick={() => setActiveTab(activeTab - 1)}
                className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50">
                Previous
              </button>
            )}
            {activeTab < TABS.length - 1 ? (
              <button onClick={async () => { await handleSaveDraft(); setActiveTab(t => t + 1); }} disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl disabled:opacity-60">
                {saving ? "Saving..." : "Next →"}
              </button>
            ) : (
              <button onClick={handlePublish} disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl disabled:opacity-60">
                {saving ? "Publishing..." : editId ? "Save Changes" : "Publish Location"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}