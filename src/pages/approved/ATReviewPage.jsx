import { useState, useEffect, useCallback } from "react";
import atService from "../../services/at.service";
import {
  PageHeader, SearchBar, Pagination, CategoryBadge, Badge, Modal,
  FormField, Textarea, Button, StatCard,
} from "../../components/ui";

const CAT_LABEL = {
  restaurant:"Restaurant", tourist_spot:"Tourist Spot", hotel:"Hotel",
  cafe:"Cafe", entertainment:"Entertainment", shopping:"Shopping",
  service:"Service", other:"Other",
};

const TAGS = ["Must Visit","Hidden Gem","Family Friendly","Romantic","Budget Friendly",
              "Luxury","Good Food","Great View","Photogenic","Cultural"];

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`text-2xl transition-transform hover:scale-110
                      ${s <= value ? "text-amber-400" : "text-gray-300 dark:text-slate-600"}`}>
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm text-amber-500 font-semibold ml-2 self-center">{value}/5</span>
      )}
    </div>
  );
}

export default function ATReviewPage() {
  const [locations, setLocations]   = useState([]);
  const [pagination, setPag]        = useState({ page:1, totalPages:1, total:0 });
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);

  const [reviewModal, setReviewModal] = useState(null); // location
  const [form, setForm]             = useState({ rating:0, content:"", visitedAt:"", tags:[] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const fetchLocations = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 12 };
      if (search) params.search = search;
      const result = await atService.getLocationsToReview(params);
      setLocations(result.locations);
      setPag(result.pagination);
      setPage(p);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchLocations(1); }, [search]);

  const openReview = (loc) => {
    setReviewModal(loc);
    setForm({ rating:0, content:"", visitedAt:"", tags:[] });
    setError(""); setSuccess("");
  };

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t=>t!==tag) : [...f.tags, tag],
    }));
  };

  const handleSubmit = async () => {
    if (!form.rating) { setError("Please select a rating"); return; }
    if (!form.content.trim() || form.content.length < 30) {
      setError("Review must be at least 30 characters"); return;
    }
    setSubmitting(true); setError("");
    try {
      await atService.writeReview(reviewModal._id, form);
      setSuccess("Review submitted! +2 trust score earned.");
      setTimeout(() => {
        setReviewModal(null);
        fetchLocations(page);
      }, 1500);
    } catch(e) {
      setError(e.response?.data?.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader
        title="Write Expert Reviews"
        subtitle="Share your expertise to help users discover great locations"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Locations to Review" value={pagination.total} icon="📍" color="teal"  />
        <StatCard label="Trust Gained"         value="+2 per review"   icon="⭐" color="amber" />
        <StatCard label="Impact"               value="40% of score"    icon="📊" color="blue"  />
      </div>

      <div className="flex mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search locations..." width="w-72"/>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-44 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-medium text-gray-900 dark:text-white mb-1">All caught up!</p>
          <p className="text-sm">You've reviewed all available locations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc._id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                         rounded-2xl overflow-hidden hover:border-teal-300 dark:hover:border-teal-600
                         transition-all group">
              {/* Image */}
              <div className="h-36 bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
                {loc.images?.[0]?.url ? (
                  <img src={loc.images[0].url} alt={loc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🏞️</div>
                )}
                {/* AT review count badge */}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px]
                                font-medium px-2 py-0.5 rounded-full">
                  {loc.verifiedBy?.length ?? 0} AT reviews
                </div>
              </div>

              <div className="p-4">
                <p className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">{loc.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
                  {loc.address?.city || "—"}
                </p>
                <div className="flex items-center justify-between">
                  <CategoryBadge category={loc.category} size="sm"/>
                  <button
                    onClick={() => openReview(loc)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold
                               px-3 py-1.5 rounded-lg transition-colors">
                    Write Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages}
        total={pagination.total} limit={12} onChange={fetchLocations}/>

      {/* Review Modal */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)}
        title={`Review: ${reviewModal?.name}`} size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setReviewModal(null)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}
              disabled={!form.rating || !form.content.trim()}>
              Submit Review (+2 trust)
            </Button>
          </div>
        }>
        <div className="space-y-4">
          {/* Location info */}
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
            {reviewModal?.images?.[0]?.url ? (
              <img src={reviewModal.images[0].url} alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0"/>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-slate-700
                              flex items-center justify-center text-xl shrink-0">🏞️</div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{reviewModal?.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{reviewModal?.address?.city}</p>
            </div>
          </div>

          {/* Rating */}
          <FormField label="Your Rating *">
            <StarPicker value={form.rating} onChange={(v) => setForm({...form, rating:v})}/>
          </FormField>

          {/* Review content */}
          <FormField label="Expert Review *" hint="Minimum 30 characters. Share specific insights.">
            <Textarea
              value={form.content}
              onChange={(e) => setForm({...form, content:e.target.value})}
              rows={5}
              placeholder="Share your expert insights — best time to visit, hidden spots, photography tips, what to avoid..."/>
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${form.content.length < 30 ? "text-red-400" : "text-gray-400 dark:text-slate-500"}`}>
                {form.content.length} / 30 min
              </span>
            </div>
          </FormField>

          {/* Visit date */}
          <FormField label="Date Visited (optional)">
            <input type="date" value={form.visitedAt}
              onChange={(e) => setForm({...form, visitedAt:e.target.value})}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"/>
          </FormField>

          {/* Tags */}
          <FormField label="Tags (optional)">
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all
                              ${form.tags.includes(tag)
                                ? "bg-teal-600 text-white border-teal-600"
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-teal-400"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </FormField>

          {error   && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
          {success && <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-4 py-3">✅ {success}</p>}
        </div>
      </Modal>
    </div>
  );
}