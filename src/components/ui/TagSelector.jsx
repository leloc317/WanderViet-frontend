import { useState, useEffect } from "react";
import api from "../../lib/axios";

const GROUPS = [
  { key:"vibe",     label:"Vibe",     icon:"✨" },
  { key:"audience", label:"Audience", icon:"👥" },
  { key:"feature",  label:"Feature",  icon:"🔧" },
  { key:"price",    label:"Price",    icon:"💰" },
  { key:"time",     label:"Time",     icon:"🕐" },
  { key:"activity", label:"Activity", icon:"🏃" },
  { key:"quality",  label:"Quality",  icon:"⭐" },
];

/**
 * @param {string[]} selected    - array of tag _ids currently selected
 * @param {function} onChange    - called with updated array of tag _ids
 * @param {string}   category   - location category to filter relevant tags
 * @param {number}   max        - max tags allowed (default 10)
 */
export default function TagSelector({ selected = [], onChange, category, max = 10 }) {
  const [allTags,   setAllTags]   = useState({});  // grouped
  const [loading,   setLoading]   = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestForm, setSuggestForm] = useState({ name:"", group:"vibe" });
  const [suggestErr,  setSuggestErr]  = useState("");
  const [suggestOk,   setSuggestOk]   = useState(false);

  useEffect(() => {
    api.get("/tags", { params: { category } })
      .then(r => setAllTags(r.data.data.grouped || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      if (selected.length >= max) return;
      onChange([...selected, id]);
    }
  };

  const handleSuggest = async () => {
    if (!suggestForm.name.trim()) { setSuggestErr("Name is required"); return; }
    setSuggestErr(""); setSuggestOk(false);
    try {
      await api.post("/tags/suggest", { ...suggestForm, applicableFor: [category || "all"] });
      setSuggestOk(true);
      setSuggestForm({ name:"", group:"vibe" });
      setTimeout(() => { setSuggesting(false); setSuggestOk(false); }, 2000);
    } catch(e) { setSuggestErr(e.response?.data?.message || "Error"); }
  };

  if (loading) return (
    <div className="animate-pulse space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 dark:bg-slate-800 rounded-xl"/>)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Selected tags summary */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 dark:bg-blue-500/10
                        rounded-xl border border-blue-200 dark:border-blue-500/30">
          {Object.values(allTags).flat().filter(t => selected.includes(t._id)).map(tag => (
            <span key={tag._id}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white
                         px-2.5 py-1 rounded-full">
              {tag.icon} {tag.name}
              <button onClick={() => toggle(tag._id)} className="ml-0.5 opacity-70 hover:opacity-100">×</button>
            </span>
          ))}
          <span className="text-xs text-blue-600 dark:text-blue-400 self-center ml-auto">
            {selected.length}/{max}
          </span>
        </div>
      )}

      {/* Tag groups */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {GROUPS.map(({ key, label, icon }) => {
          const groupTags = allTags[key] || [];
          if (!groupTags.length) return null;
          return (
            <div key={key}>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500
                            uppercase tracking-wider mb-1.5">
                {icon} {label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {groupTags.map(tag => {
                  const isSelected = selected.includes(tag._id);
                  const isDisabled = !isSelected && selected.length >= max;
                  return (
                    <button key={tag._id} type="button"
                      onClick={() => toggle(tag._id)}
                      disabled={isDisabled}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all
                                  ${isSelected
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : isDisabled
                                      ? "bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed"
                                      : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600"}`}>
                      {tag.icon} {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggest new tag */}
      {!suggesting ? (
        <button type="button" onClick={() => setSuggesting(true)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          + Can't find a tag? Suggest one
        </button>
      ) : (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Suggest a new tag</p>
          <div className="flex gap-2">
            <input value={suggestForm.name}
              onChange={e => setSuggestForm({...suggestForm, name:e.target.value})}
              placeholder="Tag name..."
              className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                         text-gray-900 dark:text-white rounded-lg px-3 py-2 text-xs
                         focus:outline-none focus:ring-2 focus:ring-blue-500/25"/>
            <select value={suggestForm.group}
              onChange={e => setSuggestForm({...suggestForm, group:e.target.value})}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                         text-gray-700 dark:text-slate-300 rounded-lg px-2 py-2 text-xs
                         focus:outline-none">
              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          {suggestErr && <p className="text-xs text-red-500">{suggestErr}</p>}
          {suggestOk  && <p className="text-xs text-emerald-600">✅ Submitted for review!</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setSuggesting(false)}
              className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            <button type="button" onClick={handleSuggest}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Submit →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}