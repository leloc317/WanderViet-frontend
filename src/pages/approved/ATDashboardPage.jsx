import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import atService from "../../services/at.service";
import { StatCard, StatusBadge, CategoryBadge, PageHeader, Badge } from "../../components/ui";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

const CAT_LABEL = {
  restaurant:"🍽️", tourist_spot:"🏛️", hotel:"🏨", cafe:"☕",
  entertainment:"🎡", shopping:"🛍️", service:"🔧", other:"📦",
};

function TrustScoreCard({ score }) {
  const pct  = Math.min(score, 100);
  const color = pct >= 70 ? "text-emerald-600 dark:text-emerald-400"
              : pct >= 40 ? "text-amber-600 dark:text-amber-400"
              :              "text-red-500";
  const bar   = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                    rounded-2xl p-5 col-span-2">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Trust Score</p>
          <p className={`text-4xl font-black ${color}`}>{score}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">out of 100</p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full
                            ${pct >= 70 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            : pct >= 40 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                            :             "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"}`}>
            {pct >= 70 ? "⭐ High Trust" : pct >= 40 ? "📈 Growing" : "🌱 Building"}
          </span>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
            Score increases with activity
          </p>
        </div>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${bar}`}
             style={{ width: `${pct}%` }}/>
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-slate-500">
        <span>0</span>
        <span className="text-emerald-500">+2 per review · +1 per vote</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default function ATDashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    atService.getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl"/>)}
      </div>
    </div>
  );

  const { member, stats, recentSubmitted, recentVotes } = data || {};

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${member?.name?.split(" ")[0] || ""}! 👋`}
        subtitle="Here's your Approved Team activity overview"
      />

      {/* Trust Score + Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <TrustScoreCard score={member?.trustScore ?? 0} />
        <StatCard label="Locations Verified"  value={stats?.totalVerified}         icon="📍" color="teal"   />
        <StatCard label="Reviews Written"      value={stats?.totalSubmitted}        icon="✍️" color="blue"   />
        <StatCard label="Tours Voted"          value={stats?.totalVotes}            icon="🗳️" color="purple" />
        <StatCard label="Pending Approval"     value={stats?.pendingLocations}      icon="⏳" color="amber"  />
        <StatCard label="Verified This Month"  value={stats?.verifiedThisMonth}     icon="✅" color="green"  />
      </div>

      {/* AT Score breakdown */}
      {member?.atScore?.average && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800
                        rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Performance Score</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Experience",         value: member.atScore.experience        ?? 0 },
              { label: "Activity Frequency", value: member.atScore.activityFrequency ?? 0 },
              { label: "Positive Ratio",     value: member.atScore.positiveRatio     ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
                  <span className={`text-sm font-bold
                                    ${value >= 7 ? "text-emerald-600 dark:text-emerald-400"
                                    : value >= 4 ? "text-amber-600 dark:text-amber-400"
                                    :              "text-red-500"}`}>
                    {value}/10
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full
                                   ${value >= 7 ? "bg-emerald-500" : value >= 4 ? "bg-amber-500" : "bg-red-500"}`}
                       style={{ width: `${value * 10}%` }}/>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-slate-500">Average</span>
            <span className="text-lg font-black text-teal-600 dark:text-teal-400">
              {member.atScore.average}/10
            </span>
          </div>
          {member.atScore.notes && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 italic border-t border-gray-100 dark:border-slate-800 pt-2">
              Staff note: {member.atScore.notes}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent submissions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-white">My Recent Locations</h2>
            <Link to="/approved/locations"
              className="text-teal-600 dark:text-teal-400 text-sm hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {!recentSubmitted?.length ? (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                <p className="text-2xl mb-2">📍</p>
                No locations yet.{" "}
                <Link to="/locations/add" className="text-teal-600 dark:text-teal-400 underline">
                  Add your first one
                </Link>
              </div>
            ) : recentSubmitted.map(loc => (
              <div key={loc._id}
                className="flex items-center gap-3 bg-white dark:bg-slate-900
                           border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-slate-800 rounded-lg
                                flex items-center justify-center text-base shrink-0">
                  {CAT_LABEL[loc.category] || "📍"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{loc.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{fmtDate(loc.createdAt)}</p>
                </div>
                <StatusBadge status={loc.status} size="sm"/>
              </div>
            ))}
          </div>
        </div>

        {/* Recent votes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-white">My Recent Votes</h2>
            <Link to="/approved/vote"
              className="text-teal-600 dark:text-teal-400 text-sm hover:underline">
              Vote more →
            </Link>
          </div>
          <div className="space-y-2">
            {!recentVotes?.length ? (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                <p className="text-2xl mb-2">🗳️</p>
                No votes yet.{" "}
                <Link to="/approved/vote" className="text-teal-600 dark:text-teal-400 underline">
                  Vote on tours
                </Link>
              </div>
            ) : recentVotes.map(tour => (
              <div key={tour._id}
                className="flex items-center gap-3 bg-white dark:bg-slate-900
                           border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{tour.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-emerald-500 font-medium">{tour.voteStats?.approve ?? 0}✓</span>
                    <span className="text-xs text-red-500 font-medium">{tour.voteStats?.reject ?? 0}✗</span>
                    <span className="text-xs text-gray-400">{tour.voteStats?.neutral ?? 0}~</span>
                  </div>
                </div>
                <StatusBadge status={tour.status} size="sm"/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}