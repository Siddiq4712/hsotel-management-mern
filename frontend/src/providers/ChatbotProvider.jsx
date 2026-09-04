import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { normalizeChatRole } from '../config/chatRoleActions';

export const ChatbotContext = createContext(undefined);

const quickActions = {
  student: ['🏠 My Room', "🍛 Today's Menu", '📋 My Leave', '💰 My Fees', '🔧 My Complaints'],
  parent: ['👨‍🎓 Student Details', '🏠 Room', '📋 Leave Status', '💰 Fee Status', '📢 Notices'],
  warden: ['🔎 Search Student', '🏠 Room Status', '📋 Leave Requests', '👥 Attendance', '🔧 Complaints'],
  admin: ['👥 Students', '🏠 Occupancy', '🔧 Complaints', '💰 Fees', '📊 Hostel Summary'],
  mess: ["🍛 Today's Menu", "📋 Tomorrow's Menu", '📝 Feedback', '⚠️ Food Complaint', '👥 Meal Attendance'],
};

const normalizeRole = normalizeChatRole;
const welcome = (role) => ({ id: 'welcome', sender: 'bot', timestamp: new Date(), text: `Hi 👋 I’m **HostelMate**, your ${role} assistant. Ask me anything or choose an action below.`, suggestions: quickActions[role] || quickActions.student });
const makeMessage = (sender, text, extras = {}) => ({ id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender, text, timestamp: new Date(), ...extras });

export const ChatbotProvider = ({ children }) => {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [welcome(role)]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { setMessages([welcome(role)]); setIsOpen(false); setUnreadCount(0); }, [user?.userId, role]);

  const sendMessage = useCallback(async (text) => {
    const value = String(text || '').trim();
    if (!value || isTyping) return;
    setMessages((current) => [...current, makeMessage('user', value)]);
    setIsTyping(true);
    try {
      const { data } = await api.post('/chat', { message: value });
      setMessages((current) => [...current, makeMessage('bot', data.text, {
        suggestions: data.suggestions || [],
        actionData: data.navigationPath ? { navigationPath: data.navigationPath } : undefined,
      })]);
      if (!isOpen) setUnreadCount((count) => count + 1);
    } catch (error) {
      setMessages((current) => [...current, makeMessage('bot', error.message || "I couldn't retrieve that information right now. Please try again.")]);
    } finally { setIsTyping(false); }
  }, [isOpen, isTyping]);

  const resetChat = useCallback(() => setMessages([welcome(role)]), [role]);
  const toggleChat = useCallback(() => setIsOpen((open) => { if (!open) setUnreadCount(0); return !open; }), []);
  const openChat = useCallback(() => { setIsOpen(true); setUnreadCount(0); }, []);
  const value = { isOpen, messages, isTyping, unreadCount, sendMessage, resetChat, toggleChat, openChat, closeChat: () => setIsOpen(false) };
  return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>;
};
