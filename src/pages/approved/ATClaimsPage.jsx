import { useState, useEffect } from "react";
import claimService from "../../services/claim.service";
import { PageHeader, Button, Modal, FormField, Textarea } from "../../components/ui";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

export default function ATClaimsPage() {
  const [claims,  setClaims]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ action:"", note:"" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    claimService.getClaimsForMe()
      .then(setClaims)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openReview = (claim) => {
    setSelected(claim);
    setForm({ action:"", note:"" });
    setError("");
    setModal(true);
  };

  const handleReview = async () => {
    if (!form.action) { setError("Please select a decision"); return; }
    setSaving(true); setError("");
    try {
      await claimService.atReview(selected._id, form);
      setClaims(prev => prev.filter(c => c._id !== selected._id));
      setModal(false);
    } catch(e) { setError(e.response?.data?.message || "Error"); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title="Claim Requests"
        subtitle="Companies requesting to manage locations you submitted"
      />

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-medium text-gray-900 dark:text-white mb-1">No pending claims</p>
          <p className="text-sm">You'll be notified when a company claims your location</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map(claim => (
            <div key={claim._id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                         rounded-2xl px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                  {claim.location?.images?.[0]?.url
                    ? <img src={claim.location.images[0].url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-xl">📍</div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white mb-0.5">
                    {claim.location?.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                    📍 {claim.location?.address?.city} · Submitted {fmtDate(claim.createdAt)}
                  </p>

                  {/* Company info */}
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30
                                  rounded-xl px-4 py-3 mb-3">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      🏢 {claim.company?.name}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{claim.company?.email}</p>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-2 italic">
                    "{claim.reason}"
                  </p>

                  {claim.websiteUrl && (
                    <a href={claim.websiteUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      🌐 {claim.websiteUrl}
                    </a>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                      ${claim.fee?.isPaid
                                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                        : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"}`}>
                      {claim.fee?.isPaid ? "✅ Fee paid" : "❌ Fee not paid"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button onClick={() => openReview(claim)}>Review</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title="Review Claim Request" size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button
              variant={form.action === "accepted" ? "success" : form.action === "rejected" ? "danger" : "primary"}
              onClick={handleReview} loading={saving} disabled={!form.action}>
              Confirm {form.action || "Decision"}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          {/* Info */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm space-y-2">
            <p className="font-semibold text-gray-900 dark:text-white">{selected?.location?.name}</p>
            <p className="text-gray-600 dark:text-slate-300">
              Company: <strong>{selected?.company?.name}</strong>
            </p>
            <p className="text-gray-600 dark:text-slate-300 italic">
              Reason: "{selected?.reason}"
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20
                          rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium mb-1">⚠️ Important</p>
            <p>If you accept, Admin will review the evidence and make the final decision.</p>
            <p className="mt-1">If you reject, the company can still appeal to Admin.</p>
          </div>

          {/* Decision */}
          <FormField label="Your Decision *">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key:"accepted", label:"✅ Accept",
                  cls:"border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
                { key:"rejected", label:"❌ Reject",
                  cls:"border-red-500 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300" },
              ].map(({ key, label, cls }) => (
                <button key={key} type="button" onClick={() => setForm({...form, action:key})}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                              ${form.action === key ? cls : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400"}`}>
                  {label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Note (optional)" hint="Your reason will be shared with the company">
            <Textarea value={form.note} onChange={e => setForm({...form, note:e.target.value})}
              rows={3} placeholder="Why are you accepting/rejecting this claim?"/>
          </FormField>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}