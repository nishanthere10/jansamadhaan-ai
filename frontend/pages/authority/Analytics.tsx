import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import {
  BarChart3, TrendingUp, Clock, CheckCircle2,
  Activity, ArrowUpRight, ArrowDownRight, Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from 'recharts';

interface Incident {
  id: string;
  status: string;
  severity: string;
  category: string;
  ai_processing_status?: string;
  created_at: string;
}

// ── Custom Tooltip ──────────────────────────────
interface CustomTooltipProps {
  active?: boolean;
  payload?: Record<string, unknown>[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--cr-surface)',
      border: '1px solid var(--cr-border)',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 13,
      color: 'var(--cr-text)',
      boxShadow: 'var(--cr-shadow-md)',
    }}>
      {label && <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>}
      {payload.map((p: { fill?: string; color?: string; name?: string; value?: React.ReactNode }, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }}>{p.name}: <strong>{p.value as React.ReactNode}</strong></p>
      ))}
    </div>
  );
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#B91C1C',
  high:     '#EA580C',
  medium:   '#D97706',
  low:      '#1A7A3E',
};

const STATUS_COLORS: Record<string, string> = {
  pending:       '#D97706',
  assigned:      '#4F46E5',
  'in-progress': '#0055A4',
  in_progress:   '#0055A4',
  resolved:      '#1A7A3E',
  rejected:      '#B91C1C',
};

const CAT_COLORS = ['#0055A4','#F47920','#1A7A3E','#8b5cf6','#0ea5e9','#ec4899','#14b8a6'];

export default function Analytics() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/v1/incidents')
      .then(r => r.json())
      .then(d => { if (d.data) setIncidents(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total       = incidents.length;
  const pending     = incidents.filter(i => i.status === 'pending').length;
  const inProgress  = incidents.filter(i => i.status === 'in-progress' || i.status === 'in_progress').length;
  const resolved    = incidents.filter(i => i.status === 'resolved').length;
  const aiProcessed = incidents.filter(i => i.ai_processing_status === 'completed').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // ── Category data ──────────────────────────────
  const catMap: Record<string, number> = {};
  incidents.forEach(i => {
    const c = i.category || 'Other';
    catMap[c] = (catMap[c] || 0) + 1;
  });
  const categoryData = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // ── Severity data ──────────────────────────────
  const sevMap: Record<string, number> = {};
  incidents.forEach(i => {
    const s = i.severity || 'low';
    sevMap[s] = (sevMap[s] || 0) + 1;
  });
  const severityData = ['critical','high','medium','low']
    .filter(k => sevMap[k] > 0)
    .map(name => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: sevMap[name], fill: SEVERITY_COLORS[name] }));

  // ── Status pie data ────────────────────────────
  const statusData = Object.entries(STATUS_COLORS)
    .map(([name, fill]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: incidents.filter(i => i.status === name).length,
      fill
    }))
    .filter(d => d.value > 0);

  // ── Last 7 days trend ─────────────────────────
  const trendData = (() => {
    const days: { date: string; total: number; resolved: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(); dt.setDate(dt.getDate() - d);
      const dateStr = dt.toISOString().split('T')[0];
      const label = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      days.push({
        date: label,
        total:    incidents.filter(i => i.created_at?.startsWith(dateStr)).length,
        resolved: incidents.filter(i => i.created_at?.startsWith(dateStr) && i.status === 'resolved').length,
      });
    }
    return days;
  })();

  // ── AI pipeline data ──────────────────────────
  const aiData = [
    { name: 'Processed', value: aiProcessed, fill: '#1A7A3E' },
    { name: 'In Queue',  value: incidents.filter(i => i.ai_processing_status === 'processing').length, fill: '#D97706' },
    { name: 'Failed',    value: incidents.filter(i => i.ai_processing_status === 'failed').length,     fill: '#B91C1C' },
    { name: 'Pending',   value: incidents.filter(i => !i.ai_processing_status || i.ai_processing_status === 'pending').length, fill: '#94A3B8' },
  ].filter(d => d.value > 0);

  const stats = [
    { label: 'Total',        value: total,           icon: BarChart3,    color: '#0055A4' },
    { label: 'Pending',      value: pending,          icon: Clock,        color: '#D97706' },
    { label: 'In Progress',  value: inProgress,       icon: Activity,     color: '#F47920' },
    { label: 'Resolved',     value: resolved,         icon: CheckCircle2, color: '#1A7A3E' },
    { label: 'AI Processed', value: aiProcessed,      icon: TrendingUp,   color: '#8b5cf6' },
    { label: 'Resolution %', value: `${resolutionRate}%`, icon: ArrowUpRight, color: '#0ea5e9' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <div className="cr-spinner cr-spinner-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="cr-page-title">Analytics Dashboard</h1>
        <p className="cr-page-subtitle">Real-time insights into civic incident management</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="cr-card !p-4 flex flex-col gap-2"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${s.color}18`, color: s.color }}>
              <s.icon size={16} />
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: 'var(--cr-text)' }}>{s.value}</p>
              <p className="text-[11px] text-[var(--cr-text-muted)] uppercase tracking-wide font-semibold">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Row 1: Status Pie + Severity Bar */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution — Pie */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="cr-card !p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} style={{ color: 'var(--cr-blue-mid)' }} />
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--cr-text)' }}>Status Distribution</h3>
          </div>
          {statusData.length === 0 ? (
            <p className="text-sm text-[var(--cr-text-muted)]">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                  {statusData.map((_, idx) => (
                    <Cell key={idx} fill={statusData[idx].fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12, color: 'var(--cr-text)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Severity — Horizontal Bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="cr-card !p-6">
          <div className="flex items-center gap-2 mb-5">
            <ArrowUpRight size={16} style={{ color: 'var(--cr-orange)' }} />
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--cr-text)' }}>Severity Breakdown</h3>
          </div>
          {severityData.length === 0 ? (
            <p className="text-sm text-[var(--cr-text-muted)]">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={severityData} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cr-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--cr-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--cr-text)' }} axisLine={false} tickLine={false} width={64} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24} name="Incidents">
                  {severityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Row 2: 7-Day Trend Area Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="cr-card !p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} style={{ color: 'var(--cr-blue-mid)' }} />
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--cr-text)' }}>7-Day Incident Trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0055A4" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#0055A4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1A7A3E" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#1A7A3E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cr-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--cr-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--cr-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={8}
              formatter={(v) => <span style={{ fontSize: 12, color: 'var(--cr-text)' }}>{v}</span>} />
            <Area type="monotone" dataKey="total"    name="Total"    stroke="#0055A4" fill="url(#totalGrad)"    strokeWidth={2} dot={{ r: 3 }} />
            <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#1A7A3E" fill="url(#resolvedGrad)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Row 3: Category Bar + AI Pipeline */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="cr-card !p-6">
          <div className="flex items-center gap-2 mb-5">
            <ArrowDownRight size={16} style={{ color: '#8b5cf6' }} />
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--cr-text)' }}>Category Distribution</h3>
          </div>
          {categoryData.length === 0 ? (
            <p className="text-sm text-[var(--cr-text-muted)]">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 4, right: 8, bottom: 40, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cr-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--cr-text-muted)' }}
                  angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--cr-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="value" name="Incidents" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* AI Pipeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="cr-card !p-6">
          <div className="flex items-center gap-2 mb-5">
            <Cpu size={16} style={{ color: '#8b5cf6' }} />
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--cr-text)' }}>AI Pipeline Performance</h3>
          </div>
          {aiData.length === 0 ? (
            <p className="text-sm text-[var(--cr-text-muted)]">No data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={aiData} cx="50%" cy="50%" outerRadius={70}
                    paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                    {aiData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 12, color: 'var(--cr-text)' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {aiData.map(d => (
                  <div key={d.name} className="cr-card-flat !p-3 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                    <div>
                      <p className="text-xl font-black" style={{ color: d.fill }}>{d.value}</p>
                      <p className="text-[10px] text-[var(--cr-text-muted)] uppercase tracking-wide font-semibold">{d.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
