'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { Users, ArrowLeftRight, TrendingUp, AlertTriangle, Clock, CheckCircle, XCircle, ChevronRight, Coins, Wallet, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNGN, getErrorMessage } from '@/lib/utils';
import type { AdminStats, AdminChartData, AidapayOverview } from '@/types';

function AidapayOverviewCard() {
  const [data, setData] = useState<AidapayOverview | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi.aidapayOverview()
      .then((r) => setData(r.data.data))
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">AidaPay Account</p>
        <button onClick={load} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!loading && err && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={15} className="shrink-0" />
          Couldn&apos;t reach AidaPay: {err}
        </div>
      )}

      {!loading && !err && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Provider Balance"
              value={formatNGN(data.balance)}
              sub={data.phone ?? undefined}
              icon={Wallet}
              color={data.balance < data.lowBalanceThreshold ? 'bg-red-500/20 text-red-400' : 'bg-teal-500/20 text-teal-400'}
            />
            <StatCard
              label="Commission Earned"
              value={formatNGN(data.commissionBalance)}
              sub={data.name ?? undefined}
              icon={Coins}
              color="bg-amber-500/20 text-amber-400"
            />
          </div>
          {data.balance < data.lowBalanceThreshold && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">
                AidaPay balance is low — fund the account or live VTU purchases will start failing.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Status triad reused from the badges already used across admin pages, for
// visual consistency — the green/yellow pair sits in the CVD 6-8 "warn but
// legal" band, mitigated by always shipping a text-labeled legend below
// (never color alone).
const STATUS_HUES = { success: '#4ade80', pending: '#facc15', failed: '#f87171' };
// First 3 slots of the dataviz skill's validated dark categorical palette —
// passes all-pairs CVD/contrast checks against this panel's card surface.
const PROVIDER_HUES = ['#3987e5', '#d95926', '#199e70'];
const SEQUENTIAL_BLUE = '#3987e5';

const chartTick = { fill: '#64748b', fontSize: 11 };
const shortDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <p className="text-white text-sm font-bold">{title}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5 mb-2">{sub}</p>}
      <div className="h-64 mt-2">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#cbd5e1', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#e2e8f0' },
};

const STATUS_COLORS: Record<string, string> = {
  active:      'bg-green-500/10 text-green-400 border-green-500/20',
  suspended:   'bg-red-500/10 text-red-400 border-red-500/20',
  pending_kyc: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-purple-500/10 text-purple-400',
  developer: 'bg-blue-500/10 text-blue-400',
  agent:     'bg-cyan-500/10 text-cyan-400',
  customer:  'bg-slate-500/10 text-slate-400',
};

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={17} />
        </div>
      </div>
      <p className="text-white text-2xl font-black">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [charts, setCharts] = useState<AdminChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    adminApi.stats()
      .then((r) => setStats(r.data.data))
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load stats'))
      .finally(() => setLoading(false));
    adminApi.chartData()
      .then((r) => setCharts(r.data.data))
      .catch(() => setCharts(null));
  }, []);

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  if (err) return (
    <div className="p-8 flex items-center gap-3 text-red-400">
      <AlertTriangle size={18} />
      {err}
    </div>
  );

  if (!stats) return null;
  const { users, transactions } = stats;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-black">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Platform health at a glance</p>
      </div>

      <AidapayOverviewCard />

      {/* User stats */}
      <section className="mb-8">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Users</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"   value={users.total}      icon={Users}         color="bg-blue-500/20 text-blue-400" />
          <StatCard label="Active"        value={users.active}     icon={CheckCircle}   color="bg-green-500/20 text-green-400" />
          <StatCard label="Suspended"     value={users.suspended}  icon={XCircle}       color="bg-red-500/20 text-red-400" />
          <StatCard label="Pending KYC"   value={users.pendingKyc} icon={Clock}         color="bg-yellow-500/20 text-yellow-400" />
        </div>
      </section>

      {/* Transaction stats */}
      <section className="mb-8">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Transactions</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="All-time volume"
            value={formatNGN(transactions.allTime.volume)}
            sub={`${transactions.allTime.success.toLocaleString()} successful`}
            icon={TrendingUp}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            label="Today"
            value={formatNGN(transactions.today.volume)}
            sub={`${transactions.today.count} txns`}
            icon={ArrowLeftRight}
            color="bg-brand-blue/20 text-blue-400"
          />
          <StatCard
            label="This week"
            value={formatNGN(transactions.week.volume)}
            sub={`${transactions.week.count} txns`}
            icon={ArrowLeftRight}
            color="bg-indigo-500/20 text-indigo-400"
          />
          <StatCard
            label="This month"
            value={formatNGN(transactions.month.volume)}
            sub={`${transactions.month.count} txns`}
            icon={ArrowLeftRight}
            color="bg-purple-500/20 text-purple-400"
          />
        </div>

        {/* Failed indicator */}
        {transactions.allTime.failed > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <AlertTriangle size={15} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">
              <span className="font-bold">{transactions.allTime.failed}</span> failed transactions — <Link href="/admin/transactions?status=failed" className="underline">review now</Link>
            </p>
          </div>
        )}
      </section>

      {/* Margin earned */}
      <section className="mb-8">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Margin Earned <span className="normal-case text-slate-500">(VTU markup, reseller sales excluded — only counts purchases made since the pricing engine shipped)</span>
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="All-time" value={formatNGN(transactions.allTime.margin)} icon={Coins} color="bg-amber-500/20 text-amber-400" />
          <StatCard label="Today"     value={formatNGN(transactions.today.margin)}  icon={Coins} color="bg-amber-500/20 text-amber-400" />
          <StatCard label="This week" value={formatNGN(transactions.week.margin)}   icon={Coins} color="bg-amber-500/20 text-amber-400" />
          <StatCard label="This month" value={formatNGN(transactions.month.margin)} icon={Coins} color="bg-amber-500/20 text-amber-400" />
        </div>
      </section>

      {/* Charts */}
      {charts && (
        <section className="mb-8">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Last 30 days</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Successful transaction volume" sub="₦ per day, successful transactions only">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailyVolume} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={chartTick} axisLine={{ stroke: '#334155' }} tickLine={false}
                    interval={Math.max(0, Math.ceil(charts.dailyVolume.length / 7) - 1)} />
                  <YAxis tick={chartTick} axisLine={false} tickLine={false} width={48}
                    tickFormatter={(v) => v >= 1000000 ? `₦${(v / 1000000).toFixed(1)}m` : v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => formatNGN(Number(v))} labelFormatter={(l) => shortDate(String(l))} />
                  <Area type="monotone" dataKey="volume" stroke={SEQUENTIAL_BLUE} fill={SEQUENTIAL_BLUE} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Daily active users" sub="Distinct users who transacted that day">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.dailyActiveUsers} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={chartTick} axisLine={{ stroke: '#334155' }} tickLine={false}
                    interval={Math.max(0, Math.ceil(charts.dailyActiveUsers.length / 7) - 1)} />
                  <YAxis tick={chartTick} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} labelFormatter={(l) => shortDate(String(l))} />
                  <Line type="monotone" dataKey="count" name="Active users" stroke={SEQUENTIAL_BLUE} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Transaction outcomes" sub="Count per day, by status">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.dailyVolume} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={chartTick} axisLine={{ stroke: '#334155' }} tickLine={false}
                    interval={Math.max(0, Math.ceil(charts.dailyVolume.length / 7) - 1)} />
                  <YAxis tick={chartTick} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} labelFormatter={(l) => shortDate(String(l))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  <Bar dataKey="success" name="Success" stackId="s" fill={STATUS_HUES.success} stroke="#1e293b" strokeWidth={2} />
                  <Bar dataKey="pending" name="Pending" stackId="s" fill={STATUS_HUES.pending} stroke="#1e293b" strokeWidth={2} />
                  <Bar dataKey="failed"  name="Failed"  stackId="s" fill={STATUS_HUES.failed}  stroke="#1e293b" strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Funding by provider" sub="Successful deposits, last 30 days">
              {charts.providerBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">No deposits yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.providerBreakdown} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="#334155" strokeDasharray="3 3" />
                    <XAxis type="number" tick={chartTick} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1000000 ? `₦${(v / 1000000).toFixed(1)}m` : `₦${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="provider" tick={chartTick} axisLine={false} tickLine={false} width={80}
                      tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                    <Tooltip {...tooltipStyle} formatter={(v) => formatNGN(Number(v))} />
                    <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                      {charts.providerBreakdown.map((_, i) => (
                        <Cell key={i} fill={PROVIDER_HUES[i % PROVIDER_HUES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </section>
      )}

      {/* Recent sign-ups */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Recent sign-ups</p>
          <Link href="/admin/users" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300 transition-colors">
            View all <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl divide-y divide-slate-700/30">
          {stats.recentUsers.length === 0 && (
            <p className="text-slate-500 text-sm p-5">No users yet.</p>
          )}
          {stats.recentUsers.map((u) => (
            <Link key={u._id} href={`/admin/users/${u._id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/30 transition-colors group">
              <div className="w-9 h-9 rounded-full bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center shrink-0">
                <span className="text-blue-400 text-sm font-bold">{u.firstName[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{u.firstName} {u.lastName}</p>
                <p className="text-slate-500 text-xs truncate">{u.phone?.number}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[u.status] ?? ''}`}>
                  {u.status === 'pending_kyc' ? 'KYC' : u.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? ''}`}>
                  {u.role}
                </span>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
