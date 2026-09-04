/**
 * Context Manager — keeps track of the active conversation context.
 * Stores the last searched student and the last topic discussed,
 * so follow-up questions can be resolved without asking again.
 */

let context = {
  lastStudent: null,   // { name, rollNumber, id, ...full student object }
  lastTopic: null,     // 'attendance' | 'complaint' | 'leave' | 'gatepass' | 'fee' | 'room'
  lastResults: null,   // raw API data from the last fetch
};

export const setContext = (key, value) => {
  context[key] = value;
};

export const getContext = (key) => {
  return context[key];
};

export const clearContext = () => {
  context = {
    lastStudent: null,
    lastTopic: null,
    lastResults: null,
  };
};

export const getFullContext = () => ({ ...context });

/**
 * Detects if a short message is a follow-up topic request.
 * Returns the resolved topic name or null.
 */
export const detectFollowUpTopic = (input) => {
  const text = input.toLowerCase().trim();

  const TOPIC_MAP = [
    { topic: 'attendance', patterns: ['attendance', 'attendence', 'present', 'absent', 'od', 'onduty'] },
    { topic: 'complaint', patterns: ['complaint', 'complaints', 'issue', 'problem', 'grievance'] },
    { topic: 'leave', patterns: ['leave', 'leaves', 'leave request', 'leave history'] },
    { topic: 'gatepass', patterns: ['gate pass', 'gatepass', 'outpass', 'outside', 'outing'] },
    { topic: 'fee', patterns: ['fee', 'fees', 'bill', 'bills', 'payment', 'pending fee'] },
    { topic: 'room', patterns: ['room', 'bed', 'room no', 'room number', 'allotment'] },
    { topic: 'profile', patterns: ['profile', 'details', 'info', 'information', 'student details'] },
  ];

  for (const entry of TOPIC_MAP) {
    if (entry.patterns.some(p => text === p || text.startsWith(p) || text.endsWith(p))) {
      return entry.topic;
    }
  }
  return null;
};
