import React from 'react';

export const TypingIndicator = () => {
  return (
    <div className="flex items-start gap-2 max-w-[85%] my-2 animate-pulse">
      {/* Bot Avatar Icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-50 to-blue-50 border border-indigo-100/50 shadow-sm text-sm shrink-0">
        🤖
      </div>
      
      {/* Typing Bubble */}
      <div className="flex flex-col bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm">
        <div className="flex items-center gap-1.5 py-1">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>
  );
};
export default TypingIndicator;
