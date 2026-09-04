import React from 'react';

export const SuggestionChips = ({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-slate-50/80 border-t border-slate-100 shrink-0">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full border border-indigo-100 transition-all cursor-pointer hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};
export default SuggestionChips;
