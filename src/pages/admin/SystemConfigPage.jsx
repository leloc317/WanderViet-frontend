import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import { PageHeader, StatCard } from "../../components/ui/Widgets";

// ── Helpers ────────────────────────────────────────────────────────────────────
const CONFIG_META = {
  deposit_rate:          { label: "Deposit Rate",            icon: "💰", unit: "%",   factor: 100, color: "amber",  desc: "% đặt cọc khi booking" },
  commission_rate:       { label: "Commission Rate",         icon: "📊", unit: "%",   factor: 100, color: "purple", desc: "% WanderViet thu từ Company" },
  hold_duration_minutes: { label: "Hold Duration",           icon: "⏱️",  unit: "min", factor: 1,   color: "blue",   desc: "Thời gian giữ slot booking" },
  no_show_hours:         { label: "No-Show Hours",           icon: "🚫", unit: "hrs", factor: 1,   color: "red",    desc: "Giờ trước khi auto no_show" },
  max_booking_per_day:   { label: "Max Bookings / Day",      icon: "📅", unit: "",    factor: 1,   color: "teal",   desc: "Số booking tối đa 1 user/ngày" },
  at_min_votes:          { label: "AT Min Votes",            icon: "✅", unit: "",    factor: 1,   color: "green",  desc: "Số vote AT tối thiểu để approve" },
  claim_fee:             { label: "Claim Fee",               icon: "🏷️",  unit: "₫",  factor: 1,   color: "orange", desc: "Phí claim location (VND)" },
};

const RANGES = {
  deposit_rate:          { min: 0,   max: 100,      step: 1  },
  commission_rate:       { min: 0,   max: 100,      step: 1  },
  hold_duration_minutes: { min: 5,   max: 60,       step: 1  },
  no_show_hours:         { min: 1,   max: 24,       step: 1  },
  max_booking_per_day:   { min: 1,   max: 20,       step: 1  },
  at_min_votes:          { min: 1,   max: 10,       step: 1  },
  claim_fee:             { min: 0,   max: 10000000, step: 10000 },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const displayVal = (key, raw) => {
  const m = CONFIG_META[key];
  if (!m) return raw;
  if (m.unit === "%") return `${(raw * m.factor).toFixed(0)}%`;
  if (m.unit === "₫") return raw.toLocaleString("vi-VN") + "₫";
  return `${raw}${m.unit ? " " + m.unit : ""}`;
};

// ── ConfigCard ─────────────────────────────────────────────────────────────────
function ConfigCard({ cfg, onEdit }) {
  const m = CONFIG_META[cfg.key] ?? { label: cfg.key, icon: "⚙️", color: "slate" };
  const range = RANGES[cfg.key];
  const displayValue = displayVal(cfg.key, cfg.value);

  // Progress bar: only for % and small-range keys
  const pct = m.unit === "%" ? cfg.value * 100
    : range && range.max <= 100 ? ((cfg.value - range.min) / (range.max - range.min)) * 100
    : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{m.icon}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.label}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{m.desc}</p>
          </div>
        </div>
        <button
          onClick={() => onEdit(cfg)}
          className="shrink-0 text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700
                     text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800
                     hover:border-blue-300 dark:hover:border-blue-500 transition-all"
        >
          Edit
        </button>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{displayValue}</p>
        {cfg.isDefault && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500">
            Default
          </span>
        )}
      </div>

      {pct !== null && (
        <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}

      {cfg.updatedBy && (
        <p className="text-[11px] text-gray-400 dark:text-slate-500">
          Updated by <span className="font-medium text-gray-600 dark:text-slate-300">{cfg.updatedBy.name}</span>
          {" · "}{fmtDate(cfg.updatedAt)}
        </p>
      )}
    </div>
  );
}

// ── EditModal ──────────────────────────────────────────────────────────────────
function EditModal({ cfg, open, onClose, onSaved }) {
  const [value, setValue]   = useState("");
  const [desc,  setDesc]    = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (!cfg) return;
    const m = CONFIG_META[cfg.key];
    // Convert stored value to display input: % keys stored as 0-1, display as 0-100
    const inputVal = m?.unit === "%" ? (cfg.value * 100).toFixed(0) : String(cfg.value);
    setValue(inputVal);
    setDesc(cfg.description || "");
    setError("");
  }, [cfg, open]);

  if (!open || !cfg) return null;

  const m = CONFIG_META[cfg.key] ?? {};
  const range = RANGES[cfg.key];

  const handleSave = async () => {
    const num = parseFloat(value);
    if (isNaN(num)) { setError("Giá trị phải là số"); return; }

    // Convert back: % → 0-1
    const storedVal = m.unit === "%" ? num / 100 : num;

    setSaving(true); setError("");
    try {
      await api.put(`/config/${cfg.key}`, { value: storedVal, description: desc });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const inputMax  = m.unit === "%" ? (range?.max  ?? 1) * 100 : range?.max;
  const inputMin  = m.unit === "%" ? (range?.min  ?? 0) * 100 : range?.min;
  const inputStep = m.unit === "%" ? 1                         : range?.step ?? 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Edit {m.label ?? cfg.key}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none transition-colors">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
              Value {m.unit ? `(${m.unit})` : ""}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={inputMin}
              max={inputMax}
              step={inputStep}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                         dark:focus:ring-blue-400/30 dark:focus:border-blue-400 transition-all"
            />
            {range && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Range: {inputMin} – {inputMax?.toLocaleString("vi-VN")} {m.unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ghi chú..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                         dark:focus:ring-blue-400/30 dark:focus:border-blue-400 transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium
                       disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SystemConfigPage() {
  const [configs,  setConfigs]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [seeding,  setSeeding]  = useState(false);
  const [toast,    setToast]    = useState("");

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/config");
      setConfigs(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSaved = () => {
    fetchConfigs();
    showToast("Đã cập nhật config ✓");
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post("/config/seed");
      fetchConfigs();
      showToast(data.message);
    } catch (e) {
      showToast(e.response?.data?.message || "Lỗi seed");
    } finally { setSeeding(false); }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Stats summary
  const depositRate    = configs.find(c => c.key === "deposit_rate");
  const commissionRate = configs.find(c => c.key === "commission_rate");
  const holdMinutes    = configs.find(c => c.key === "hold_duration_minutes");

  return (
    <div>
      <PageHeader
        title="System Configuration"
        subtitle="Quản lý các tham số vận hành của hệ thống"
        action={
          <button onClick={handleSeed} disabled={seeding}
            className="text-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700
                       text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800
                       disabled:opacity-50 transition-colors">
            {seeding ? "Seeding…" : "⚙️ Seed Defaults"}
          </button>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Deposit Rate"
          value={depositRate ? `${(depositRate.value * 100).toFixed(0)}%` : "—"}
          icon="💰" color="amber"
        />
        <StatCard
          label="Commission Rate"
          value={commissionRate ? `${(commissionRate.value * 100).toFixed(0)}%` : "—"}
          icon="📊" color="purple"
        />
        <StatCard
          label="Hold Duration"
          value={holdMinutes ? `${holdMinutes.value} min` : "—"}
          icon="⏱️" color="blue"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="h-36 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map(cfg => (
            <ConfigCard key={cfg.key} cfg={cfg} onEdit={setEditing} />
          ))}
        </div>
      )}

      <EditModal
        cfg={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />

      {/* ── Platform Policy Defaults ── */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Platform Policy Defaults
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Fallback values used when a company or location has no policy set.
          These are informational only — companies manage their own policy via their profile.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label:"Default Cancellation", value:"Moderate (full refund 72h before)", icon:"📋" },
            { label:"Default Check-in",     value:"14:00",     icon:"🔑" },
            { label:"Default Check-out",    value:"12:00",     icon:"🚪" },
            { label:"Smoking Policy",       value:"Not allowed", icon:"🚭" },
            { label:"Pets Policy",          value:"Not allowed", icon:"🐾" },
            { label:"Children Policy",      value:"All ages welcome", icon:"👶" },
          ].map(({ label, value, icon }) => (
            <div key={label}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                         rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">{icon}</span>
              <div>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
          ℹ️ To change platform-wide policy defaults, update the source code in{" "}
          <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            backend/utils/policyService.js
          </code>
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]
                        bg-gray-900 dark:bg-slate-700 text-white text-sm
                        px-5 py-3 rounded-2xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}