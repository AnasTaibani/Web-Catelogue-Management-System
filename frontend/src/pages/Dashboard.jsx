import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { BookOpen, ArrowUpRight, ArrowDownLeft, Users, AlertTriangle, CheckCircle2, ClockIcon, TrendingUp } from "lucide-react";
import { fmtDate } from "@/lib/exports";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Legend, Area, AreaChart } from "recharts";

const GOLD = "#C8A96A";
const EMERALD = "#3FAF7D";
const RED = "#E27070";

const StatCard = ({ label, value, icon: Icon, hint, spark, accent = GOLD, testId }) => (
  <div data-testid={testId} className="card-lux p-6 relative overflow-hidden group">
    <div className="flex items-start justify-between">
      <div>
        <div className="label-lux">{label}</div>
        <div className="font-serif text-4xl mt-3 text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>{value}</div>
        {hint && <div className="text-xs text-neutral-500 mt-2 flex items-center gap-1.5">{hint}</div>}
      </div>
      <div className="w-10 h-10 rounded-xl grid place-items-center transition-transform group-hover:scale-105" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--ll-border-strong)" }}>
        <Icon className="w-[18px] h-[18px]" style={{ color: accent }} strokeWidth={1.6} />
      </div>
    </div>
    {spark && spark.length > 0 && (
      <div className="mt-4 h-10 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark}>
            <defs>
              <linearGradient id={`grad-${testId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.28} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} fill={`url(#grad-${testId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/dashboard/stats"), api.get("/dashboard/charts")])
      .then(([s, c]) => { setStats(s.data); setCharts(c.data); });
  }, []);

  if (!stats) return <div className="text-neutral-500 text-sm">Loading…</div>;

  const spark = (charts?.issue_trend || []).map((d) => ({ v: d.count }));
  const sparkR = (charts?.return_trend || []).map((d) => ({ v: d.count }));

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Overview</div>
          <h1 className="tracking-tight" style={{ color: "var(--ll-text)" }}>Good day, atelier.</h1>
          <p className="mt-3 text-sm max-w-lg leading-relaxed" style={{ color: "var(--ll-text-3)" }}>A quiet snapshot of every catalogue in the field, every return owed, and every client engaged.</p>
        </div>
        <div className="text-right">
          <div className="label-lux">Today</div>
          <div className="text-sm text-neutral-300 mt-1 font-mono-2">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testId="stat-available" label="Available" value={stats.total_catalogues_available} icon={BookOpen} accent={GOLD} hint="In inventory" />
        <StatCard testId="stat-issued" label="Currently Issued" value={stats.total_catalogues_issued} icon={ArrowUpRight} accent={GOLD} spark={spark} />
        <StatCard testId="stat-returned-today" label="Returned Today" value={stats.returned_today} icon={CheckCircle2} accent={EMERALD} spark={sparkR} />
        <StatCard testId="stat-pending" label="Pending Returns" value={stats.pending_returns} icon={ClockIcon} accent={GOLD} hint="Awaiting return" />
        <StatCard testId="stat-customers" label="Total Clientele" value={stats.total_customers} icon={Users} accent={GOLD} />
        <StatCard testId="stat-overdue" label="Overdue" value={stats.overdue_returns} icon={AlertTriangle} accent={RED} hint={stats.overdue_returns > 0 ? "Requires attention" : "All clear"} />
        <StatCard testId="stat-catalogues" label="Catalogue Titles" value={stats.total_catalogue_items} icon={BookOpen} accent={GOLD} />
        <StatCard testId="stat-recent" label="Recent Activity" value={stats.recent_transactions.length} icon={TrendingUp} accent={GOLD} />
      </section>

      {charts && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card-lux p-7">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="label-lux">Movement</div>
                <h3 className="font-serif text-2xl mt-1 text-white">Issue & Return trend</h3>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: GOLD }} />Issued</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: EMERALD }} />Returned</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts.issue_trend.map((d, i) => ({ date: d.date, issued: d.count, returned: charts.return_trend[i].count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#B8B8B8" }} itemStyle={{ color: "#F5F5F5" }} />
                <Line type="monotone" dataKey="issued" stroke={GOLD} strokeWidth={2} dot={{ r: 3, fill: GOLD }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="returned" stroke={EMERALD} strokeWidth={2} dot={{ r: 3, fill: EMERALD }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card-lux p-7">
            <div className="label-lux">Popularity</div>
            <h3 className="font-serif text-2xl mt-1 text-white mb-6">Most borrowed</h3>
            {charts.most_borrowed.length === 0 ? (
              <div className="text-sm text-neutral-500 text-center py-16">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={charts.most_borrowed} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" stroke="#666" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#B8B8B8" fontSize={11} width={100} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" fill={GOLD} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}

      <section className="card-lux overflow-hidden">
        <div className="px-7 pt-7 pb-5 flex items-center justify-between">
          <div>
            <div className="label-lux">Ledger</div>
            <h3 className="font-serif text-2xl mt-1 text-white">Recent transactions</h3>
          </div>
        </div>
        {stats.recent_transactions.length === 0 ? (
          <div className="text-sm text-neutral-500 py-16 text-center">No transactions yet. Begin by issuing a catalogue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-lux" data-testid="recent-transactions-table">
              <thead>
                <tr>
                  
                  <th>Client</th>
                  <th>Items</th>
                  <th>Issued</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_transactions.map((t) => (
                  <tr key={t.id}>
                    
                    <td className="text-white">{t.customer_name}</td>
                    <td>{t.items.length} title(s) · {t.items.reduce((s, i) => s + i.quantity, 0)} qty</td>
                    <td className="text-neutral-500">{fmtDate(t.issue_date)}</td>
                    <td>
                      <span className={`badge-lux ${t.status === "returned" ? "badge-emerald" : t.status === "partial" ? "badge-gold" : "badge-neutral"}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
