import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import approvedTeamService from "../../services/approvedteam.service";
import {
  Table, StatusBadge, Badge, Button, Modal,
  FormField, Input, Textarea, PageHeader,
  StatCard, SearchBar, Pagination, Tabs,
} from "../../components/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
const scoreColor = (n) => n >= 7 ? "text-emerald-600 dark:text-emerald-400" : n >= 4 ? "text-amber-600 dark:text-amber-400" : "text-red-500";

const SPECIALTIES_ALL = ["Food & Dining","Hotels","Tourist Spots","Cafes","Entertainment","Shopping","Nature","Culture","Adventure"];
const REC_ACTIONS     = ["promote","demote","remove","suspend"];
const REC_COLORS      = { promote:"green", demote:"yellow", remove:"red", suspend:"yellow" };

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 10 }) {
  const pct = Math.round((value / max) * 100);
  const col  = value >= 7 ? "bg-emerald-500" : value >= 4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
        <span className={`text-xs font-bold ${scoreColor(value)}`}>{value}/10</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${col}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Member Detail Modal ───────────────────────────────────────────────────────
function MemberDetailModal({ data, onClose, onScore, onRecommend, onStatusChange, onRemove, isAdmin, isStaff }) {
  const { member, activity } = data || {};
  const [scoreForm, setScoreForm] = useState({
    experience: member?.atScore?.experience ?? 5,
    activityFrequency: member?.atScore?.activityFrequency ?? 5,
    positiveRatio: member?.atScore?.positiveRatio ?? 5,
    notes: member?.atScore?.notes ?? "",
  });
  const [recForm, setRecForm] = useState({ action: "promote", reason: "" });
  const [activeSection, setActiveSection] = useState("overview");

  if (!member) return null;

  return (
    <Modal open={!!member} onClose={onClose} title="Member Detail" size="lg"
      footer={
        <div className="flex items-center gap-2">
          {isAdmin && member.status === "active" && (
            <Button size="sm" variant="danger" onClick={() => onStatusChange(member._id, "suspended")}>
              Suspend
            </Button>
          )}
          {isAdmin && member.status === "suspended" && (
            <Button size="sm" variant="success" onClick={() => onStatusChange(member._id, "active")}>
              Activate
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="danger" onClick={() => onRemove(member._id)}>
              Remove from AT
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center
                          text-blue-600 dark:text-blue-400 text-xl font-bold shrink-0">
            {member.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-lg">{member.name}</p>
            <p className="text-gray-500 dark:text-slate-400 text-sm">{member.email}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={member.status} />
              {member.atApplication?.specialties?.map(s => (
                <Badge key={s} label={s} color="blue" size="sm" />
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-gray-900 dark:text-white">{member.trustScore}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Trust Score</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800/50 rounded-xl p-1">
          {["overview","score","recommend"].map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                          ${activeSection === s
                            ? "bg-blue-600 text-white"
                            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-4">
            {/* Activity stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:"Locations Verified", value: activity?.locationsVerified ?? 0, icon:"📍" },
                { label:"Reviews Written",    value: activity?.locationsSubmitted ?? 0, icon:"✍️" },
                { label:"Tours Voted",        value: activity?.toursVoted        ?? 0, icon:"🗳️" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <span className="text-xl">{icon}</span>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Joined",       fmtDate(member.createdAt)],
                ["Last Active",  fmtDate(member.lastLogin)],
                ["Applied",      fmtDate(member.atApplication?.appliedAt)],
                ["Experience",   member.atApplication?.experience || "—"],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Bio */}
            {member.atApplication?.bio && (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Bio</p>
                <p className="text-sm text-gray-700 dark:text-slate-300">{member.atApplication.bio}</p>
              </div>
            )}

            {/* Current AT score */}
            {member.atScore?.average && (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Current Score</p>
                  <span className={`text-lg font-black ${scoreColor(member.atScore.average)}`}>
                    {member.atScore.average}/10
                  </span>
                </div>
                <ScoreBar label="Experience"         value={member.atScore.experience}        />
                <ScoreBar label="Activity Frequency" value={member.atScore.activityFrequency} />
                <ScoreBar label="Positive Ratio"     value={member.atScore.positiveRatio}     />
              </div>
            )}

            {/* Pending recommendation */}
            {member.atRecommendation?.status === "pending" && (
              <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Pending Recommendation</p>
                <div className="flex items-center gap-2">
                  <Badge label={member.atRecommendation.action} color={REC_COLORS[member.atRecommendation.action]} />
                  <p className="text-sm text-amber-800 dark:text-amber-300">{member.atRecommendation.reason}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="success" onClick={() => onRecommend(member._id, "accept")}>Accept</Button>
                    <Button size="sm" variant="danger"  onClick={() => onRecommend(member._id, "reject")}>Reject</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SCORE */}
        {activeSection === "score" && (isAdmin || isStaff) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Score this member on 3 criteria (0–10). Trust score will be updated automatically.
            </p>
            {[
              { key:"experience",        label:"Experience",         hint:"KOL/KOC experience, expertise depth" },
              { key:"activityFrequency", label:"Activity Frequency", hint:"How often they review, verify locations" },
              { key:"positiveRatio",     label:"Positive Ratio",     hint:"% of positive feedback from users" },
            ].map(({ key, label, hint }) => (
              <FormField key={key} label={`${label}: ${scoreForm[key]}/10`} hint={hint}>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={10} step={1}
                    value={scoreForm[key]}
                    onChange={(e) => setScoreForm({ ...scoreForm, [key]: Number(e.target.value) })}
                    className="flex-1 accent-blue-600"/>
                  <span className={`text-lg font-black w-8 text-right ${scoreColor(scoreForm[key])}`}>
                    {scoreForm[key]}
                  </span>
                </div>
              </FormField>
            ))}
            <FormField label="Notes (optional)">
              <Textarea value={scoreForm.notes}
                onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })}
                rows={3} placeholder="Observations about this member's performance..."/>
            </FormField>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-500 dark:text-slate-400">Average score</span>
              <span className={`text-2xl font-black ${scoreColor(
                parseFloat(((scoreForm.experience + scoreForm.activityFrequency + scoreForm.positiveRatio) / 3).toFixed(1))
              )}`}>
                {((scoreForm.experience + scoreForm.activityFrequency + scoreForm.positiveRatio) / 3).toFixed(1)}/10
              </span>
            </div>
            <Button fullWidth onClick={() => onScore(member._id, scoreForm)}>
              Save Score
            </Button>
          </div>
        )}

        {/* RECOMMEND */}
        {activeSection === "recommend" && isStaff && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Submit a recommendation to Admin. This will not take effect until Admin approves.
            </p>
            <FormField label="Recommended Action">
              <div className="grid grid-cols-2 gap-2">
                {REC_ACTIONS.map(a => (
                  <button key={a} onClick={() => setRecForm({ ...recForm, action: a })}
                    className={`py-2.5 rounded-xl text-sm font-semibold border capitalize transition-all
                                ${recForm.action === a
                                  ? a === "promote" ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-300"
                                    : a === "remove" ? "bg-red-50 border-red-500 text-red-700 dark:bg-red-500/20 dark:border-red-400 dark:text-red-300"
                                    : "bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-500/20 dark:border-amber-400 dark:text-amber-300"
                                  : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
                    {a === "promote" ? "⬆ Promote" : a === "demote" ? "⬇ Demote" : a === "remove" ? "✕ Remove" : "⏸ Suspend"}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Reason (required)">
              <Textarea value={recForm.reason}
                onChange={(e) => setRecForm({ ...recForm, reason: e.target.value })}
                rows={3} placeholder="Reason for this recommendation..."/>
            </FormField>
            <Button fullWidth
              variant={recForm.action === "promote" ? "success" : recForm.action === "remove" ? "danger" : "secondary"}
              onClick={() => onRecommend(member._id, recForm.action, recForm.reason)}
              disabled={!recForm.reason.trim()}>
              Submit to Admin
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Application Review Modal ─────────────────────────────────────────────────
function ApplicationModal({ app, onClose, onReview }) {
  const [reason, setReason] = useState("");
  if (!app) return null;

  return (
    <Modal open={!!app} onClose={onClose} title="Review Application" size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger"
            onClick={() => { if (!reason.trim()) return alert("Please provide a reason for rejection"); onReview(app._id, "reject", reason); }}
            disabled={!reason.trim()}>
            Reject
          </Button>
          <Button variant="success" onClick={() => onReview(app._id, "approve")}>
            ✓ Approve
          </Button>
        </div>
      }>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center
                          text-blue-600 dark:text-blue-400 font-bold text-lg">
            {app.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{app.name}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{app.email}</p>
          </div>
        </div>

        {app.atApplication?.bio && (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Bio</p>
            <p className="text-sm text-gray-700 dark:text-slate-300">{app.atApplication.bio}</p>
          </div>
        )}

        {app.atApplication?.experience && (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Experience</p>
            <p className="text-sm text-gray-700 dark:text-slate-300">{app.atApplication.experience}</p>
          </div>
        )}

        {app.atApplication?.specialties?.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {app.atApplication.specialties.map(s => <Badge key={s} label={s} color="blue" />)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Applied", fmtDate(app.atApplication?.appliedAt)],
            ["Joined",  fmtDate(app.createdAt)],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
              <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        <FormField label="Rejection Reason (required if rejecting)">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
            rows={3} placeholder="Application doesn't meet requirements..."/>
        </FormField>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function ApprovedTeamPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";
  const isStaff  = user?.role === "staff";

  const [activeTab, setActiveTab] = useState("members");
  const [stats, setStats]         = useState(null);

  // Members
  const [members, setMembers]     = useState([]);
  const [pagination, setPag]      = useState({ page:1, totalPages:1, total:0 });
  const [membersLoading, setML]   = useState(false);
  const [search, setSearch]       = useState("");
  const [statusFilter, setSF]     = useState("");
  const [page, setPage]           = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetail, setMemberDetail]     = useState(null);
  const [detailLoading, setDL]    = useState(false);

  // Applications
  const [applications, setApplications] = useState([]);
  const [appsPag, setAppsPag]           = useState({ page:1, totalPages:1, total:0 });
  const [appsLoading, setAL]            = useState(false);
  const [selectedApp, setSelectedApp]   = useState(null);

  // Recommendations (Admin)
  const [recommendations, setRecs] = useState([]);

  // ─── Fetchers ──────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try { setStats(await approvedTeamService.getStats()); } catch(e){ console.error(e); }
  }, []);

  const fetchMembers = useCallback(async (p=1) => {
    setML(true);
    try {
      const params = { page:p, limit:15 };
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const result = await approvedTeamService.getMembers(params);
      setMembers(result.members);
      setPag(result.pagination);
      setPage(p);
    } catch(e){ console.error(e); }
    finally { setML(false); }
  }, [search, statusFilter]);

  const fetchApplications = useCallback(async (p=1) => {
    setAL(true);
    try {
      const result = await approvedTeamService.getApplications({ page:p, limit:15, status:"pending" });
      setApplications(result.applications);
      setAppsPag(result.pagination);
    } catch(e){ console.error(e); }
    finally { setAL(false); }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    try {
      const result = await approvedTeamService.getRecommendations();
      setRecs(result.recommendations);
    } catch(e){ console.error(e); }
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (activeTab === "members")      fetchMembers(1); }, [activeTab, search, statusFilter]);
  useEffect(() => { if (activeTab === "applications") fetchApplications(); }, [activeTab]);
  useEffect(() => { if (activeTab === "recommendations" && isAdmin) fetchRecommendations(); }, [activeTab]);

  // ─── Open member detail ────────────────────────────────────────────────────
  const openMemberDetail = async (member) => {
    setSelectedMember(member);
    setDL(true);
    try {
      const detail = await approvedTeamService.getMemberById(member._id);
      setMemberDetail(detail);
    } catch(e){ console.error(e); }
    finally { setDL(false); }
  };

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleReviewApp = async (userId, action, reason) => {
    try {
      await approvedTeamService.reviewApplication(userId, action, reason);
      setSelectedApp(null); fetchApplications(); fetchStats();
    } catch(e){ alert(e.response?.data?.message||"Error"); }
  };

  const handleScore = async (id, form) => {
    try {
      await approvedTeamService.scoreMember(id, form);
      fetchMembers(page); fetchStats();
      setMemberDetail(null); setSelectedMember(null);
    } catch(e){ alert(e.response?.data?.message||"Error"); }
  };

  const handleRecommend = async (id, action, reason) => {
    try {
      if (isAdmin) {
        // Admin deciding on a pending recommendation
        await approvedTeamService.adminAction(id, action, "");
        fetchRecommendations();
      } else {
        await approvedTeamService.recommendAction(id, action, reason);
      }
      setMemberDetail(null); setSelectedMember(null); fetchMembers(page); fetchStats();
    } catch(e){ alert(e.response?.data?.message||"Error"); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await approvedTeamService.changeMemberStatus(id, status);
      setMemberDetail(null); setSelectedMember(null); fetchMembers(page); fetchStats();
    } catch(e){ alert(e.response?.data?.message||"Error"); }
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this member from Approved Team? They will become a regular user.")) return;
    try {
      await approvedTeamService.removeMember(id);
      setMemberDetail(null); setSelectedMember(null); fetchMembers(page); fetchStats();
    } catch(e){ alert(e.response?.data?.message||"Error"); }
  };

  // ─── Table columns ─────────────────────────────────────────────────────────
  const memberColumns = [
    { key:"name", label:"Member", render:(v,r)=>(
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center
                        text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
          {v?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-white">{v}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">{r.email}</p>
        </div>
      </div>
    )},
    { key:"status",     label:"Status",      render:(v)=><StatusBadge status={v}/> },
    { key:"trustScore", label:"Trust Score", render:(v)=>(
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width:`${Math.min(v,100)}%` }}/>
        </div>
        <span className={`text-sm font-bold ${scoreColor(v/10)}`}>{v}</span>
      </div>
    )},
    { key:"atScore", label:"AT Score", render:(v)=>
      v?.average
        ? <span className={`font-bold text-sm ${scoreColor(v.average)}`}>{v.average}/10</span>
        : <span className="text-gray-400 dark:text-slate-500 text-xs">Not scored</span>
    },
    { key:"activity", label:"Activity", render:(v)=>(
      <div className="text-xs text-gray-600 dark:text-slate-300 space-y-0.5">
        <p>📍 {v?.locationsVerified ?? 0} verified</p>
        <p>🗳️ {v?.toursVoted ?? 0} votes</p>
      </div>
    )},
    { key:"atRecommendation", label:"Pending Rec.", render:(v)=>
      v?.status === "pending"
        ? <Badge label={v.action} color={REC_COLORS[v.action]} dot />
        : <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
    },
    { key:"actions", label:"", render:(_,row)=>(
      <Button size="sm" variant="ghost" onClick={()=>openMemberDetail(row)}>View</Button>
    )},
  ];

  const appColumns = [
    { key:"name", label:"Applicant", render:(v,r)=>(
      <div>
        <p className="font-medium text-sm text-gray-900 dark:text-white">{v}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">{r.email}</p>
      </div>
    )},
    { key:"atApplication", label:"Specialties", render:(v)=>(
      <div className="flex flex-wrap gap-1">
        {v?.specialties?.slice(0,3).map(s=><Badge key={s} label={s} color="blue" size="sm"/>)}
        {(v?.specialties?.length ?? 0) > 3 && <Badge label={`+${v.specialties.length-3}`} color="slate" size="sm"/>}
      </div>
    )},
    { key:"createdAt", label:"Member Since", render:(v)=>fmtDate(v) },
    { key:"atApplication", label:"Applied",  render:(v)=>fmtDate(v?.appliedAt) },
    { key:"actions", label:"", render:(_,row)=>(
      <Button size="sm" variant="primary" onClick={()=>setSelectedApp(row)}>Review</Button>
    )},
  ];

  const selectCls = `bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                     text-gray-700 dark:text-slate-300 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`;

  const tabs = [
    { key:"members",         label:"Members",         count: stats?.activeMembers },
    { key:"applications",    label:"Applications",    count: stats?.pendingApplications   || undefined },
    ...(isAdmin ? [{ key:"recommendations", label:"Recommendations", count: stats?.pendingRecommendations || undefined }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Approved Team Management"
        subtitle="Review applications, score members, manage the Approved Team"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Members"     value={stats?.totalMembers        ?? "—"} icon="✅" color="blue"  />
        <StatCard label="Active Members"    value={stats?.activeMembers       ?? "—"} icon="🟢" color="green" />
        <StatCard label="Avg Trust Score"   value={stats?.avgTrustScore       ?? "—"} icon="⭐" color="amber" />
        <StatCard label="Pending Apps"      value={stats?.pendingApplications ?? "—"} icon="📥" color="red"   />
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ── MEMBERS TAB ── */}
      {activeTab === "members" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search members..." />
            <select value={statusFilter} onChange={(e)=>setSF(e.target.value)} className={selectCls}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <Table columns={memberColumns} data={members} loading={membersLoading}
            emptyText="No Approved Team members found" emptyIcon="✅"/>
          <Pagination page={pagination.page} totalPages={pagination.totalPages}
            total={pagination.total} limit={15} onChange={fetchMembers}/>
        </div>
      )}

      {/* ── APPLICATIONS TAB ── */}
      {activeTab === "applications" && (
        <div>
          {applications.length === 0 && !appsLoading ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">No pending applications</p>
            </div>
          ) : (
            <>
              <Table columns={appColumns} data={applications} loading={appsLoading}
                emptyText="No pending applications" emptyIcon="📥"/>
              <Pagination page={appsPag.page} totalPages={appsPag.totalPages}
                total={appsPag.total} limit={15} onChange={fetchApplications}/>
            </>
          )}
        </div>
      )}

      {/* ── RECOMMENDATIONS TAB (Admin only) ── */}
      {activeTab === "recommendations" && isAdmin && (
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm">No pending recommendations</p>
            </div>
          ) : recommendations.map((m) => (
            <div key={m._id}
                 className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                            rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center
                              text-blue-600 dark:text-blue-400 font-bold shrink-0">
                {m.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{m.name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{m.email}</p>
                {m.atRecommendation?.reason && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">
                    "{m.atRecommendation.reason}"
                  </p>
                )}
              </div>
              <Badge label={m.atRecommendation?.action} color={REC_COLORS[m.atRecommendation?.action]||"slate"} />
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="success"
                  onClick={() => handleRecommend(m._id, "accept")}>
                  Accept
                </Button>
                <Button size="sm" variant="danger"
                  onClick={() => handleRecommend(m._id, "reject")}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Member Detail Modal ── */}
      {selectedMember && (
        <MemberDetailModal
          data={detailLoading ? { member: selectedMember, activity: {} } : memberDetail}
          onClose={() => { setSelectedMember(null); setMemberDetail(null); }}
          onScore={handleScore}
          onRecommend={handleRecommend}
          onStatusChange={handleStatusChange}
          onRemove={handleRemove}
          isAdmin={isAdmin}
          isStaff={isStaff}
        />
      )}

      {/* ── Application Review Modal ── */}
      <ApplicationModal
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
        onReview={handleReviewApp}
      />
    </div>
  );
}