import React from 'react';
import { getQuickActionsForRole } from '../../config/intents';
import { useAuth } from '../../context/AuthContext';

export const QuickActions = ({ onSelect }) => {
  const { user } = useAuth();
  const actions = getQuickActionsForRole(user?.role || 'student');

  if (actions.length === 0) return null;

  return (
    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl my-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
        ⚡ Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onSelect(action.text)}
            className="flex items-center justify-between p-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 border border-slate-100 hover:border-indigo-200 rounded-xl transition-all text-left shadow-sm hover:shadow-md cursor-pointer group"
          >
            <span className="font-semibold text-slate-600 group-hover:text-indigo-700 transition-colors">
              {action.label}
            </span>
            <span className="text-[10px] text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-0.5 transition-all">
              ➔
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
export default QuickActions;
