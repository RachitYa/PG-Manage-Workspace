import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#f1f5f9', white: '#ffffff', primary: '#0891b2', primaryDark: '#0e7490',
  text: '#0f172a', muted: '#64748b', border: '#e2e8f0',
  success: '#059669', warn: '#d97706', danger: '#e11d48',
  indigo: '#4f46e5', violet: '#7c3aed', rose: '#e11d48',
  amber: '#f59e0b', emerald: '#10b981', sky: '#0ea5e9',
};
const CHART_COLORS = ['#0891b2','#7c3aed','#10b981','#f59e0b','#e11d48','#0ea5e9','#6366f1'];

// ─── DATA ─────────────────────────────────────────────────────────────────────

// Finance
const FINANCE_MONTHLY = [
  { month: 'Jan', revenue: 185000, expenses: 72000, pending: 12000 },
  { month: 'Feb', revenue: 192000, expenses: 68000, pending: 8000 },
  { month: 'Mar', revenue: 178000, expenses: 75000, pending: 15000 },
  { month: 'Apr', revenue: 205000, expenses: 80000, pending: 6000 },
  { month: 'May', revenue: 215000, expenses: 78000, pending: 9000 },
  { month: 'Jun', revenue: 198000, expenses: 82000, pending: 11000 },
  { month: 'Jul', revenue: 220000, expenses: 79000, pending: 7000 },
];
const FINANCE_WEEKLY = [
  { month: 'W1', revenue: 48000, expenses: 18000, pending: 3000 },
  { month: 'W2', revenue: 55000, expenses: 20000, pending: 2000 },
  { month: 'W3', revenue: 52000, expenses: 19000, pending: 4000 },
  { month: 'W4', revenue: 58000, expenses: 22000, pending: 1500 },
];
const FINANCE_DAILY = [
  { month: 'Mon', revenue: 8200, expenses: 2800, pending: 400 },
  { month: 'Tue', revenue: 7500, expenses: 3100, pending: 0 },
  { month: 'Wed', revenue: 9100, expenses: 2500, pending: 800 },
  { month: 'Thu', revenue: 6800, expenses: 2200, pending: 0 },
  { month: 'Fri', revenue: 11200, expenses: 3500, pending: 1200 },
  { month: 'Sat', revenue: 5400, expenses: 1800, pending: 0 },
  { month: 'Sun', revenue: 4200, expenses: 1200, pending: 0 },
];
const INCOME_BREAKDOWN = [
  { name: 'Rent', value: 158000 }, { name: 'Food', value: 32000 },
  { name: 'Transport', value: 8000 }, { name: 'Laundry', value: 4000 }, { name: 'Misc', value: 3500 },
];
const PAYMENT_MODES = [
  { name: 'UPI', value: 62 }, { name: 'Cash', value: 24 }, { name: 'Bank', value: 14 },
];
const PENDING_DUES = [
  { name: 'Rahul Verma', room: '204', amount: 4500, days: 12 },
  { name: 'Anjali Nair', room: '108', amount: 3200, days: 8 },
  { name: 'Saurabh Tiwari', room: '312', amount: 6800, days: 21 },
  { name: 'Pooja Gupta', room: '101', amount: 2100, days: 5 },
  { name: 'Karthik R.', room: '215', amount: 5500, days: 17 },
];

// Occupancy
const OCCUPANCY_TREND = [
  { w: 'W1', rate: 82 }, { w: 'W2', rate: 85 }, { w: 'W3', rate: 88 },
  { w: 'W4', rate: 87 }, { w: 'W5', rate: 91 }, { w: 'W6', rate: 89 },
  { w: 'W7', rate: 93 }, { w: 'W8', rate: 91 },
];
const FLOOR_OCCUPANCY = [
  { floor: 'Floor 1', occupied: 10, total: 12 },
  { floor: 'Floor 2', occupied: 9, total: 12 },
  { floor: 'Floor 3', occupied: 11, total: 12 },
];
const ROOM_TYPES = [
  { name: 'Single', value: 12 }, { name: 'Double', value: 16 }, { name: 'Triple', value: 8 },
];
const JOININGS_VS_CHECKOUTS = [
  { month: 'Feb', joinings: 4, checkouts: 2 },
  { month: 'Mar', joinings: 3, checkouts: 4 },
  { month: 'Apr', joinings: 6, checkouts: 2 },
  { month: 'May', joinings: 5, checkouts: 3 },
  { month: 'Jun', joinings: 4, checkouts: 5 },
  { month: 'Jul', joinings: 7, checkouts: 2 },
];
const VACANT_ROOMS = [
  { room: '107', floor: 'F1', vacantDays: 34 },
  { room: '209', floor: 'F2', vacantDays: 21 },
  { room: '305', floor: 'F3', vacantDays: 14 },
];

// Students
const STUDENT_TYPES = [
  { name: 'Active', value: 28 }, { name: 'Notice Period', value: 4 }, { name: 'Upcoming', value: 3 },
];
const STAY_DURATION = [
  { range: '0–3 mo', count: 8 }, { range: '3–6 mo', count: 11 },
  { range: '6–12 mo', count: 9 }, { range: '12+ mo', count: 7 },
];
const TOP_PAYERS = [
  { name: 'Aarav Shah', room: '102', streak: 18 },
  { name: 'Priya R.', room: '204', streak: 16 },
  { name: 'Mohit J.', room: '311', streak: 14 },
  { name: 'Sonal T.', room: '108', streak: 12 },
];
const CITIES = [
  { city: 'Delhi', count: 8 }, { city: 'Lucknow', count: 6 },
  { city: 'Kanpur', count: 5 }, { city: 'Jaipur', count: 4 },
  { city: 'Agra', count: 3 }, { city: 'Patna', count: 3 },
  { city: 'Meerut', count: 2 }, { city: 'Varanasi', count: 2 },
  { city: 'Allahabad', count: 2 }, { city: 'Others', count: 5 },
];
const PLANS = [
  { name: 'Monthly', value: 18 }, { name: 'Quarterly', value: 9 },
  { name: 'Half-Yearly', value: 5 }, { name: 'Yearly', value: 3 },
];

// Staff
const STAFF_ATTENDANCE = [
  { name: 'Priya M.', rate: 96 }, { name: 'Vikram S.', rate: 92 },
  { name: 'Ramesh Y.', rate: 98 }, { name: 'Mohan D.', rate: 88 },
  { name: 'Suresh K.', rate: 90 }, { name: 'Dinesh P.', rate: 94 },
];
const ROLE_DIST = [
  { name: 'HR', value: 1 }, { name: 'Manager', value: 1 }, { name: 'Sales', value: 1 },
  { name: 'Cook', value: 2 }, { name: 'Cleaner', value: 2 }, { name: 'Helper', value: 1 },
  { name: 'Plumber', value: 1 }, { name: 'Electrician', value: 1 }, { name: 'Carpenter', value: 1 },
];
const SALARY_DATA = [
  { month: 'Apr', paid: 135000, pending: 0 },
  { month: 'May', paid: 135000, pending: 0 },
  { month: 'Jun', paid: 128000, pending: 7000 },
  { month: 'Jul', paid: 110000, pending: 25000 },
];
const LEAVE_DATA = [
  { name: 'Mohan D.', leaves: 5 }, { name: 'Suresh K.', leaves: 4 },
  { name: 'Vikram S.', leaves: 3 }, { name: 'Priya M.', leaves: 2 },
  { name: 'Ramesh Y.', leaves: 1 },
];

// Food
const MEAL_TREND = [
  { day: 'Mon', breakfast: 38, lunch: 44, dinner: 41 },
  { day: 'Tue', breakfast: 35, lunch: 43, dinner: 40 },
  { day: 'Wed', breakfast: 40, lunch: 46, dinner: 38 },
  { day: 'Thu', breakfast: 37, lunch: 45, dinner: 42 },
  { day: 'Fri', breakfast: 42, lunch: 47, dinner: 44 },
  { day: 'Sat', breakfast: 30, lunch: 38, dinner: 36 },
  { day: 'Sun', breakfast: 28, lunch: 35, dinner: 33 },
];
const TOP_DISHES = [
  { dish: 'Dal Tadka & Rice', rating: 4.8, count: 38 },
  { dish: 'Poha + Chai', rating: 4.6, count: 42 },
  { dish: 'Rajma Chawal', rating: 4.5, count: 35 },
  { dish: 'Chole Bhature', rating: 4.4, count: 29 },
  { dish: 'Upma + Coffee', rating: 4.2, count: 30 },
];
const LOW_DISHES = [
  { dish: 'Bitter Gourd Sabzi', rating: 2.1, count: 12 },
  { dish: 'Lauki Dal', rating: 2.4, count: 18 },
  { dish: 'Methi Roti', rating: 2.6, count: 22 },
  { dish: 'Karela Fry', rating: 2.8, count: 10 },
];
const COOK_PERF = [
  { name: 'Ramesh Y.', rating: 4.5 }, { name: 'Sunita D.', rating: 3.9 },
];
const TIFFIN_DATA = [
  { day: 'Mon', req: 12, taken: 10 }, { day: 'Tue', req: 10, taken: 9 },
  { day: 'Wed', req: 14, taken: 12 }, { day: 'Thu', req: 11, taken: 11 },
  { day: 'Fri', req: 13, taken: 10 }, { day: 'Sat', req: 8, taken: 7 },
  { day: 'Sun', req: 6, taken: 5 },
];

// Services
const TICKET_CATEGORIES = [
  { name: 'Plumbing', value: 14 }, { name: 'Electrical', value: 11 },
  { name: 'Carpentry', value: 6 }, { name: 'Cleaning', value: 9 },
];
const RESOLUTION_TIME = [
  { cat: 'Plumbing', hours: 6.2 }, { cat: 'Electrical', hours: 4.8 },
  { cat: 'Carpentry', hours: 12.1 }, { cat: 'Cleaning', hours: 2.4 },
];
const TICKET_TREND = [
  { w: 'W1', tickets: 8 }, { w: 'W2', tickets: 12 }, { w: 'W3', tickets: 7 },
  { w: 'W4', tickets: 10 }, { w: 'W5', tickets: 6 }, { w: 'W6', tickets: 9 },
];
const MOST_COMPLAINTS = [
  { room: '104', count: 6, issues: 'Plumbing, Cleaning' },
  { room: '202', count: 5, issues: 'Electrical' },
  { room: '301', count: 4, issues: 'Carpentry, Plumbing' },
  { room: '108', count: 3, issues: 'Cleaning' },
];
const CLEANER_PERF = [
  { name: 'Mohan D.', cleaned: 120, rejected: 8 },
  { name: 'Lakshmi B.', cleaned: 105, rejected: 5 },
];

// Enquiries
const ENQUIRY_WEEKLY = [
  { w: 'W1', enquiries: 14, converted: 5 },
  { w: 'W2', enquiries: 18, converted: 8 },
  { w: 'W3', enquiries: 12, converted: 4 },
  { w: 'W4', enquiries: 20, converted: 9 },
  { w: 'W5', enquiries: 16, converted: 7 },
  { w: 'W6', enquiries: 22, converted: 11 },
];
const LEAD_SOURCES = [
  { name: 'NoBroker', value: 32 }, { name: 'MagicBricks', value: 24 },
  { name: 'Walk-in', value: 18 }, { name: 'Referral', value: 14 },
  { name: 'Social Media', value: 12 },
];
const ENQUIRY_CITIES = [
  { city: 'Delhi', count: 24 }, { city: 'Jaipur', count: 18 }, { city: 'Lucknow', count: 15 },
  { city: 'Kanpur', count: 12 }, { city: 'Agra', count: 9 },
];
const DROP_REASONS = [
  { reason: 'Price too high', count: 12 },
  { reason: 'Location not suitable', count: 9 },
  { reason: 'No single room', count: 7 },
  { reason: 'Not responding', count: 5 },
  { reason: 'Joined elsewhere', count: 4 },
];
const BEST_DAY = [
  { day: 'Mon', count: 8 }, { day: 'Tue', count: 12 }, { day: 'Wed', count: 10 },
  { day: 'Thu', count: 14 }, { day: 'Fri', count: 18 }, { day: 'Sat', count: 16 }, { day: 'Sun', count: 6 },
];

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function TopBar({ title, subtitle, onBack }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#0c1a2e,#0f2847)', padding: '0 20px 20px', position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function TimeFilter({ value, onChange }) {
  const opts = ['Day', 'Week', 'Month'];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      {opts.map(o => (
        <button key={o} onClick={() => onChange(o)}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
            background: value === o ? C.primary : C.white, color: value === o ? '#fff' : C.muted,
            boxShadow: value === o ? '0 4px 12px rgba(8,145,178,0.3)' : 'none', transition: 'all 0.2s' }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, color = C.primary, icon }) {
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: '16px 14px', flex: 1, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${C.border}` }}>
      {icon && <span className="material-symbols-outlined" style={{ fontSize: 22, color, display: 'block', marginBottom: 4 }}>{icon}</span>}
      <p style={{ fontSize: 22, fontWeight: 900, color, margin: '0 0 2px', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', fontStyle: 'italic' }}>{sub}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>{title}</p>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  );
}

function ProgressBar({ pct, color = C.primary, label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.8s' }} />
      </div>
    </div>
  );
}

function RankedList({ items, keyField, valueField, valueLabel = '', color = C.primary, maxValue }) {
  const max = maxValue || Math.max(...items.map(i => i[valueField]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : C.muted, minWidth: 20, textAlign: 'right' }}>
            #{idx + 1}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item[keyField]}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{item[valueField]}{valueLabel}</span>
            </div>
            <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(item[valueField] / max) * 100}%`, background: color, borderRadius: 3, transition: 'width 0.8s' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const CUSTOM_TOOLTIP_STYLE = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, fontFamily: 'inherit' };

// ─── TAB SCREENS ─────────────────────────────────────────────────────────────

function FinanceTab({ onBack }) {
  const [tf, setTf] = useState('Month');
  const data = tf === 'Month' ? FINANCE_MONTHLY : tf === 'Week' ? FINANCE_WEEKLY : FINANCE_DAILY;
  const totalRev = data.reduce((a, b) => a + b.revenue, 0);
  const totalExp = data.reduce((a, b) => a + b.expenses, 0);
  const totalPending = PENDING_DUES.reduce((a, b) => a + b.amount, 0);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title="Finance" subtitle="Revenue, expenses & dues" onBack={onBack} />
      <div style={{ padding: '20px 16px 0' }}>
        <TimeFilter value={tf} onChange={setTf} />

        <Section title="Key Metrics">
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiCard label="Revenue" value={`₹${(totalRev / 1000).toFixed(0)}k`} color={C.success} icon="trending_up" />
            <KpiCard label="Expenses" value={`₹${(totalExp / 1000).toFixed(0)}k`} color={C.warn} icon="trending_down" />
            <KpiCard label="Pending" value={`₹${(totalPending / 1000).toFixed(0)}k`} color={C.danger} icon="schedule" />
          </div>
        </Section>

        <Section title="Revenue vs Expenses">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill={C.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill={C.warn} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Income Breakdown">
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={INCOME_BREAKDOWN} cx="50%" cy="50%" innerRadius={50} outerRadius={74} dataKey="value" paddingAngle={3}>
                  {INCOME_BREAKDOWN.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {INCOME_BREAKDOWN.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>₹{(d.value / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Payment Mode Split">
          <Card>
            {PAYMENT_MODES.map((p, i) => (
              <ProgressBar key={p.name} label={p.name} value={`${p.value}%`} pct={p.value} color={CHART_COLORS[i]} />
            ))}
          </Card>
        </Section>

        <Section title="Revenue Trend">
          <Card>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" stroke={C.primary} fill="url(#revGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Outstanding Dues">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PENDING_DUES.map((d, i) => (
              <Card key={i} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{d.name}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Room {d.room} · {d.days} days overdue</p>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.danger }}>₹{d.amount.toLocaleString()}</span>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function OccupancyTab({ onBack }) {
  const [tf, setTf] = useState('Month');
  const totalRooms = 36, occupied = 30;
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title="Occupancy" subtitle="Rooms, beds & vacancy" onBack={onBack} />
      <div style={{ padding: '20px 16px 0' }}>
        <TimeFilter value={tf} onChange={setTf} />

        <Section title="Key Metrics">
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiCard label="Occupancy" value={`${Math.round((occupied/totalRooms)*100)}%`} color={C.success} icon="domain" />
            <KpiCard label="Occupied" value={occupied} color={C.primary} icon="bed" />
            <KpiCard label="Vacant" value={totalRooms - occupied} color={C.warn} icon="do_not_disturb" />
          </div>
        </Section>

        <Section title="Occupancy Trend">
          <Card>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={OCCUPANCY_TREND} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="w" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={v => `${v}%`} />
                <Area type="monotone" dataKey="rate" stroke={C.success} fill="url(#occGrad)" strokeWidth={2.5} name="Occupancy %" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Floor-wise Occupancy">
          <Card>
            {FLOOR_OCCUPANCY.map(f => (
              <ProgressBar key={f.floor} label={f.floor} value={`${f.occupied}/${f.total}`} pct={(f.occupied / f.total) * 100} color={C.primary} />
            ))}
          </Card>
        </Section>

        <Section title="Room Type Distribution">
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={ROOM_TYPES} cx="50%" cy="50%" innerRadius={50} outerRadius={74} dataKey="value" paddingAngle={3}>
                  {ROOM_TYPES.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROOM_TYPES.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i] }} />
                  <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{d.value} rooms</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Joinings vs Checkouts">
          <Card>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={JOININGS_VS_CHECKOUTS} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="joinings" name="Joinings" fill={C.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="checkouts" name="Checkouts" fill={C.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Longest Vacant Rooms">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {VACANT_ROOMS.map((r, i) => (
              <Card key={i} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>Room {r.room}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{r.floor}</p>
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: C.danger }}>{r.vacantDays} days</span>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function StudentsTab({ onBack }) {
  const [tf, setTf] = useState('Month');
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title="Students" subtitle="Profiles, payments & trends" onBack={onBack} />
      <div style={{ padding: '20px 16px 0' }}>
        <TimeFilter value={tf} onChange={setTf} />

        <Section title="Key Metrics">
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiCard label="Total" value="35" color={C.primary} icon="people" />
            <KpiCard label="Active" value="28" color={C.success} icon="person" />
            <KpiCard label="Notice" value="4" color={C.warn} icon="notification_important" />
          </div>
        </Section>

        <Section title="Student Status Breakdown">
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={STUDENT_TYPES} cx="50%" cy="50%" innerRadius={50} outerRadius={74} dataKey="value" paddingAngle={3}>
                  {STUDENT_TYPES.map((_, i) => <Cell key={i} fill={[C.success, C.warn, C.primary][i]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STUDENT_TYPES.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: [C.success, C.warn, C.primary][i] }} />
                  <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Stay Duration Distribution">
          <Card>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={STAY_DURATION} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Students" fill={C.primary} radius={[4, 4, 0, 0]}>
                  {STAY_DURATION.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Top On-time Payers 🏆">
          <Card>
            {TOP_PAYERS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < TOP_PAYERS.length - 1 ? 12 : 0 }}>
                <span style={{ fontSize: 18, minWidth: 28 }}>{['🥇','🥈','🥉','🎖️'][i]}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 1px' }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Room {s.room}</p>
                </div>
                <span style={{ fontWeight: 800, fontSize: 14, color: C.success }}>{s.streak} months</span>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Students by City">
          <Card>
            <RankedList items={CITIES} keyField="city" valueField="count" valueLabel=" students" color={C.indigo} />
          </Card>
        </Section>

        <Section title="Plan Popularity">
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={PLANS} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {PLANS.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PLANS.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: CHART_COLORS[i] }} />
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{p.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function StaffTab({ onBack }) {
  const [tf, setTf] = useState('Month');
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title="Staff" subtitle="Attendance, salary & performance" onBack={onBack} />
      <div style={{ padding: '20px 16px 0' }}>
        <TimeFilter value={tf} onChange={setTf} />

        <Section title="Key Metrics">
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiCard label="Total Staff" value="11" color={C.primary} icon="badge" />
            <KpiCard label="Present" value="9" color={C.success} icon="check_circle" />
            <KpiCard label="On Leave" value="2" color={C.warn} icon="beach_access" />
          </div>
        </Section>

        <Section title="Attendance Rate by Staff">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={STAFF_ATTENDANCE} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.muted }} width={70} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={v => `${v}%`} />
                <Bar dataKey="rate" name="Attendance %" fill={C.primary} radius={[0, 4, 4, 0]}>
                  {STAFF_ATTENDANCE.map((s, i) => <Cell key={i} fill={s.rate >= 95 ? C.success : s.rate >= 90 ? C.primary : C.warn} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Role Distribution">
          <Card>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ROLE_DIST} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {ROLE_DIST.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Salary Payout">
          <Card>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SALARY_DATA} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="paid" name="Paid" fill={C.success} radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="pending" name="Pending" fill={C.danger} radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Leave Frequency">
          <Card>
            <RankedList items={LEAVE_DATA} keyField="name" valueField="leaves" valueLabel=" leaves" color={C.warn} />
          </Card>
        </Section>
      </div>
    </div>
  );
}

function FoodTab({ onBack }) {
  const [tf, setTf] = useState('Week');
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title="Food & Dining" subtitle="Meals, ratings & cook performance" onBack={onBack} />
      <div style={{ padding: '20px 16px 0' }}>
        <TimeFilter value={tf} onChange={setTf} />

        <Section title="Key Metrics">
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiCard label="Avg Breakfast" value="37" sub="per day" color={C.amber} icon="coffee" />
            <KpiCard label="Avg Lunch" value="44" sub="per day" color={C.success} icon="restaurant" />
            <KpiCard label="Avg Dinner" value="39" sub="per day" color={C.indigo} icon="dinner_dining" />
          </div>
        </Section>

        <Section title="Meal Participation Trend">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={MEAL_TREND} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="breakfast" stroke={C.amber} strokeWidth={2} dot={{ r: 3 }} name="Breakfast" />
                <Line type="monotone" dataKey="lunch" stroke={C.success} strokeWidth={2} dot={{ r: 3 }} name="Lunch" />
                <Line type="monotone" dataKey="dinner" stroke={C.indigo} strokeWidth={2} dot={{ r: 3 }} name="Dinner" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="🌟 Top Rated Dishes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TOP_DISHES.map((d, i) => (
              <Card key={i} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{d.dish}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{d.count} votes</p>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.success }}>⭐ {d.rating}</span>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="🔴 Lowest Rated Dishes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {LOW_DISHES.map((d, i) => (
              <Card key={i} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{d.dish}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{d.count} votes</p>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.danger }}>⭐ {d.rating}</span>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Cook Performance">
          <Card>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={COOK_PERF} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.muted }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="rating" name="Avg Rating" fill={C.amber} radius={[4, 4, 0, 0]}>
                  {COOK_PERF.map((c, i) => <Cell key={i} fill={c.rating >= 4.3 ? C.success : C.warn} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Tiffin: Requested vs Taken">
          <Card>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={TIFFIN_DATA} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="req" name="Requested" fill={C.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="taken" name="Taken" fill={C.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function ServicesTab({ onBack }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title="Services & Tickets" subtitle="Maintenance & cleaning ops" onBack={onBack} />
      <div style={{ padding: '20px 16px 0' }}>

        <Section title="Key Metrics">
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiCard label="Open" value="7" color={C.danger} icon="warning" />
            <KpiCard label="In Progress" value="5" color={C.warn} icon="pending" />
            <KpiCard label="Resolved" value="28" color={C.success} icon="check_circle" />
          </div>
        </Section>

        <Section title="Tickets by Category">
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={TICKET_CATEGORIES} cx="50%" cy="50%" innerRadius={46} outerRadius={68} dataKey="value" paddingAngle={3}>
                  {TICKET_CATEGORIES.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TICKET_CATEGORIES.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: CHART_COLORS[i] }} />
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Avg Resolution Time (hrs)">
          <Card>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={RESOLUTION_TIME} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `${v}h`} />
                <YAxis type="category" dataKey="cat" tick={{ fontSize: 11, fill: C.muted }} width={70} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={v => `${v} hrs`} />
                <Bar dataKey="hours" name="Avg Hours" fill={C.primary} radius={[0, 4, 4, 0]}>
                  {RESOLUTION_TIME.map((r, i) => <Cell key={i} fill={r.hours <= 5 ? C.success : r.hours <= 8 ? C.warn : C.danger} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Weekly Ticket Volume">
          <Card>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={TICKET_TREND} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tickGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.danger} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="w" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="tickets" stroke={C.danger} fill="url(#tickGrad)" strokeWidth={2.5} name="Tickets" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Most Complained Rooms">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOST_COMPLAINTS.map((r, i) => (
              <Card key={i} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>Room {r.room}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{r.issues}</p>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.danger }}>{r.count} tickets</span>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Cleaner Performance">
          <Card>
            {CLEANER_PERF.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < CLEANER_PERF.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{c.name}</p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: C.success, margin: 0 }}>{c.cleaned}</p>
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Cleaned</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: C.danger, margin: 0 }}>{c.rejected}</p>
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Rejected</p>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </Section>
      </div>
    </div>
  );
}

function EnquiriesTab({ onBack }) {
  const totalEnq = ENQUIRY_WEEKLY.reduce((a, b) => a + b.enquiries, 0);
  const totalConv = ENQUIRY_WEEKLY.reduce((a, b) => a + b.converted, 0);
  const convRate = Math.round((totalConv / totalEnq) * 100);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title="Enquiries" subtitle="Leads, sources & conversions" onBack={onBack} />
      <div style={{ padding: '20px 16px 0' }}>

        <Section title="Key Metrics">
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiCard label="Total Leads" value={totalEnq} color={C.primary} icon="contacts" />
            <KpiCard label="Converted" value={totalConv} color={C.success} icon="how_to_reg" />
            <KpiCard label="Conv. Rate" value={`${convRate}%`} color={C.indigo} icon="trending_up" />
          </div>
        </Section>

        <Section title="Enquiries vs Conversions">
          <Card>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={ENQUIRY_WEEKLY} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="w" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="enquiries" name="Enquiries" fill={C.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill={C.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Lead Sources">
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={LEAD_SOURCES} cx="50%" cy="50%" innerRadius={46} outerRadius={68} dataKey="value" paddingAngle={3}>
                  {LEAD_SOURCES.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LEAD_SOURCES.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: CHART_COLORS[i] }} />
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Top Cities by Enquiries">
          <Card>
            <RankedList items={ENQUIRY_CITIES} keyField="city" valueField="count" valueLabel=" leads" color={C.sky} />
          </Card>
        </Section>

        <Section title="Best Days for Enquiries">
          <Card>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={BEST_DAY} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Enquiries" radius={[4, 4, 0, 0]}>
                  {BEST_DAY.map((d, i) => <Cell key={i} fill={d.count >= 16 ? C.success : d.count >= 10 ? C.primary : C.muted} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Top Drop-off Reasons">
          <Card>
            <RankedList items={DROP_REASONS} keyField="reason" valueField="count" valueLabel=" cases" color={C.danger} />
          </Card>
        </Section>
      </div>
    </div>
  );
}

// ─── MENU CATEGORIES ──────────────────────────────────────────────────────────

const ANALYTICS_MENU = [
  {
    key: 'finance',
    label: 'Finance',
    subtitle: 'Revenue, expenses & dues',
    icon: 'account_balance_wallet',
    gradient: 'linear-gradient(135deg, #059669, #047857)',
    kpis: ['₹2.2L Revenue', '₹78k Expenses', '₹21k Pending'],
  },
  {
    key: 'occupancy',
    label: 'Occupancy',
    subtitle: 'Rooms, beds & vacancy',
    icon: 'domain',
    gradient: 'linear-gradient(135deg, #0891b2, #0e7490)',
    kpis: ['83% Occupancy', '30 Occupied', '6 Vacant'],
  },
  {
    key: 'students',
    label: 'Students',
    subtitle: 'Profiles, payments & trends',
    icon: 'people',
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    kpis: ['35 Total', '28 Active', '4 Notice'],
  },
  {
    key: 'staff',
    label: 'Staff',
    subtitle: 'Attendance, salary & performance',
    icon: 'badge',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    kpis: ['11 Staff', '93% Avg Attendance', '₹1.1L Paid'],
  },
  {
    key: 'food',
    label: 'Food & Dining',
    subtitle: 'Meals, ratings & cook performance',
    icon: 'restaurant',
    gradient: 'linear-gradient(135deg, #e11d48, #be185d)',
    kpis: ['44 Avg Lunch', '⭐ 4.8 Top Dish', '2 Cooks'],
  },
  {
    key: 'services',
    label: 'Services & Tickets',
    subtitle: 'Maintenance & cleaning ops',
    icon: 'build',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    kpis: ['7 Open', '5 In Progress', '28 Resolved'],
  },
  {
    key: 'enquiries',
    label: 'Enquiries',
    subtitle: 'Leads, sources & conversions',
    icon: 'contacts',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    kpis: ['102 Leads', '44 Converted', '43% Conv. Rate'],
  },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Reports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);

  if (activeTab === 'finance')   return <FinanceTab    onBack={() => setActiveTab(null)} />;
  if (activeTab === 'occupancy') return <OccupancyTab  onBack={() => setActiveTab(null)} />;
  if (activeTab === 'students')  return <StudentsTab   onBack={() => setActiveTab(null)} />;
  if (activeTab === 'staff')     return <StaffTab      onBack={() => setActiveTab(null)} />;
  if (activeTab === 'food')      return <FoodTab       onBack={() => setActiveTab(null)} />;
  if (activeTab === 'services')  return <ServicesTab   onBack={() => setActiveTab(null)} />;
  if (activeTab === 'enquiries') return <EnquiriesTab  onBack={() => setActiveTab(null)} />;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0c1a2e,#0f2847)', padding: '0 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0 }}>Reports & Analytics</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>7 analytics sections</p>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: 24 }}>bar_chart</span>
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'white', margin: 0 }}>₹2.2L</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>This month revenue</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#34d399', margin: 0 }}>83%</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Occupancy rate</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#fbbf24', margin: 0 }}>43%</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Enquiry conversion</p>
          </div>
        </div>
      </div>

      {/* Vertical Menu */}
      <div style={{ padding: '20px 16px 0' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Analytics Sections</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ANALYTICS_MENU.map(item => (
            <div key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{ background: C.white, borderRadius: 18, overflow: 'hidden', boxShadow: '0 3px 12px rgba(0,0,0,0.07)', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.07)'; }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.07)'; }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(0.99)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.07)'; }}>

              {/* Gradient accent strip */}
              <div style={{ height: 4, background: item.gradient }} />

              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: item.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'white' }}>{item.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 2px' }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{item.subtitle}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: C.border, fontSize: 22 }}>chevron_right</span>
                </div>

                {/* KPI chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {item.kpis.map((kpi, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: C.bg, borderRadius: 8, padding: '3px 8px', border: `1px solid ${C.border}` }}>
                      {kpi}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
