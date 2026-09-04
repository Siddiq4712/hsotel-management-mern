import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useChatbot } from '../../hooks/useChatbot';

export const FloatingButton = () => {
  const { isOpen, toggleChat, unreadCount } = useChatbot();

  return (
    <button
      onClick={toggleChat}
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full border border-white/20 shadow-2xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer
        ${isOpen 
          ? 'bg-rose-500 hover:bg-rose-600 text-white rotate-90 scale-100' 
          : 'bg-gradient-to-tr from-blue-600/90 to-indigo-600/90 text-white hover:scale-110 active:scale-95'
        }
        backdrop-blur-md
      `}
      aria-label="Open HostelMate assistant"
    >
      {isOpen ? (
        <X size={26} className="transition-transform" />
      ) : (
        <div className="relative">
          <MessageSquare size={26} className="animate-pulse" />
          {unreadCount > 0 && (
            <span className="absolute -top-3 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>
      )}
    </button>
  );
};
export default FloatingButton;
