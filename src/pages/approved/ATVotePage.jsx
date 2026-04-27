import { useState, useEffect, useCallback } from "react";
import atService from "../../services/at.service";
import {
  PageHeader, Pagination, Badge, Modal,
  FormField, Textarea, Button, StatCard,
} from "../../components/ui";

const CAT_LABEL = {
  food_tour:"Food Tour", sightseeing:"Sightseeing", adventure:"Adventure",
  cultural:"Cultural", relaxation:"Relaxation", shopping:"Shopping", mixed:"Mixed",
};

export default function ATVotePage() {
  const [tours, setTours]         = useState([]);
  const [pagination, setPag]      = useState({ page:1, totalPages:1, total:0 });
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);

  const [voteModal, setVoteModal]   = useState(null);
  const [voteForm, setVoteForm]     = useState({ vote:"approve", comment:"" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const fetchTours = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const result = await atService.getToursToVote({ page: p, limit: 10 });
      setTours(result.tours);
      setPag(result.pagination);
      setPage(p);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTours(1); }, []);

  const openVote = (tour) => {
    setVoteModal(tour);
    setVoteForm({ vote:"approve", comment:"" });
    setError("");
  };

  const handleVote = async () => {
    setSubmitting(true); setError("");
    try {
      await atService.voteOnTour(voteModal._id, voteForm);
      setVoteModal(null);
      fetchTours(page);
    } catch(e) {
      setError(e.response?.data?.message || "Vote failed");
    } finally { setSubmitting(false); }
  };

  const VOTE_OPTS = [
    { v:"approve", label:"✓ Approve", desc:"Tour is well-structured and ready",
      active:"bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-300" },
    { v:"neutral", label:"~ Neutral",  desc:"Tour is acceptable but could improve",
      active:"bg-gray-100 border-gray-400 text-gray-700 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-200" },
    { v:"reject",  label:"✕ Reject",  desc:"Tour needs major revision",
      active:"bg-red-50 border-red-500 text-red-700 dark:bg-red-500/20 dark:border-red-400 dark:text-red-300" },
  ];

  const inactive = "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600";

  return (
    <div>
      <PageHeader
        title="Vote on Tours"
        subtitle="Help curate quality itineraries for users"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Tours to Vote"  value={pagination.total} icon="🗳️" color="teal"   />
        <StatCard label="Trust Gained"   value="+1 per vote"      icon="⭐" color="amber"  />
        <StatCard label="Impact"         value="AT decides approval" icon="📊" color="blue" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>
          ))}
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-medium text-gray-900 dark:text-white mb-1">All tours voted!</p>
          <p className="text-sm">Check back later for new tours to review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tours.map(tour => {
            const total = (tour.voteStats?.approve??0) + (tour.voteStats?.neutral??0) + (tour.voteStats?.reject??0);
            const approveRatio = total > 0 ? Math.round((tour.voteStats?.approve??0) / total * 100) : 0;

            return (
              <div key={tour._id}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                           rounded-2xl px-5 py-4 hover:border-teal-300 dark:hover:border-teal-600 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{tour.title}</p>
                      <Badge label={CAT_LABEL[tour.category]||tour.category} color="blue" size="sm"/>
                      {tour.budget?.label && (
                        <Badge label={tour.budget.label} color="amber" size="sm"/>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-2 line-clamp-2">
                      {tour.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-400 dark:text-slate-500">
                        By {tour.submittedBy?.name || "Unknown"}
                      </span>
                      <span className="text-gray-400 dark:text-slate-500">
                        {tour.duration?.days || 1}d {tour.duration?.nights || 0}n
                      </span>
                      {total > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-medium">{tour.voteStats?.approve??0}✓</span>
                          <span className="text-red-500 font-medium">{tour.voteStats?.reject??0}✗</span>
                          <span className="text-gray-400">{tour.voteStats?.neutral??0}~</span>
                          <span className="text-gray-400">({total} votes, {approveRatio}% approve)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => openVote(tour)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold
                               px-4 py-2 rounded-xl transition-colors shrink-0">
                    Vote
                  </button>
                </div>

                {/* Vote progress bar */}
                {total > 0 && (
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all"
                         style={{ width: `${approveRatio}%` }}/>
                    <div className="bg-red-400 h-full transition-all"
                         style={{ width: `${Math.round((tour.voteStats?.reject??0)/total*100)}%` }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages}
        total={pagination.total} limit={10} onChange={fetchTours}/>

      {/* Vote Modal */}
      <Modal open={!!voteModal} onClose={() => setVoteModal(null)}
        title={`Vote: ${voteModal?.title}`} size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setVoteModal(null)}>Cancel</Button>
            <Button onClick={handleVote} loading={submitting}>
              Submit Vote (+1 trust)
            </Button>
          </div>
        }>
        <div className="space-y-4">
          {/* Tour summary */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                ["Type",     CAT_LABEL[voteModal?.category] || voteModal?.category],
                ["Duration", `${voteModal?.duration?.days||1}d ${voteModal?.duration?.nights||0}n`],
                ["Budget",   voteModal?.budget?.label || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{value}</p>
                </div>
              ))}
            </div>
            {voteModal?.description && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-3 border-t border-gray-200 dark:border-slate-700 pt-3">
                {voteModal.description}
              </p>
            )}
          </div>

          {/* Vote options */}
          <FormField label="Your Verdict *">
            <div className="space-y-2">
              {VOTE_OPTS.map(({ v, label, desc, active }) => (
                <button key={v} type="button" onClick={() => setVoteForm({...voteForm, vote:v})}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left
                              transition-all
                              ${voteForm.vote === v ? active : inactive}`}>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs opacity-70">{desc}</p>
                  </div>
                  {voteForm.vote === v && (
                    <span className="text-base shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </FormField>

          {/* Comment */}
          <FormField label="Comment (optional)" hint="Explain your decision to help improve the tour">
            <Textarea
              value={voteForm.comment}
              onChange={(e) => setVoteForm({...voteForm, comment:e.target.value})}
              rows={3}
              placeholder="Well-structured itinerary... / Missing important stops... / Good variety of activities..."/>
          </FormField>

          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}