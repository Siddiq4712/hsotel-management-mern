import React from 'react';

/**
 * SummaryCard — renders a metric value card inside the chat bubble.
 * Used by all summary responses (attendance, complaints, leaves, etc.)
 */

const TYPE_CONFIG = {
  success: { bg: '#ecfdf5', border: '#bbf7d0', color: '#059669', dot: '#10b981' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', dot: '#f59e0b' },
  danger:  { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', dot: '#ef4444' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', dot: '#3b82f6' },
};

const ICON_MAP = {
  students:   '👨‍🎓',
  rooms:      '🛏',
  complaints: '📋',
  attendance: '📅',
  hostels:    '🏠',
  money:      '💰',
  food:       '🍽',
  stock:      '📦',
  emergencies:'⚠️',
};

const SummaryCard = ({ label, value, type = 'info', icon }) => {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const emoji = ICON_MAP[icon] || '📊';

  return (
    <div
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.color }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
    >
      <span className="text-base leading-none shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold leading-tight">{value ?? '—'}</p>
      </div>
      <span
        style={{ backgroundColor: cfg.dot }}
        className="w-2 h-2 rounded-full shrink-0 opacity-70"
      />
    </div>
  );
};

/**
 * Renders a grid of SummaryCards.
 */
export const SummaryCardGrid = ({ cards }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {cards.map((card, i) => (
        <SummaryCard
          key={i}
          label={card.label}
          value={card.value}
          type={card.type}
          icon={card.icon}
        />
      ))}
    </div>
  );
};

export default SummaryCard;
