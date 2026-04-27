import { useState, useEffect } from "react";
import claimService from "../../services/claim.service";

const STEPS = ["Check", "Details", "Done"];

export default function ClaimLocationModal({ locationId, locationName, onClose, open }) {
  const [step,    setStep]    = useState(0);
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({ reason: "", websiteUrl: "" });

  useEffect(() => {
    if (!open || !locationId) return;
    setStep(0); setError(""); setForm({ reason: "", websiteUrl: "" });
    setLoading(true);
    claimService.check(locationId)
      .then(data => setInfo(data))
      .catch(e => setError(e.response?.data?.message || "Error checking location"))
      .finally(() => setLoading(false));
  }, [open, locationId]);

  const handleSubmit = async () => {
    if (!form.reason.trim()) { setError("Please describe why you own this location"); return; }
    setLoading(true); setError("");
    try {
      await claimService.submit({ locationId, reason: form.reason, websiteUrl: form.websiteUrl });
      setStep(2); // go to Done
    } catch (e) { setError(e.response?.data?.message || "Submission failed"); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  const inputCls = `w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                    rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden
                      border dark:border-slate-700">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Claim Location</h3>
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none">×</button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                                ${i < step  ? "bg-emerald-500 text-white"
                                : i === step ? "bg-blue-600 text-white"
                                : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"}`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${i === step ? "text-gray-900 dark:text-white font-medium" : "text-gray-400 dark:text-slate-500"}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="w-8 h-0.5 bg-gray-200 dark:bg-slate-700"/>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"/>
            </div>
          ) : (
            <>
              {/* STEP 0: Check */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200
                                  dark:border-blue-500/30 rounded-xl p-4">
                    <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                      📍 {locationName}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {info?.isManaged
                        ? "⚠️ This location is already managed by another company."
                        : "This location is available for claiming."}
                    </p>
                  </div>

                  {!info?.isManaged && (
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        How it works:
                      </p>
                      <div className="space-y-1.5 text-gray-600 dark:text-slate-400">
                        <p>1️⃣ Submit your claim with supporting documents</p>
                        {info?.hasATReviewer
                          ? <p>2️⃣ Location submitter (AT member) reviews your request</p>
                          : <p>2️⃣ Goes directly to Admin review (no AT step)</p>
                        }
                        <p>{info?.hasATReviewer ? "3️⃣" : "3️⃣"} Admin makes final decision</p>
                        <p>{info?.hasATReviewer ? "4️⃣" : "4️⃣"} Approved → you manage the location</p>
                      </div>
                    </div>
                  )}

                  {info?.hasPending && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200
                                    dark:border-amber-500/30 rounded-xl px-4 py-3 text-sm
                                    text-amber-700 dark:text-amber-400">
                      ⏳ You already have a pending claim for this location.
                    </div>
                  )}

                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
              )}

              {/* STEP 1: Details */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      Why do you own this location? *
                    </label>
                    <textarea
                      value={form.reason}
                      onChange={e => setForm({ ...form, reason: e.target.value })}
                      rows={4}
                      placeholder="Describe your ownership — e.g. registered business, legal documents, you built/founded it..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      Website / Social Media Link
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      value={form.websiteUrl}
                      onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                      placeholder="https://yourbusiness.com"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      Supporting Documents
                    </label>
                    <div className="border-2 border-dashed border-gray-200 dark:border-slate-700
                                    rounded-xl p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                      <p className="text-2xl mb-1">📎</p>
                      <p>Business registration, ID card, ownership proof</p>
                      <p className="text-xs mt-1 text-gray-400 dark:text-slate-500">
                        You can upload documents from My Claims after submitting
                      </p>
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
              )}

              {/* STEP 2: Done */}
              {step === 2 && (
                <div className="text-center py-6 space-y-4">
                  <p className="text-5xl">🎉</p>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                      Claim submitted!
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      Your claim for <strong>{locationName}</strong> is under review
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm
                                  text-gray-600 dark:text-slate-400 text-left space-y-2">
                    <p>⏳ AT member will review first, then Admin makes final call</p>
                    <p>📧 You'll receive email notifications at each step</p>
                    <p>🔍 Track progress in My Claims page</p>
                    <p>⏱️ Estimated: 3–5 business days</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3">
          {step === 2 ? (
            <button onClick={onClose}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                         text-sm font-semibold transition-colors">
              Done
            </button>
          ) : (
            <>
              <button
                onClick={step === 0 ? onClose : () => { setStep(s => s - 1); setError(""); }}
                className="flex-1 py-3 border border-gray-200 dark:border-slate-700 text-gray-600
                           dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-50
                           dark:hover:bg-slate-800 transition-colors">
                {step === 0 ? "Cancel" : "← Back"}
              </button>

              {step === 0 && !info?.isManaged && !info?.hasPending && (
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                             text-sm font-semibold transition-colors">
                  Start Claim →
                </button>
              )}

              {step === 1 && (
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                             text-sm font-semibold transition-colors disabled:opacity-60">
                  {loading ? "Submitting..." : "Submit Claim →"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}