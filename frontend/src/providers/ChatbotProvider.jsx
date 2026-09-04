import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { processUserMessage } from '../services/chatbotEngine';
import { getSuggestionsForRole } from '../config/intents';
import { studentAPI, wardenAPI, messAPI, adminAPI } from '../services/api';
import {
  fetchWardenTodayHighlights,
  fetchWardenDashboardStats,
  fetchWardenSuspensions,
  fetchWardenHolidays,
  fetchWardenRebates,
  fetchStudentDashboardStats,
  fetchMessDashboardStats,
  fetchAdminDashboardStats,
} from '../services/apiResolver';
import {
  buildAttendanceSummary,
  buildComplaintSummary,
  buildLeaveSummary,
  buildOutpassSummary,
  buildSuspensionSummary,
  buildHolidaySummary,
  buildRebateSummary,
  buildOccupancySummary,
  buildWardenDashboardSummary,
  buildStudentDashboardSummary,
} from '../services/summaryEngine';
import { handleStudentSearch } from '../services/studentSearchEngine';
import { clearContext, setContext, getContext } from '../services/contextManager';

export const ChatbotContext = createContext(undefined);

const WELCOME_TEXT = `Hi 👋 I'm **Hostel Genie** — your intelligent hostel assistant.

I can help you with:
• 📅 Today's live hostel highlights
• 📊 Attendance, complaints & leave summaries  
• 🔍 Search students by name or roll number
• 🚪 Gate pass & outpass status
• 🎉 Holidays & 🍽 mess rebates

Type a question or tap a quick action below.`;

const buildId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const makeBot = (text, extras = {}) => ({
  id: buildId('bot'),
  sender: 'bot',
  text,
  timestamp: new Date(),
  ...extras,
});

const makeUser = (text) => ({
  id: buildId('user'),
  sender: 'user',
  text,
  timestamp: new Date(),
});

export const ChatbotProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const highlightsFetchedRef = useRef(false);

  const normalizedRole = user?.role
    ? (String(user.role).toLowerCase().trim() === 'lapc' ? 'student' : String(user.role).toLowerCase().trim())
    : '';

  // ── Welcome Message ───────────────────────────────────────────────────────
  const getWelcomeMessage = useCallback(() =>
    makeBot(WELCOME_TEXT, {
      id: 'welcome',
      suggestions: getSuggestionsForRole(user?.role || 'student'),
    }), [user?.role]);

  // ── Initialize / Reset on user change ─────────────────────────────────────
  useEffect(() => {
    setMessages([getWelcomeMessage()]);
    setUnreadCount(0);
    setIsOpen(false);
    highlightsFetchedRef.current = false;
    clearContext();
  }, [user, getWelcomeMessage]);

  // ── Persist chat history ───────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      // Don't persist special card data (too large / not serializable cleanly)
      const serializable = messages.map(m => ({
        ...m,
        highlightsData: undefined,
        cards: m.cards && !m.cardType?.startsWith('student') ? m.cards : undefined,
      }));
      localStorage.setItem('hostel_genie_v2_history', JSON.stringify(serializable));
    }
  }, [messages]);

  // ── Auto-fetch Today's Highlights when warden opens chat ──────────────────
  useEffect(() => {
    if (!isOpen || normalizedRole !== 'warden' || highlightsFetchedRef.current) return;

    highlightsFetchedRef.current = true;
    setIsTyping(true);

    fetchWardenTodayHighlights()
      .then(data => {
        setMessages(prev => [
          ...prev,
          makeBot(`📅 Here are **today's live hostel highlights** for you:`, {
            cardType: 'today_highlights',
            highlightsData: data,
            suggestions: ['Attendance summary', 'Complaint summary', 'Gate pass summary', 'Leave requests'],
          }),
        ]);
      })
      .catch(err => {
        console.error('Highlights fetch error:', err);
        setMessages(prev => [
          ...prev,
          makeBot(`I couldn't load today's highlights right now. You can still ask me specific questions!`, {
            suggestions: ['Attendance', 'Complaints', 'Gate passes', 'Search student'],
          }),
        ]);
      })
      .finally(() => setIsTyping(false));
  }, [isOpen, normalizedRole]);

  // ── Toggle / Open / Close ─────────────────────────────────────────────────
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  }, []);

  const closeChat  = useCallback(() => setIsOpen(false), []);
  const openChat   = useCallback(() => { setIsOpen(true); setUnreadCount(0); }, []);

  // ── Core message sender ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim()) return;

    const userMsg = makeUser(text);
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Use intent engine to classify
    const result = processUserMessage(text, user?.role);

    const TYPING_DELAY = 900;

    setTimeout(async () => {
      try {
        const botMsg = await resolveAction(result, text, normalizedRole, navigate);
        setMessages(prev => [...prev, botMsg]);

        // Auto-navigate for pure navigation intents (not summaries/search)
        if (
          result.actionData?.action === 'navigate' &&
          result.actionData?.navigationPath &&
          !['summary', 'highlights', 'student_search', 'student_followup',
            'warden_attendance', 'warden_complaints', 'warden_leaves',
            'warden_outpass', 'warden_suspensions', 'warden_holidays',
            'warden_rebates', 'warden_occupancy'].includes(result.actionData?.action)
        ) {
          setTimeout(() => navigate(result.actionData.navigationPath), 800);
        }
      } catch (err) {
        console.error('ChatbotProvider sendMessage error:', err);
        setMessages(prev => [...prev, makeBot(`😔 Something went wrong. Please try again.`, {
          suggestions: getSuggestionsForRole(user?.role || 'student'),
        })]);
      } finally {
        setIsTyping(false);
        if (!isOpen) setUnreadCount(c => c + 1);
      }
    }, TYPING_DELAY);
  }, [user, isOpen, navigate, normalizedRole]);

  const resetChat = useCallback(() => {
    setMessages([getWelcomeMessage()]);
    setUnreadCount(0);
    clearContext();
    highlightsFetchedRef.current = false;
  }, [getWelcomeMessage]);

  return (
    <ChatbotContext.Provider
      value={{ isOpen, messages, isTyping, unreadCount, toggleChat, closeChat, openChat, sendMessage, resetChat }}
    >
      {children}
    </ChatbotContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION RESOLVER  (outside the component to avoid re-creation on every render)
// ─────────────────────────────────────────────────────────────────────────────
async function resolveAction(result, rawText, role, navigate) {
  const action = result.actionData?.action;
  const intentObj = result._intent; // the raw intent object from matchIntent

  // ── Student Follow-up ───────────────────────────────────────────────────
  if (action === 'student_followup') {
    const student = result.actionData?.followUpStudent;
    const topic   = result.actionData?.followUpTopic;

    if (!student) {
      return makeBot(`I don't have a student in context. Please search for a student first.`);
    }

    const navPaths = { gatepass: 'outpass-approval', complaint: 'complaints', attendance: 'attendance', room: 'room-allotment' };
    const navPath = navPaths[topic] || topic;

    // Fetch the live summary for this specific student
    const summaryData = await fetchStudentSummaryForWarden(student.id);

    if (!summaryData) {
      return makeBot(
        `I couldn't fetch ${topic} data for **${student.name}** right now.\n\n_Try navigating to the detailed view._`,
        {
          actionData: { navigationPath: `/${navPath}` },
          navLabel: `View ${topic}`,
          suggestions: ['Attendance', 'Complaints', 'Gate pass', 'Room details'],
        }
      );
    }

    // Build specific text response based on the topic
    let text = `Here is the **${topic}** status for **${student.name}**:`;

    if (topic === 'attendance') {
      const { presentDays, totalDays } = summaryData.attendance;
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      text = `**Attendance** (Current Month) for **${student.name}**:\n\n• Present Days: **${presentDays}**\n• Total Days: **${totalDays}**\n• Percentage: **${percentage}%**`;
    } else if (topic === 'complaint') {
      const { totalComplaints, pendingComplaints } = summaryData.complaints;
      text = `**Complaints** logged by **${student.name}**:\n\n• Pending Complaints: **${pendingComplaints}**\n• Total Complaints: **${totalComplaints}**`;
    } else if (topic === 'gatepass' || topic === 'leave') {
      const { totalLeaves, pendingLeaves } = summaryData.leaves;
      text = `**Gate Passes & Leaves** for **${student.name}**:\n\n• Pending Approvals: **${pendingLeaves}**\n• Total Requests: **${totalLeaves}**`;
    } else if (topic === 'room') {
      text = `**Room Details** for **${student.name}**:\n\n• Current Allotment: **${summaryData.room}**`;
    }

    return makeBot(text, {
      actionData: { navigationPath: `/${navPath}` },
      navLabel: `Manage ${topic}`,
      suggestions: ['Attendance', 'Complaints', 'Gate pass', 'Room details'],
    });
  }

  // ── Student Search ───────────────────────────────────────────────────────
  if (action === 'student_search') {
    const query = result.actionData?.searchQuery || rawText;
    if (!['warden', 'admin'].includes(role)) {
      return makeBot(`🔒 Student search is only available for wardens and administrators.`);
    }
    const searchResult = await handleStudentSearch(query, role);
    return makeBot(searchResult.text, {
      cards: searchResult.cards,
      cardType: searchResult.cardType || 'student_list',
      hasMore: searchResult.hasMore,
      totalCount: searchResult.totalCount,
      suggestions: searchResult.suggestions,
    });
  }

  // ── Today's Highlights (manual re-trigger) ────────────────────────────────
  if (action === 'highlights') {
    if (role !== 'warden') {
      return makeBot(`Today's Highlights is currently available for Warden role.`);
    }
    const data = await fetchWardenTodayHighlights();
    return makeBot(`📅 Here are **today's live hostel highlights**:`, {
      cardType: 'today_highlights',
      highlightsData: data,
      suggestions: ['Attendance summary', 'Complaint summary', 'Gate passes', 'Leave requests'],
    });
  }

  // ── Warden Summary Actions ────────────────────────────────────────────────
  if (role === 'warden') {
    if (action === 'warden_attendance' || action === 'summary' && rawText.toLowerCase().includes('attend')) {
      const stats = await fetchWardenDashboardStats();
      const summary = buildAttendanceSummary(stats);
      return makeSummaryBot(summary);
    }
    if (action === 'warden_complaints' || action === 'summary' && rawText.toLowerCase().includes('complaint')) {
      const stats = await fetchWardenDashboardStats();
      const summary = buildComplaintSummary(stats);
      return makeSummaryBot(summary);
    }
    if (action === 'warden_leaves') {
      const stats = await fetchWardenDashboardStats();
      const summary = buildLeaveSummary(stats);
      return makeSummaryBot(summary);
    }
    if (action === 'warden_outpass') {
      const stats = await fetchWardenDashboardStats();
      const summary = buildOutpassSummary(stats);
      return makeSummaryBot(summary);
    }
    if (action === 'warden_suspensions') {
      const suspensions = await fetchWardenSuspensions();
      const summary = buildSuspensionSummary(suspensions);
      return makeSummaryBot(summary);
    }
    if (action === 'warden_holidays') {
      const holidays = await fetchWardenHolidays();
      const summary = buildHolidaySummary(holidays);
      return makeSummaryBot(summary);
    }
    if (action === 'warden_rebates') {
      const rebates = await fetchWardenRebates();
      const summary = buildRebateSummary(rebates);
      return makeSummaryBot(summary);
    }
    if (action === 'warden_occupancy' || action === 'summary' && (rawText.includes('bed') || rawText.includes('room') || rawText.includes('occup'))) {
      const stats = await fetchWardenDashboardStats();
      const summary = buildOccupancySummary(stats);
      return makeSummaryBot(summary);
    }
    if (action === 'summary') {
      const stats = await fetchWardenDashboardStats();
      const summary = buildWardenDashboardSummary(stats);
      return makeSummaryBot(summary);
    }
  }

  // ── Student Summary Actions ───────────────────────────────────────────────
  if ((role === 'student' || role === 'lapc') && action === 'summary') {
    const d = await fetchStudentDashboardStats();
    const cleanText = rawText.toLowerCase();
    if (cleanText.includes('complaint')) {
      return makeSummaryBot({
        text: `Your Complaints:\n• Pending: **${d.pendingComplaints}** | Total: **${d.totalComplaints}**`,
        cards: [{ label: 'Pending Complaints', value: d.pendingComplaints, type: d.pendingComplaints > 0 ? 'warning' : 'success', icon: 'complaints' }],
        navPath: '/my-complaints', navLabel: 'View Complaints',
        suggestions: ['Fees', 'Leaves', 'Gate pass'],
      });
    }
    if (cleanText.includes('fee') || cleanText.includes('bill')) {
      return makeSummaryBot({
        text: `Your Billing:\n• Pending Bills: **${d.pendingBills}**`,
        cards: [{ label: 'Pending Bills', value: d.pendingBills, type: d.pendingBills > 0 ? 'danger' : 'success', icon: 'money' }],
        navPath: '/hfee', navLabel: 'View Fees',
        suggestions: ['Complaints', 'Leaves', 'Gate pass'],
      });
    }
    if (cleanText.includes('leave') || cleanText.includes('gate') || cleanText.includes('outpass')) {
      return makeSummaryBot({
        text: `Your Leave History:\n• Total Leave Requests: **${d.totalLeaves}**`,
        cards: [{ label: 'Total Leaves', value: d.totalLeaves, type: 'info', icon: 'attendance' }],
        navPath: '/my-leaves', navLabel: 'View Leaves',
        suggestions: ['Complaints', 'Fees'],
      });
    }
    const summary = buildStudentDashboardSummary(d);
    return makeSummaryBot(summary);
  }

  // ── Mess Summary ──────────────────────────────────────────────────────────
  if (role === 'mess' && action === 'summary') {
    const d = await fetchMessDashboardStats();
    const cleanText = rawText.toLowerCase();
    if (cleanText.includes('stock') || cleanText.includes('inventory')) {
      return makeSummaryBot({
        text: `Inventory Status:\n• Low Stock Items: **${d.lowStockCount}**`,
        cards: [{ label: 'Low Stock Items', value: d.lowStockCount, type: d.lowStockCount > 0 ? 'danger' : 'success', icon: 'stock' }],
        navPath: '/stock', navLabel: 'View Stock',
        suggestions: ['Menu status', 'Mess reports'],
      });
    }
    return makeSummaryBot({
      text: `Mess Summary:\n• Menus: **${d.totalMenus}** | Items: **${d.totalItems}** | Low Stock: **${d.lowStockCount}**`,
      cards: [
        { label: 'Active Menus', value: d.totalMenus, type: 'success', icon: 'hostels' },
        { label: 'Total Items', value: d.totalItems, type: 'info', icon: 'food' },
        { label: 'Low Stock', value: d.lowStockCount, type: d.lowStockCount > 0 ? 'danger' : 'success', icon: 'stock' },
      ],
      navPath: '/dashboard', navLabel: 'Open Dashboard',
      suggestions: ['Stock management', 'Menus', 'Reports'],
    });
  }

  // ── Admin Summary ─────────────────────────────────────────────────────────
  if (role === 'admin' && action === 'summary') {
    const d = await fetchAdminDashboardStats();
    const summary = {
      text: `Admin Overview:\n• Hostels: **${d.totalHostels}** | Students: **${d.totalStudents}**\n• Rooms: **${d.occupiedRooms}/${d.totalRooms}** | Maintenance: **${d.pendingMaintenance}**`,
      cards: [
        { label: 'Total Students', value: d.totalStudents, type: 'info', icon: 'students' },
        { label: 'Occupied Rooms', value: d.occupiedRooms, type: 'success', icon: 'rooms' },
        { label: 'Available Rooms', value: d.availableRooms, type: 'info', icon: 'rooms' },
        { label: 'Maintenance', value: d.pendingMaintenance, type: d.pendingMaintenance > 0 ? 'warning' : 'success', icon: 'complaints' },
      ],
      navPath: '/dashboard', navLabel: 'Open Dashboard',
      suggestions: ['Students', 'Rooms', 'Maintenance'],
    };
    return makeSummaryBot(summary);
  }

  // ── Default: use reply from chatbotEngine ─────────────────────────────────
  return makeBot(result.reply, {
    suggestions: result.suggestions,
    cards: result.cards,
    actionData: result.actionData,
  });
}

function makeSummaryBot(summary) {
  return makeBot(summary.text, {
    actionData: summary.navPath ? { navigationPath: summary.navPath } : undefined,
    navLabel: summary.navLabel,
    suggestions: summary.suggestions,
  });
}

export default ChatbotProvider;
