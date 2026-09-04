import React from 'react';
import { useNavigate } from 'react-router-dom';

const HIGHLIGHT_METRICS = [
  { key: 'totalStudents',    label: 'Total Students',     icon: '👨‍🎓', color: '#6366f1', bg: '#eef2ff', path: '/students' },
  { key: 'present',          label: 'Present',            icon: '✅',   color: '#10b981', bg: '#ecfdf5', path: '/attendance' },
  { key: 'absent',           label: 'Absent',             icon: '❌',   color: '#ef4444', bg: '#fef2f2', path: '/attendance' },
  { key: 'outpassStudents',  label: 'Outside',            icon: '🏃',   color: '#f59e0b', bg: '#fffbeb', path: '/outpass-approval' },
  { key: 'pendingLeaves',    label: 'Pending Leaves',     icon: '📄',   color: '#8b5cf6', bg: '#f5f3ff', path: '/leave-requests' },
  { key: 'pendingGatePasses',label: 'Pending Gate Passes',icon: '🚪',   color: '#0ea5e9', bg: '#f0f9ff', path: '/outpass-approval' },
  { key: 'pendingComplaints',label: 'Complaints',         icon: '📋',   color: '#f43f5e', bg: '#fff1f2', path: '/complaints' },
  { key: 'urgentComplaints', label: 'Urgent',             icon: '⚠️',   color: '#dc2626', bg: '#fef2f2', path: '/complaints' },
  { key: 'activeSuspensions',label: 'Suspensions',        icon: '🚫',   color: '#dc2626', bg: '#fef2f2', path: '/suspensions' },
  { key: 'todayHolidays',    label: "Today's Holidays",   icon: '🎉',   color: '#d97706', bg: '#fefce8', path: '/holidays' },
  { key: 'pendingRebates',   label: 'Mess Rebates',       icon: '🍽',   color: '#7c3aed', bg: '#f5f3ff', path: '/rebate' },
];

const MetricCard = ({ metric, value, onNavigate }) => {
  const isAlert = value > 0 && ['absent', 'pendingComplaints', 'urgentComplaints', 'activeSuspensions'].includes(metric.key);

  return (
    <div
      onClick={() => onNavigate(metric.path)}
      style={{ backgroundColor: metric.bg, borderColor: metric.color + '30' }}
      className="flex flex-col items-start gap-1 p-3 rounded-2xl border cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-md relative overflow-hidden"
    >
      {isAlert && value > 0 && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <span className="text-xl leading-none">{metric.icon}</span>
      <span
        style={{ color: metric.color }}
        className="text-2xl font-bold leading-tight tracking-tight"
      >
        {value ?? '—'}
      </span>
      <span className="text-[10px] font-semibold text-slate-500 leading-tight">{metric.label}</span>
    </div>
  );
};

const TodayHighlightsCard = ({ data }) => {
  const navigate = useNavigate();

  if (!data) return null;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-indigo-100 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">📅</span>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Today's Highlights</p>
          <p className="text-indigo-200 text-[10px]">{today}</p>
        </div>
      </div>

      {/* Divider line */}
      <div className="h-px bg-indigo-50" />

      {/* Metric Grid */}
      <div className="bg-white p-3 grid grid-cols-3 gap-2">
        {HIGHLIGHT_METRICS.map(metric => (
          <MetricCard
            key={metric.key}
            metric={metric}
            value={data[metric.key] ?? 0}
            onNavigate={navigate}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-3 py-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">Click any card to view details</span>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Full Dashboard →
        </button>
      </div>
    </div>
  );
};

export default TodayHighlightsCard;
