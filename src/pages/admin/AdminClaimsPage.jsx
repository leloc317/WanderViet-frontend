import { useState, useEffect, useCallback } from "react";
import claimService from "../../services/claim.service";
import { PageHeader, Badge, Button, Modal, Tabs, FormField, Textarea } from "../../components/ui";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

const STATUS_COLOR = {
  pending_at_review:"blue",
  pending_admin:    "purple",
  approved:         "green",
  rejected:         "red",
  appealing:        "orange",
};

const STATUS_TABS = [
  { key:"",                label:"All"           },
  { key:"pending_at_review",label:"Pending AT"   },
  { key:"pending_admin",   label:"Pending Admin" },
  { key:"appealing",       label:"Appeals"       },
  { key:"approved",        label:"Approved"      },
  { key:"rejected",        label:"Rejected"      },
];

export default function AdminClaimsPage() {
  const [claims,   setClaims]   = useState([]);
  const [counts,   setCounts]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ action:"", note:"", bypass:false });
  const [saving,   setSaving]   = useState(false);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const data = await claimService.getAdminClaims({ status: activeTab, limit: 50 });
      setClaims(data.claims);
      setCounts(data.counts);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchClaims(); }, [activeTab]);

  const openReview = (claim) => {
    setSelected(claim);
    setForm({ action:"", note:"", bypass:false });
    setModal(true);
  };

  const handleReview = async () => {
    if (!form.action) return;
    setSaving(true);
    try {
      await claimService.adminReview(selected._id, form);
      setModal(false); fetchClaims();
    } catch(e) { alert(e.response?.data?.message || "Error"); }
    finally { setSaving(false); }
  };

  const pendingCount = (counts.pending_admin || 0) + (counts.appealing || 0);

  return (
    <div>
      <PageHeader
        title="Location Claims"
        subtitle="Review company claims to manage locations"
      />

      {pendingCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20
                        rounded-2xl px-5 py-3 mb-5 flex items-center gap-3">
          <span className="text-amber-500">⚠️</span>
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            {pendingCount} claim{pendingCount > 1 ? "s" : ""} waiting for your review
          </p>
        </div>
      )}

      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab}/>

      {loading ? (
        <div className="space-y-3 mt-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500 text-sm mt-4">
          <p className="text-3xl mb-2">📋</p>
          <p>No claims found</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {claims.map(claim => (
            <div key={claim._id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                         rounded-2xl px-5 py-4">
              <div className="flex items-start gap-4">
                {/* Location image */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                  {claim.location?.images?.[0]?.url
                    ? <img src={claim.location.images[0].url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-xl">📍</div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-gray-900 dark:text-white">{claim.location?.name}</p>
                    <Badge label={claim.status.replace(/_/g," ")} color={STATUS_COLOR[claim.status]||"blue"} size="sm"/>
                    {claim.appeal && <Badge label="Has Appeal" color="orange" size="sm"/>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Company: <strong>{claim.company?.name}</strong> ({claim.company?.email})
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Submitted by: {claim.submittedBy?.name} · {fmtDate(claim.createdAt)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1.5 line-clamp-2 italic">
                    "{claim.reason}"
                  </p>
                  {claim.websiteUrl && (
                    <a href={claim.websiteUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      🌐 {claim.websiteUrl}
                    </a>
                  )}

                  {/* AT review result */}
                  {claim.atReview?.action && (
                    <div className={`mt-2 text-xs px-3 py-1.5 rounded-lg inline-block
                                    ${claim.atReview.action === "accepted"
                                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                      : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                      AT {claim.atReview.action}: "{claim.atReview.note || "No note"}"
                    </div>
                  )}

                  {/* Appeal */}
                  {claim.appeal?.reason && (
                    <div className="mt-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30
                                    rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-0.5">Company Appeal:</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">"{claim.appeal.reason}"</p>
                    </div>
                  )}

                  {/* Action row */}
                  {["pending_admin","appealing"].includes(claim.status) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {claim.status === "appealing" ? "⚠️ Company has appealed" : "⏳ Awaiting admin decision"}
                      </span>
                      <Button size="sm" onClick={() => openReview(claim)}>
                        Review →
                      </Button>
                    </div>
                  )}
                </div>

                {/* Status indicator only */}
                <div className="shrink-0 self-start">
                  {!["pending_admin","appealing"].includes(claim.status) && claim.status === "pending_at_review" && (
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">Waiting for AT</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={`Review Claim — ${selected?.location?.name}`} size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button
              variant={form.action === "approved" ? "success" : form.action === "rejected" ? "danger" : "primary"}
              onClick={handleReview} loading={saving}
              disabled={!form.action}>
              Confirm {form.action || "Decision"}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          {/* Claim summary */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm space-y-1.5">
            <p><span className="text-gray-500 dark:text-slate-400">Company:</span> <strong className="text-gray-900 dark:text-white">{selected?.company?.name}</strong></p>
            <p><span className="text-gray-500 dark:text-slate-400">Reason:</span> <span className="text-gray-700 dark:text-slate-300">"{selected?.reason}"</span></p>
            {selected?.websiteUrl && (
              <p><span className="text-gray-500 dark:text-slate-400">Website:</span> <a href={selected.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{selected.websiteUrl}</a></p>
            )}
          </div>

          {/* Decision */}
          <FormField label="Decision *">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key:"approved", label:"✅ Approve", cls:"border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
                { key:"rejected", label:"❌ Reject",  cls:"border-red-500 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300" },
              ].map(({ key, label, cls }) => (
                <button key={key} type="button" onClick={() => setForm({...form, action:key})}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                              ${form.action === key ? cls : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400"}`}>
                  {label}
                </button>
              ))}
            </div>
          </FormField>

          {/* Bypass AT (only for appealing) */}
          {selected?.status === "appealing" && (
            <label className="flex items-center gap-3 cursor-pointer bg-orange-50 dark:bg-orange-500/10
                               border border-orange-200 dark:border-orange-500/30 rounded-xl px-4 py-3">
              <input type="checkbox" checked={form.bypass}
                onChange={e => setForm({...form, bypass:e.target.checked})}
                className="w-4 h-4 accent-orange-500"/>
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Bypass AT rejection</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">Override the AT member's decision based on evidence</p>
              </div>
            </label>
          )}

          <FormField label="Admin Note">
            <Textarea value={form.note} onChange={e => setForm({...form, note:e.target.value})}
              rows={3} placeholder="Reason for decision (will be sent to company)..."/>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}