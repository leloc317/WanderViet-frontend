import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import claimService from "../../services/claim.service";
import { PageHeader, Badge, Button, Modal, FormField, Textarea } from "../../components/ui";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

const STATUS_LABEL = {
  pending_at_review: { label:"AT Reviewing",       color:"blue"   },
  pending_admin:     { label:"Admin Reviewing",    color:"purple" },
  approved:          { label:"✅ Approved",         color:"green"  },
  rejected:          { label:"❌ Rejected",         color:"red"    },
  appealing:         { label:"🔄 Appeal Submitted", color:"orange" },
};

export default function CompanyClaimsPage() {
  const navigate  = useNavigate();
  const [claims,  setClaims]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [appealModal, setAppealModal] = useState(null);
  const [appealForm,  setAppealForm]  = useState({ reason:"" });
  const [appealing,   setAppealing]   = useState(false);
  const [appealErr,   setAppealErr]   = useState("");

  useEffect(() => {
    claimService.getMyClaims()
      .then(setClaims)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAppeal = async () => {
    if (!appealForm.reason.trim()) { setAppealErr("Please provide appeal reason"); return; }
    setAppealing(true); setAppealErr("");
    try {
      await claimService.appeal(appealModal._id, { reason: appealForm.reason });
      setClaims(prev => prev.map(c =>
        c._id === appealModal._id ? { ...c, status:"appealing" } : c
      ));
      setAppealModal(null);
    } catch(e) { setAppealErr(e.response?.data?.message || "Error"); }
    finally { setAppealing(false); }
  };

  return (
    <div>
      <PageHeader
        title="My Claims"
        subtitle="Track your location ownership claims"
        action={
          <Button onClick={() => navigate("/explore")}>
            + Find Location to Claim
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-2">📋</p>
          <p className="font-medium text-gray-900 dark:text-white mb-1">No claims yet</p>
          <p className="text-sm mb-4">
            Find a location on Explore and click "Claim this Location"
          </p>
          <Button onClick={() => navigate("/explore")}>Browse Locations</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map(claim => {
            const statusInfo = STATUS_LABEL[claim.status] || { label: claim.status, color:"blue" };
            const canAppeal  = claim.status === "rejected" && !claim.adminReview;

            return (
              <div key={claim._id}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  {/* Location image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                    {claim.location?.images?.[0]?.url
                      ? <img src={claim.location.images[0].url} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-2xl">📍</div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white">{claim.location?.name}</p>
                      <Badge label={statusInfo.label} color={statusInfo.color} size="sm"/>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                      {claim.location?.address?.city} · Submitted {fmtDate(claim.createdAt)}
                    </p>

                    {/* Status timeline */}
                    <div className="space-y-2">
                      {/* AT review */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className={claim.atReview?.action ? "text-emerald-500" : "text-gray-300 dark:text-slate-600"}>●</span>
                        <span className={claim.atReview?.action ? "text-gray-700 dark:text-slate-300" : "text-gray-400 dark:text-slate-500"}>
                          {claim.atReview?.action
                            ? `AT ${claim.atReview.action}${claim.atReview.note ? `: "${claim.atReview.note}"` : ""}`
                            : "Waiting for AT member review"}
                        </span>
                      </div>
                      {/* Admin review */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className={claim.adminReview?.action ? "text-emerald-500" : "text-gray-300 dark:text-slate-600"}>●</span>
                        <span className={claim.adminReview?.action ? "text-gray-700 dark:text-slate-300" : "text-gray-400 dark:text-slate-500"}>
                          {claim.adminReview?.action
                            ? `Admin ${claim.adminReview.action}${claim.adminReview.note ? `: "${claim.adminReview.note}"` : ""}`
                            : "Waiting for admin approval"}
                        </span>
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {claim.status === "rejected" && claim.rejectionReason && (
                      <div className="mt-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30
                                      rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                        ❌ {claim.rejectionReason}
                      </div>
                    )}

                    {/* Appeal submitted */}
                    {claim.status === "appealing" && (
                      <div className="mt-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30
                                      rounded-xl px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
                        🔄 Appeal submitted — admin is reviewing your case
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {canAppeal && (
                        <Button size="sm" variant="warning"
                          onClick={() => { setAppealModal(claim); setAppealForm({reason:""}); setAppealErr(""); }}>
                          🔄 Appeal Decision
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appeal Modal */}
      <Modal open={!!appealModal} onClose={() => setAppealModal(null)}
        title="Appeal Rejection" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAppealModal(null)}>Cancel</Button>
            <Button onClick={handleAppeal} loading={appealing}>Submit Appeal</Button>
          </div>
        }>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm">
            <p className="text-gray-500 dark:text-slate-400">Location</p>
            <p className="font-semibold text-gray-900 dark:text-white">{appealModal?.location?.name}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20
                          rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            Your appeal will go directly to Admin who can override the AT decision.
          </div>
          <FormField label="Appeal Reason *">
            <Textarea value={appealForm.reason}
              onChange={e => setAppealForm({...appealForm, reason:e.target.value})}
              rows={4}
              placeholder="Explain why you believe this claim should be approved. Include any additional evidence or context."/>
          </FormField>
          {appealErr && <p className="text-sm text-red-500">{appealErr}</p>}
        </div>
      </Modal>
    </div>
  );
}