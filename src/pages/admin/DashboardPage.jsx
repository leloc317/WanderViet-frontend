import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import dashboardService from "../../services/dashboard.service";
import { StatCard, Tabs, Badge, StatusBadge, PageHeader } from "../../components/ui";

// ─── Constants ────────────────────────────────────────────────────────────────
const fmt     = (n) => (n ?? 0).toLocaleString("en-US");
const fmtVND  = (n) => `₫${((n ?? 0) / 1000).toLocaleString("en-US")}k`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "—";

const CAT_LABEL = {
  restaurant:"Restaurant", tourist_spot:"Tourist Spot", hotel:"Hotel",
  cafe:"Cafe", entertainment:"Entertainment", shopping:"Shopping",
  service:"Service", other:"Other",
  food_tour:"Food Tour", sightseeing:"Sightseeing", adventure:"Adventure",
  cultural:"Cultural", relaxation:"Relaxation", mixed:"Mixed",
};

const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];
const PIE_COLORS   = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

// ─── Shared chart theme ───────────────────────────────────────────────────────
const chartStyle = {
  cartesian: { stroke: "rgba(148,163,184,0.15)" },
  tooltip:   {
    contentStyle: {
      background: "var(--tw-bg, #0f172a)",
      border: "0.5px solid rgba(148,163,184,0.2)",
      borderRadius: 12, fontSize: 12,
    },
  },
  axis: { tick: { fontSize: 11, fill: "#94a3b8" }, axisLine: false, tickLine: false },
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, height = 220 }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200
                    dark:border-slate-800 rounded-2xl p-4 sm:p-5">
      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-0.5">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3 sm:mb-4">{subtitle}</p>
      )}
      {/* Mobile: fixed smaller height, desktop: original height */}
      <div className="h-44 sm:h-auto" style={{ ["--h"]: `${height}px` }}>
        <div className="h-full sm:h-[var(--h)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Rank list ────────────────────────────────────────────────────────────────
function RankList({ items, renderItem }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}
          className="flex items-center gap-3 bg-white dark:bg-slate-900
                     border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500 w-5 shrink-0">
            #{i+1}
          </span>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-gray-200 dark:bg-slate-800 rounded-2xl h-24"/>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {[1,2].map(i => (
          <div key={i} className="bg-gray-200 dark:bg-slate-800 rounded-2xl h-48 sm:h-64"/>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: SYSTEM OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab({ data }) {
  if (!data) return <LoadingSkeleton />;
  const users   = data.users   || {};
  const content = data.content || {};
  const charts  = data.charts  || {};
  return (
    <div>
      {/* User metrics */}
      <Section title="User Metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Users"    value={fmt(users.total)}    icon="👥" color="blue"  />
          <StatCard label="New Today"      value={fmt(users.newToday)} icon="🆕" color="green" />
          <StatCard label="New This Week"  value={fmt(users.newWeek)}  icon="📅" color="teal"  />
          <StatCard label="Active Users"   value={fmt(users.active)}   icon="✅" color="amber" />
        </div>
      </Section>

      {/* Content metrics */}
      <Section title="Content Metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Locations"    value={fmt(content.totalLocations)}    icon="📍" color="blue"   />
          <StatCard label="Pending Approval"   value={fmt(content.pendingLocations)}  icon="⏳" color="amber"  />
          <StatCard label="Total Tours"        value={fmt(content.totalTours)}        icon="🗺️" color="purple" />
          <StatCard label="Total Reviews"      value={fmt(content.totalReviews)}      icon="⭐" color="green"  />
        </div>
      </Section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Daily Activity" subtitle="New users & locations (last 7 days)" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.dailyChart}>
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} />
              <XAxis dataKey="date" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="users"     name="New Users"     stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="locations" name="New Locations"  stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pending Queue" subtitle="Items waiting for admin action" height={240}>
          <div className="space-y-4 pt-4">
            {[
              { label:"Locations to Approve",  value: content.pendingLocations, max:50, color:"#f59e0b", link:"/admin/locations"  },
              { label:"Tours to Review",        value: content.pendingTours,    max:30, color:"#3b82f6", link:"/admin/tours"       },
              { label:"Total Views",            value: content.totalViews,      max:10000, color:"#10b981", link:null             },
              { label:"New This Month",         value: users.newMonth,          max:500, color:"#8b5cf6", link:null               },
            ].map(({ label, value, max, color, link }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-slate-300">{label}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(value)}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                       style={{ width:`${Math.min((value/max)*100,100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: LOCATION & CONTENT
// ═══════════════════════════════════════════════════════════════════════════
function LocationTab({ data }) {
  if (!data) return <LoadingSkeleton />;
  const byCategory  = data.byCategory  || [];
  const byStatus    = data.byStatus    || [];
  const topByViews  = data.topByViews  || [];
  const topByRating = data.topByRating || [];
  const charts      = data.charts      || {};

  const statusData = byStatus.map(s => ({ name: s._id, value: s.count }));
  const catData    = byCategory.slice(0,8).map(c => ({
    name: CAT_LABEL[c._id] || c._id, value: c.count,
  }));

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {byStatus.map(s => {
          const colorMap = { approved:"green", pending:"amber", rejected:"red", suspended:"purple" };
          return (
            <StatCard key={s._id} label={`${s._id.charAt(0).toUpperCase()+s._id.slice(1)} Locations`}
              value={fmt(s.count)} icon="📍" color={colorMap[s._id] || "blue"} />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <ChartCard title="Locations by Category" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} horizontal={false} />
              <XAxis type="number" {...chartStyle.axis} />
              <YAxis type="category" dataKey="name" width={90} {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Bar dataKey="value" name="Locations" radius={[0,4,4,0]}>
                {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Approval Status" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={90}
                   dataKey="value" nameKey="name" label={({ name, percent }) =>
                     `${name} ${(percent*100).toFixed(0)}%`}
                   labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip {...chartStyle.tooltip} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Section title="Top 10 Most Viewed">
          <RankList items={topByViews.slice(0,8)} renderItem={(loc) => (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{loc.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{CAT_LABEL[loc.category]} · {loc.address?.city}</p>
            </div>
          ) || (
            <div className="ml-auto text-right shrink-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(loc["stats.detailViews"])} views</p>
              <p className="text-xs text-amber-500">★ {loc["rating.finalScore"]?.toFixed(1) ?? "0.0"}</p>
            </div>
          )} />
        </Section>

        <Section title="Top 10 Highest Rated">
          <RankList items={topByRating.slice(0,8)} renderItem={(loc) => (
            <>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{loc.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{CAT_LABEL[loc.category]} · {loc.address?.city}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-amber-500">★ {loc.rating?.finalScore?.toFixed(1) ?? "0.0"}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{fmt(loc.rating?.totalReviews)} reviews</p>
              </div>
            </>
          )} />
        </Section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: APPROVED TEAM PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════
function ATPerformanceTab({ data }) {
  if (!data) return <LoadingSkeleton />;
  const summary      = data.summary      || {};
  const topPerformers = data.topPerformers || [];
  const lowActivity  = data.lowActivity  || [];
  const charts       = data.charts       || {};

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total Members"   value={summary.total}     icon="✅" color="blue"   />
        <StatCard label="Active"          value={summary.active}    icon="🟢" color="green"  />
        <StatCard label="Suspended"       value={summary.suspended} icon="🔒" color="red"    />
        <StatCard label="Avg Trust Score" value={summary.avgTrust}  icon="⭐" color="amber"  />
        <StatCard label="Avg AT Score"    value={`${summary.avgScore}/10`} icon="📊" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <ChartCard title="Trust Score Distribution" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.trustBuckets}>
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} />
              <XAxis dataKey="label" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Bar dataKey="count" name="Members" radius={[4,4,0,0]}>
                {charts.trustBuckets.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Verifiers (Locations Confirmed)" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.locVerified.slice(0,7)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} horizontal={false} />
              <XAxis type="number" {...chartStyle.axis} />
              <YAxis type="category" dataKey="user.name" width={80} {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Bar dataKey="count" name="Verified" fill="#3b82f6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Section title="Top Performers">
          <RankList items={topPerformers} renderItem={(m) => (
            <>
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-600/20 flex items-center
                              justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
                {m.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white">{m.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{m.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-amber-500">{m.trustScore}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">trust</p>
              </div>
            </>
          )} />
        </Section>

        <Section title="Low Activity Members">
          <RankList items={lowActivity} renderItem={(m) => (
            <>
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-600/20 flex items-center
                              justify-center text-red-500 text-sm font-bold shrink-0">
                {m.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white">{m.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Last active: {m.lastLogin ? fmtDate(m.lastLogin) : "Never"}
                </p>
              </div>
              <StatusBadge status={m.status} />
            </>
          )} />
        </Section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: USER BEHAVIOUR
// ═══════════════════════════════════════════════════════════════════════════
function UserBehaviourTab({ data }) {
  if (!data) return <LoadingSkeleton />;
  const usersByRole     = data.usersByRole     || [];
  const topToursByUsage = data.topToursByUsage || [];
  const charts          = data.charts          || { budgetTrend: [], engagementByCategory: [], bookingsByHour: [] };

  const budgetData = (charts.budgetTrend || []).map(b => ({
    name: (b._id||"unknown").charAt(0).toUpperCase() + (b._id||"unknown").slice(1),
    value: b.count,
  }));

  const catData = charts.popularCategories.slice(0,8).map(c => ({
    name: CAT_LABEL[c._id] || c._id,
    views: c.views,
    count: c.count,
  }));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {usersByRole.map(r => {
          const icons = { user:"👤", admin:"⚙️", staff:"👔", approved:"✅", company:"🏢" };
          return (
            <StatCard key={r._id} label={r._id.charAt(0).toUpperCase()+r._id.slice(1)}
              value={fmt(r.count)} icon={icons[r._id]||"👤"} color="blue" />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <ChartCard title="User Growth" subtitle="New registrations per month" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.userGrowthChart}>
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} />
              <XAxis dataKey="label" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Area type="monotone" dataKey="count" name="New Users"
                stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Budget Preference" subtitle="Travel budget distribution" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={budgetData} cx="50%" cy="50%" outerRadius={90}
                   dataKey="value" nameKey="name"
                   label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {budgetData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip {...chartStyle.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <ChartCard title="Popular Location Categories by Views" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} horizontal={false} />
              <XAxis type="number" {...chartStyle.axis} />
              <YAxis type="category" dataKey="name" width={90} {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Bar dataKey="views" name="Total Views" radius={[0,4,4,0]}>
                {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tours by Category" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.toursByCategory.map(c=>({ name: CAT_LABEL[c._id]||c._id, count:c.count }))}>
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} />
              <XAxis dataKey="name" {...chartStyle.axis} tick={{ fontSize:10, fill:"#94a3b8" }} />
              <YAxis {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Bar dataKey="count" name="Tours" radius={[4,4,0,0]} fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Section title="Most Used Tour Templates">
        <RankList items={topToursByUsage.slice(0,8)} renderItem={(t) => (
          <>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{t.title}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {CAT_LABEL[t.category]} · {t.budget?.label}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(t.stats?.used)} uses</p>
              <p className="text-xs text-amber-500">★ {t.rating?.avg?.toFixed(1) ?? "0.0"}</p>
            </div>
          </>
        )} />
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: ADVERTISEMENT PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════
function AdsTab({ data }) {
  if (!data) return <LoadingSkeleton />;
  const summary          = data.summary          || {};
  const revenueByPackage = data.revenueByPackage || [];
  const topAds           = data.topAds           || [];
  const charts           = data.charts           || {};

  const pkgData = revenueByPackage.map(p => ({
    name: (p._id||"unknown").charAt(0).toUpperCase()+(p._id||"unknown").slice(1),
    revenue: p.revenue,
    orders:  p.count,
  }));

  const PKG_COLOR = { Basic:"#3b82f6", Standard:"#8b5cf6", Premium:"#f59e0b" };

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total Revenue"  value={fmtVND(summary.totalRevenue)} icon="💰" color="green"  />
        <StatCard label="Active Ads"     value={fmt(summary.activeCount)}      icon="📢" color="blue"   />
        <StatCard label="Pending"        value={fmt(summary.pendingCount)}      icon="⏳" color="amber"  />
        <StatCard label="Avg CTR"        value={`${summary.avgCTR}%`}          icon="📊" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <ChartCard title="Monthly Revenue" subtitle="Ad revenue trend (last 6 months)" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} />
              <XAxis dataKey="label" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} tickFormatter={v => `₫${(v/1000).toFixed(0)}k`} />
              <Tooltip {...chartStyle.tooltip}
                formatter={(v) => [`₫${(v/1000).toFixed(0)}k`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" name="Revenue"
                stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Package Type" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pkgData}>
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} />
              <XAxis dataKey="name" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} tickFormatter={v => `₫${(v/1000).toFixed(0)}k`} />
              <Tooltip {...chartStyle.tooltip} formatter={(v) => [`₫${(v/1000).toFixed(0)}k`]} />
              <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]}>
                {pkgData.map((p) => <Cell key={p.name} fill={PKG_COLOR[p.name] || "#3b82f6"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Section title="Top Performing Ads">
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
                {["#","Location","Company","Package","Impressions","Clicks","CTR","Amount"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide
                                         text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topAds.map((ad, i) => {
                const ctr = ad.stats?.impressions
                  ? ((ad.stats.clicks / ad.stats.impressions)*100).toFixed(1)
                  : "0.0";
                return (
                  <tr key={ad._id} className="border-b border-gray-100 dark:border-slate-800/50
                                               hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-gray-400 dark:text-slate-500">#{i+1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{ad.location?.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{ad.location?.address?.city}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{ad.company?.name}</td>
                    <td className="px-4 py-3">
                      <Badge label={ad.packageSnapshot?.type} color={{basic:"blue",standard:"purple",premium:"amber"}[ad.packageSnapshot?.type]||"slate"} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{fmt(ad.stats?.impressions)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{fmt(ad.stats?.clicks)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${Number(ctr)>=3?"text-emerald-600 dark:text-emerald-400":"text-gray-600 dark:text-slate-300"}`}>
                        {ctr}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {fmtVND(ad.payment?.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6: TRUST & MODERATION
// ═══════════════════════════════════════════════════════════════════════════
function ModerationTab({ data }) {
  if (!data) return <LoadingSkeleton />;
  const summary            = data.summary            || {};
  const lowTrustMembers    = data.lowTrustMembers    || [];
  const noReviewLocations  = data.noReviewLocations  || [];
  const recentSuspensions  = data.recentSuspensions  || [];
  const charts             = data.charts             || { ratingDistribution: [], reviewTimeline: [] };

  const ratingDist = (charts.ratingDistribution || []).map(r => ({
    label: r._id === "Other" ? "N/A" : `${r._id}★`,
    count: r.count,
  }));

  return (
    <div>
      {/* Alert banner for pending items */}
      {(summary.pendingLocations > 0 || summary.pendingTours > 0 || summary.pendingApplications > 0) && (
        <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20
                        rounded-2xl px-5 py-4 mb-6 flex items-center gap-4 flex-wrap">
          <span className="text-amber-500 text-xl">⚠️</span>
          <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
            Action Required
          </p>
          <div className="flex gap-3 flex-wrap">
            {summary.pendingLocations > 0 && (
              <Badge label={`${summary.pendingLocations} locations pending`} color="yellow" dot />
            )}
            {summary.pendingTours > 0 && (
              <Badge label={`${summary.pendingTours} tours pending`} color="yellow" dot />
            )}
            {summary.pendingApplications > 0 && (
              <Badge label={`${summary.pendingApplications} AT applications`} color="yellow" dot />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Suspended Users"     value={summary.suspendedUsers}     icon="🔒" color="red"    />
        <StatCard label="Banned Users"        value={summary.bannedUsers}        icon="⛔" color="red"    />
        <StatCard label="Suspended Locations" value={summary.suspendedLocations} icon="📍" color="amber"  />
        <StatCard label="Low Trust AT Members"value={summary.lowTrustMembers}    icon="⚠️" color="amber"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <ChartCard title="Rating Distribution" subtitle="Approved locations by score" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ratingDist}>
              <CartesianGrid strokeDasharray="3 3" {...chartStyle.cartesian} />
              <XAxis dataKey="label" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} />
              <Tooltip {...chartStyle.tooltip} />
              <Bar dataKey="count" name="Locations" radius={[4,4,0,0]}>
                {ratingDist.map((_, i) => (
                  <Cell key={i} fill={i < 2 ? "#ef4444" : i < 3 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pending Approval Queue" height={240}>
          <div className="space-y-4 pt-4">
            {[
              { label:"Locations",      value:summary.pendingLocations,  max:50,  color:"#f59e0b", link:"/admin/locations"     },
              { label:"Tours",          value:summary.pendingTours,      max:30,  color:"#3b82f6", link:"/admin/tours"         },
              { label:"AT Applications",value:summary.pendingApplications, max:20, color:"#10b981", link:"/admin/approved-team" },
              { label:"Rejected Locs",  value:summary.rejectedLocations, max:100, color:"#ef4444", link:null                  },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-slate-300">{label}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(value)}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                       style={{ width:`${Math.min((value/max)*100,100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Section title="Low Trust AT Members">
          <RankList items={lowTrustMembers.slice(0,5)} renderItem={(m) => (
            <>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{m.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Last active: {m.lastLogin ? fmtDate(m.lastLogin) : "Never"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-red-500">{m.trustScore}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">trust</p>
              </div>
            </>
          )} />
        </Section>

        <Section title="Recently Suspended">
          <RankList items={recentSuspensions.slice(0,5)} renderItem={(u) => (
            <>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{u.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{u.email}</p>
              </div>
              <StatusBadge status={u.status} size="sm" />
            </>
          )} />
        </Section>

        <Section title="Locations Without Reviews">
          <RankList items={noReviewLocations.slice(0,5)} renderItem={(loc) => (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{loc.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {CAT_LABEL[loc.category]} · Added {fmtDate(loc.createdAt)}
              </p>
            </div>
          )} />
        </Section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { key:"overview",   label:"System Overview"     },
  { key:"locations",  label:"Location & Content"  },
  { key:"at",         label:"AT Performance"      },
  { key:"behaviour",  label:"User Behaviour"      },
  { key:"ads",        label:"Advertisements"      },
  { key:"moderation", label:"Trust & Moderation"  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [cache, setCache]         = useState({});
  const [loading, setLoading]     = useState(false);

  const fetchTab = useCallback(async (tab) => {
    if (cache[tab]) return; // already loaded
    setLoading(true);
    try {
      const fetchMap = {
        overview:   dashboardService.getOverview,
        locations:  dashboardService.getLocations,
        at:         dashboardService.getATPerformance,
        behaviour:  dashboardService.getUserBehaviour,
        ads:        dashboardService.getAds,
        moderation: dashboardService.getModeration,
      };
      const data = await fetchMap[tab]();
      setCache(prev => ({ ...prev, [tab]: data }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);

  const handleTabChange = (tab) => { setActiveTab(tab); };

  const tabData = cache[activeTab];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="System monitoring and analytics"
        action={
          <button
            onClick={() => { setCache({}); fetchTab(activeTab); }}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400
                       hover:text-gray-700 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        }
      />

      <Tabs tabs={TABS} active={activeTab} onChange={handleTabChange} variant="underline" />

      {loading && !tabData ? (
        <LoadingSkeleton />
      ) : (
        <>
          {activeTab === "overview"   && <OverviewTab      data={tabData} />}
          {activeTab === "locations"  && <LocationTab      data={tabData} />}
          {activeTab === "at"         && <ATPerformanceTab data={tabData} />}
          {activeTab === "behaviour"  && <UserBehaviourTab data={tabData} />}
          {activeTab === "ads"        && <AdsTab           data={tabData} />}
          {activeTab === "moderation" && <ModerationTab    data={tabData} />}
        </>
      )}
    </div>
  );
}