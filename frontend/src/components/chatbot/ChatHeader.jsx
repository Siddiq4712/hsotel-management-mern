import React from 'react';
import { X, RotateCcw } from 'lucide-react';

export const ChatHeader = ({ onClose, onReset }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl border-b border-white/5 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo Avatar */}
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-xl select-none">
          🤖
        </div>
        
        {/* Information and Status */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide">Hostel Genie</h3>
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full select-none">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Online</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Your Smart Hostel Assistant</p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onReset}
          title="Reset Conversation"
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all cursor-pointer focus:outline-none"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={onClose}
          title="Close Chat"
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all cursor-pointer focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
