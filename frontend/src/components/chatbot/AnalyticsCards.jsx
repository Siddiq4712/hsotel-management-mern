import React from 'react';
import { Users, Home, AlertCircle, Calendar, ShieldAlert, Bed, Utensils, Box, DollarSign } from 'lucide-react';

const ICON_MAP = {
  students: Users,
  hostels: Home,
  complaints: AlertCircle,
  attendance: Calendar,
  emergencies: ShieldAlert,
  rooms: Bed,
  food: Utensils,
  stock: Box,
  money: DollarSign
};

export const AnalyticsCards = ({ cards }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 mt-3 w-full shrink-0">
      {cards.map((card, idx) => {
        // Determine theme colors based on card.type
        let themeClasses = 'bg-indigo-50/70 border-indigo-100 text-indigo-700';
        if (card.type === 'success') {
          themeClasses = 'bg-emerald-50/70 border-emerald-100 text-emerald-700';
        } else if (card.type === 'warning') {
          themeClasses = 'bg-amber-50/70 border-amber-100 text-amber-700';
        } else if (card.type === 'danger') {
          themeClasses = 'bg-rose-50/70 border-rose-100 text-rose-700';
        }

        const IconComponent = ICON_MAP[card.icon] || Home;

        return (
          <div
            key={idx}
            className={`flex flex-col p-2.5 border rounded-xl shadow-sm hover:shadow transition-all ${themeClasses}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 truncate pr-1">
                {card.label}
              </span>
              <IconComponent size={13} className="opacity-75 shrink-0" />
            </div>
            <span className="text-base font-extrabold tracking-tight">
              {card.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default AnalyticsCards;
