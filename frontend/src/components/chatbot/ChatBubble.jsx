import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SummaryCardGrid } from './cards/SummaryCard';
import TodayHighlightsCard from './cards/TodayHighlightsCard';
import StudentListCard from './cards/StudentListCard';
import { useChatbot } from '../../hooks/useChatbot';

/**
 * Formats raw markdown-like bold (**text**) into JSX spans.
 */
const formatText = (text) => {
  if (!text) return null;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold">{part}</strong>
      : part
  );
};

export const ChatBubble = ({ message }) => {
  const isBot = message.sender === 'bot';
  const navigate = useNavigate();
  const { sendMessage } = useChatbot();

  const formattedTime = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const handleActionClick = () => {
    if (message.actionData?.navigationPath) {
      navigate(message.actionData.navigationPath);
    }
  };

  // Handle student follow-up via action buttons inside StudentProfileCard
  const handleFollowUp = (topic) => {
    sendMessage(topic);
  };

  // ── Determine which card component to render ──────────────────────────────
  const renderCard = () => {
    if (!isBot) return null;

    // 1. Today's Highlights
    if (message.cardType === 'today_highlights' && message.highlightsData) {
      return <TodayHighlightsCard data={message.highlightsData} />;
    }

    // 2. Student search results
    if (message.cardType === 'student_list' && message.cards?.length > 0) {
      return (
        <StudentListCard
          cards={message.cards}
          hasMore={message.hasMore}
          totalCount={message.totalCount}
          onFollowUp={handleFollowUp}
        />
      );
    }

    // 3. Legacy / summary analytics cards (SummaryCardGrid)
    if (message.cards && message.cards.length > 0 &&
        (!message.cardType || message.cardType === 'summary_cards')) {
      return <SummaryCardGrid cards={message.cards} />;
    }

    return null;
  };

  return (
    <div
      className={`flex items-start gap-2.5 my-2.5 max-w-[90%] transition-all duration-200 shrink-0
        ${isBot ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'}
      `}
    >
      {/* Bot Avatar */}
      {isBot && (
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-50 to-blue-50 border border-indigo-100/50 shadow-sm text-sm shrink-0">
          🤖
        </div>
      )}

      {/* Bubble Content */}
      <div className="flex flex-col w-full">
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm text-sm border w-full
            ${isBot
              ? 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
              : 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white border-transparent rounded-tr-none'
            }
          `}
        >
          {/* Message text with bold formatting */}
          <p className="leading-relaxed whitespace-pre-wrap">
            {isBot ? formatText(message.text) : message.text}
          </p>

          {/* Render card components */}
          {renderCard()}

          {/* "View Details" navigation button */}
          {isBot && message.actionData?.navigationPath && message.cardType !== 'today_highlights' && (
            <button
              onClick={handleActionClick}
              className="flex items-center justify-center gap-1.5 mt-3.5 w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow hover:shadow-md cursor-pointer border border-white/5 active:scale-[0.98]"
            >
              <span>{message.navLabel || 'View Details'}</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={`text-[9px] font-semibold text-slate-400 mt-1 px-1
            ${isBot ? 'text-left' : 'text-right'}
          `}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default ChatBubble;
