import React, { useRef, useEffect } from 'react';
import { useChatbot } from '../../hooks/useChatbot';
import { useAuth } from '../../context/AuthContext';
import { ChatHeader } from './ChatHeader';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { SuggestionChips } from './SuggestionChips';
import { TypingIndicator } from './TypingIndicator';

const POPULAR_QUESTIONS = {
  warden: [
    "📅 Today's Attendance",
    "📋 Pending Complaints",
    "🚪 Gate Pass Summary",
    "📄 Leave Requests",
    "🎉 Holiday List",
    "🚫 Suspensions",
    "🍽 Mess Rebates",
    "🏠 Hostel Overview",
    "🔍 Search Student",
    "🛏 Room Occupancy",
  ],
  student: [
    "My Complaints",
    "Pending Fees",
    "My Leaves",
    "Gate Pass",
    "Mess Menu",
    "Room Details",
  ],
  mess: [
    "Menus",
    "Low Stock",
    "Daily Meal Entry",
    "Mess Reports",
  ],
  admin: [
    "Dashboard",
    "Manage Rooms",
    "Students",
    "Outpass Logs",
  ],
};

const PopularQuestions = ({ role, onSelect }) => {
  const normRole = role === 'lapc' ? 'student' : role?.toLowerCase() || 'student';
  const questions = POPULAR_QUESTIONS[normRole] || POPULAR_QUESTIONS.student;

  return (
    <div className="px-3 py-3 border-b border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        🔥 Popular Questions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {questions.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q.replace(/^[^\w]+/, '').trim())}
            className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full px-3 py-1 transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export const ChatWindow = () => {
  const {
    isOpen,
    messages,
    isTyping,
    closeChat,
    sendMessage,
    resetChat
  } = useChatbot();

  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(scrollToBottom, 80);
      return () => clearTimeout(timer);
    }
  }, [messages, isTyping, isOpen]);

  if (!isOpen) return null;

  // Get current suggestions from last bot message
  const lastBotMessage = [...messages].reverse().find(m => m.sender === 'bot');
  const currentSuggestions = lastBotMessage?.suggestions;

  // Show Popular Questions only when conversation is fresh (only welcome message)
  const showPopularQuestions = messages.length <= 2;

  return (
    <div
      className="fixed bottom-24 right-6 z-50 flex flex-col w-[390px] h-[630px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-110px)] bg-white/98 border border-slate-200/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ease-in-out backdrop-blur-md
        max-md:fixed max-md:inset-0 max-md:w-full max-md:h-full max-md:max-w-full max-md:max-h-full max-md:rounded-none max-md:z-50
      "
    >
      {/* Header */}
      <ChatHeader onClose={closeChat} onReset={resetChat} />

      {/* Popular Questions — shown initially */}
      {showPopularQuestions && (
        <PopularQuestions role={user?.role} onSelect={sendMessage} />
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-slate-50/50">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col shrink-0">
            <ChatBubble message={message} />
          </div>
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {currentSuggestions && currentSuggestions.length > 0 && !isTyping && (
        <SuggestionChips suggestions={currentSuggestions} onSelect={sendMessage} />
      )}

      {/* Sticky Input */}
      <ChatInput onSend={sendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatWindow;
