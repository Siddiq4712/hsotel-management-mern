import React, { useState } from 'react';
import { Send } from 'lucide-react';

export const ChatInput = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 bg-white border-t border-slate-100 sticky bottom-0 shrink-0"
    >
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type your question..."
        disabled={disabled}
        className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-400 font-medium"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none shrink-0 cursor-pointer"
      >
        <Send size={16} />
      </button>
    </form>
  );
};
export default ChatInput;
