import { useState, useEffect } from "react";
import api from "../../lib/axios";

const fmtVND = (n) => `₫${Number(n ?? 0).toLocaleString("vi-VN")}`;

const CHECKOUT_TYPES = [
  { key:"early",   label:"Early checkout",   desc:"Trả phòng sớm",       icon:"🌅" },
  { key:"on_time", label:"On time",           desc:"Đúng lịch",           icon:"✅" },
  { key:"late",    label:"Late checkout",     desc:"Trả phòng muộn",      icon:"🌙" },
];

export default function CheckOutModal({ unitBooking, order, locationId, onClose, onSuccess }) {
  const [checkOutType,    setCheckOutType]    = useState("on_time");
  const [chargeTemplates, setChargeTemplates] = useState([]);
  const [selectedCharges, setSelectedCharges] = useState([]);
  const [customCharges,   setCustomCharges]   = useState([]);
  const [note,            setNote]            = useState("");
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");

  // Late checkout state
  const [lateCheck,     setLateCheck]     = useState(null);   // API response
  const [lateChecking,  setLateChecking]  = useState(false);
  const [lateFeePushed, setLateFeePushed] = useState(false);  // đã add charge chưa

  const unit = unitBooking.unit;

  // Load charge templates
  useEffect(() => {
    api.get("/charges", { params: { locationId } })
      .then(r => setChargeTemplates(r.data.data ?? []))
      .catch(() => {});
  }, [locationId]);

  // Khi chọn "late" → check availability
  useEffect(() => {
    if (checkOutType !== "late") {
      setLateCheck(null);
      setLateFeePushed(false);
      // Xóa late fee khỏi custom charges nếu có
      setCustomCharges(prev => prev.filter(c => !c._isLate));
      return;
    }
    setLateChecking(true);
    api.get(`/unit-bookings/${unitBooking._id}/late-check`)
      .then(r => {
        setLateCheck(r.data);
        // Nếu được phép và có phí → auto add vào custom charges
        if (r.data.canLateCheckout && r.data.lateFee > 0 && !lateFeePushed) {
          const tierLabel = r.data.lateTier === "half"
            ? `Late checkout fee (${r.data.lateHours}h — 50%)`
            : `Late checkout fee (${r.data.lateHours}h — 100%)`;
          setCustomCharges(prev => [
            ...prev.filter(c => !c._isLate),
            { label: tierLabel, amount: r.data.lateFee, note: "", _isLate: true },
          ]);
          setLateFeePushed(true);
        }
      })
      .catch(() => setLateCheck({ canLateCheckout: true, lateFee: 0 }))
      .finally(() => setLateChecking(false));
  }, [checkOutType]);

  // Template charge handlers
  const toggleTemplate = (templateId) =>
    setSelectedCharges(prev => {
      const exists = prev.find(c => c.templateId === templateId);
      return exists
        ? prev.filter(c => c.templateId !== templateId)
        : [...prev, { templateId, quantity: 1 }];
    });

  const updateQty = (templateId, qty) =>
    setSelectedCharges(prev =>
      prev.map(c => c.templateId === templateId ? { ...c, quantity: Math.max(1, qty) } : c)
    );

  // Custom charge handlers
  const addCustom    = () => setCustomCharges(prev => [...prev, { label:"", amount:0, note:"", _isLate:false }]);
  const updateCustom = (idx, field, val) =>
    setCustomCharges(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  const removeCustom = (idx) => setCustomCharges(prev => prev.filter((_, i) => i !== idx));

  // Total extra
  const totalExtra = (() => {
    let t = 0;
    selectedCharges.forEach(sc => {
      const tmpl = chargeTemplates.find(t => t._id === sc.templateId);
      if (tmpl) t += tmpl.basePrice * sc.quantity;
    });
    customCharges.forEach(cc => { t += Number(cc.amount) || 0; });
    return t;
  })();

  const handleCheckOut = async () => {
    // Block nếu late nhưng không được phép
    if (checkOutType === "late" && lateCheck && !lateCheck.canLateCheckout) {
      setError(lateCheck.reason ?? "Không thể checkout muộn");
      return;
    }
    setSaving(true); setError("");
    try {
      const extraCharges = [
        ...selectedCharges.map(sc => ({ templateId: sc.templateId, quantity: sc.quantity })),
        ...customCharges
          .filter(cc => cc.label && Number(cc.amount) > 0)
          .map(cc => ({ label: cc.label, amount: Number(cc.amount), note: cc.note })),
      ];
      await api.post(`/unit-bookings/${unitBooking._id}/checkout`, {
        checkOutType, extraCharges, checkOutNote: note,
      });
      onSuccess();
    } catch (e) { setError(e.response?.data?.message ?? "Check-out failed"); }
    finally { setSaving(false); }
  };

  // ── Late status banner ──────────────────────────────────────────────────────
  const LateBanner = () => {
    if (checkOutType !== "late") return null;
    if (lateChecking) return (
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50
                      dark:bg-slate-800 rounded-xl px-4 py-3">
        <span className="animate-spin">⏳</span> Đang kiểm tra lịch phòng...
      </div>
    );
    if (!lateCheck) return null;

    if (!lateCheck.canLateCheckout) return (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200
                      dark:border-red-500/30 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          🚫 Không thể checkout muộn
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {lateCheck.reason}
        </p>
        <p className="text-xs text-red-400 dark:text-red-500 mt-1">
          Phòng {lateCheck.roomType}: {lateCheck.outgoingCount} checkout,
          cần {lateCheck.incomingRoomsNeeded} cho checkin mới
        </p>
      </div>
    );

    if (lateCheck.isWarning) return (
      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200
                      dark:border-orange-500/30 rounded-xl px-4 py-3 space-y-1">
        <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
          ⚠️ Được phép nhưng không có buffer
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400">
          {lateCheck.reason}
        </p>
        {lateCheck.lateFee > 0 && (
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Phí trễ: <strong>{fmtVND(lateCheck.lateFee)}</strong>
            {" "}({lateCheck.lateTier === "half" ? "50%" : "100%"} giá phòng/đêm)
            → đã thêm vào charges
          </p>
        )}
      </div>
    );

    return (
      <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200
                      dark:border-amber-400/20 rounded-xl px-4 py-3 space-y-1">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          🌙 Late checkout được phép
        </p>
        <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
          <p>
            Trễ: <strong>{lateCheck.lateHours}h</strong> · Còn{" "}
            <strong>{lateCheck.remaining}</strong> phòng {lateCheck.roomType} làm buffer
          </p>
          {lateCheck.lateFee === 0 ? (
            <p>✅ Trong khung miễn phí (≤ 2h)</p>
          ) : (
            <p>
              Phí trễ: <strong>{fmtVND(lateCheck.lateFee)}</strong>
              {" "}({lateCheck.lateTier === "half" ? "50%" : "100%"} giá phòng/đêm)
              → đã thêm vào charges
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                    p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl
                      max-h-[92vh] flex flex-col border dark:border-slate-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b
                        border-gray-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              Check-out — Room {unit?.unitNumber}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Expected: {order.hotelDetails?.checkOut} · {order.contactName}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Checkout type */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500
                          uppercase tracking-wider mb-3">
              Check-out Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CHECKOUT_TYPES.map(ct => (
                <button key={ct.key} onClick={() => setCheckOutType(ct.key)}
                  className={`p-3 rounded-xl border text-left transition-all
                              ${checkOutType === ct.key
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"}`}>
                  <p className="text-base mb-0.5">{ct.icon}</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{ct.label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{ct.desc}</p>
                </button>
              ))}
            </div>

            {/* Early info */}
            {checkOutType === "early" && (
              <div className="mt-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200
                              dark:border-blue-500/30 rounded-xl px-4 py-2.5">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  ℹ️ Trả phòng sớm — không hoàn tiền các đêm còn lại theo policy.
                </p>
              </div>
            )}

            {/* Late banner */}
            {checkOutType === "late" && (
              <div className="mt-2">
                <LateBanner />
              </div>
            )}
          </div>

          {/* Charge templates — grouped by category */}
          {chargeTemplates.length > 0 && (() => {
            const CAT_META = {
              time:        { icon:"⏰", label:"Time-based"  },
              damage:      { icon:"💥", label:"Damage"       },
              consumption: { icon:"🧴", label:"Consumption"  },
              service:     { icon:"🛎️",  label:"Service"      },
              cleaning:    { icon:"🧹", label:"Cleaning"     },
              other:       { icon:"📋", label:"Other"        },
            };
            const UNIT_LABEL = {
              per_hour:   "hr", per_item: "item",
              per_night:  "đêm", per_person: "người", flat: "flat",
            };

            // Group theo category
            const grouped = chargeTemplates.reduce((acc, t) => {
              const cat = t.category || "other";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(t);
              return acc;
            }, {});

            return (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500
                              uppercase tracking-wider mb-3">
                  Extra Charges
                  {selectedCharges.length > 0 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400 normal-case">
                      · {selectedCharges.length} đã chọn
                    </span>
                  )}
                </p>
                <div className="space-y-3">
                  {Object.entries(grouped).map(([cat, items]) => {
                    const meta         = CAT_META[cat] ?? CAT_META.other;
                    const selectedInCat = items.filter(t =>
                      selectedCharges.find(c => c.templateId === t._id)
                    ).length;

                    return (
                      <div key={cat} className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                        {/* Category header */}
                        <div className="flex items-center justify-between px-3 py-2
                                        bg-gray-50 dark:bg-slate-800">
                          <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                            {meta.icon} {meta.label}
                          </span>
                          {selectedInCat > 0 && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400
                                             bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded-full">
                              {selectedInCat}
                            </span>
                          )}
                        </div>

                        {/* Items */}
                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
                          {items.map(tmpl => {
                            const sel = selectedCharges.find(c => c.templateId === tmpl._id);
                            return (
                              <div key={tmpl._id}
                                className={`flex items-center gap-3 px-3 py-2.5 transition-colors
                                            ${sel ? "bg-blue-50 dark:bg-blue-500/10" : "bg-white dark:bg-slate-900"}`}>
                                <input type="checkbox" checked={!!sel}
                                  onChange={() => toggleTemplate(tmpl._id)}
                                  className="w-4 h-4 rounded accent-blue-600 shrink-0"/>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {tmpl.name}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-slate-500">
                                    {fmtVND(tmpl.basePrice)}/{UNIT_LABEL[tmpl.unit] ?? tmpl.unit}
                                  </p>
                                </div>
                                {sel ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => updateQty(tmpl._id, sel.quantity - 1)}
                                      className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-700
                                                 text-gray-700 dark:text-white flex items-center
                                                 justify-center text-sm font-bold">−</button>
                                    <span className="text-sm font-semibold text-gray-900
                                                     dark:text-white w-5 text-center">
                                      {sel.quantity}
                                    </span>
                                    <button onClick={() => updateQty(tmpl._id, sel.quantity + 1)}
                                      className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-700
                                                 text-gray-700 dark:text-white flex items-center
                                                 justify-center text-sm font-bold">+</button>
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400
                                                     ml-1 w-16 text-right">
                                      {fmtVND(tmpl.basePrice * sel.quantity)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
                                    {fmtVND(tmpl.basePrice)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Custom charges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500
                            uppercase tracking-wider">
                Custom Charges
              </p>
              <button onClick={addCustom}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                + Add
              </button>
            </div>
            {customCharges.map((cc, idx) => (
              <div key={idx} className={`flex gap-2 mb-2 ${cc._isLate ? "opacity-75" : ""}`}>
                <input value={cc.label} onChange={e => updateCustom(idx,"label",e.target.value)}
                  disabled={cc._isLate}
                  placeholder="Description"
                  className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200
                             dark:border-slate-700 rounded-lg px-3 py-2 text-sm
                             text-gray-900 dark:text-white focus:outline-none
                             focus:ring-2 focus:ring-blue-500/25 disabled:opacity-60"/>
                <input type="number" value={cc.amount}
                  onChange={e => updateCustom(idx,"amount",e.target.value)}
                  disabled={cc._isLate}
                  placeholder="₫"
                  className="w-28 bg-gray-50 dark:bg-slate-800 border border-gray-200
                             dark:border-slate-700 rounded-lg px-3 py-2 text-sm
                             text-gray-900 dark:text-white focus:outline-none
                             focus:ring-2 focus:ring-blue-500/25 disabled:opacity-60"/>
                <button onClick={() => !cc._isLate && removeCustom(idx)}
                  disabled={cc._isLate}
                  className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/20 text-red-500
                             flex items-center justify-center disabled:opacity-30">×</button>
              </div>
            ))}
            {customCharges.length === 0 && chargeTemplates.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">
                Không có phụ phí
              </p>
            )}
          </div>

          {/* Total */}
          {totalExtra > 0 && (
            <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200
                            dark:border-amber-400/20 rounded-xl px-4 py-3
                            flex justify-between items-center">
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Total Extra
              </span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                {fmtVND(totalExtra)}
              </span>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Check-out Note
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Tình trạng phòng, sự cố..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200
                         dark:border-slate-700 text-gray-900 dark:text-white rounded-xl
                         px-4 py-3 text-sm resize-none focus:outline-none
                         focus:ring-2 focus:ring-blue-500/25"/>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl
                       text-sm font-medium text-gray-600 dark:text-slate-400
                       hover:bg-gray-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={handleCheckOut}
            disabled={saving || (checkOutType === "late" && lateChecking) ||
                      (checkOutType === "late" && lateCheck && !lateCheck.canLateCheckout)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                       text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? "Processing..."
              : `Check-out${totalExtra > 0 ? ` · ${fmtVND(totalExtra)}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}