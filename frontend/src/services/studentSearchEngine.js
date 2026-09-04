/**
 * Student Search Engine — detects student search queries and builds result cards.
 */

import { searchStudentsByQuery } from './apiResolver';
import { setContext } from './contextManager';

// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_TRIGGERS = [
  'show', 'search', 'find', 'display', 'get', 'fetch', 'look up',
  'where is', 'who is', 'locate', 'student', 'roll', 'roll no', 'reg no',
  'record of', 'details of', 'info of', 'profile of',
];

// Detects if the input is a student search query.
// Returns the search query string, or null if not a student search.
export const detectStudentSearch = (input) => {
  if (!input) return null;
  const text = input.toLowerCase().trim();

  // Check if starts with a known search trigger
  for (const trigger of SEARCH_TRIGGERS) {
    if (text.startsWith(trigger + ' ') || text === trigger) {
      const remaining = text.slice(trigger.length).trim();
      if (remaining.length >= 2) return remaining;
    }
  }

  // Check for roll number pattern (6+ digit number or alphanumeric like "2211101")
  if (/^\d{6,}$/.test(text)) return text;
  if (/^[a-z]{0,3}\d{6,}$/.test(text)) return text; // e.g., "cs2211101"

  // Check for "roll 2211101" pattern
  if (/^roll\s+\S+/.test(text)) {
    return text.replace(/^roll\s+/, '').trim();
  }

  // If it's a capitalized name without spaces (e.g., "Rahul", "ALWIN")
  const original = input.trim();
  if (/^[A-Z][a-zA-Z.\s]{2,}$/.test(original) && !original.includes(' attend')) {
    return original;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CARD BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

export const buildStudentProfileCard = (student) => {
  return {
    type: 'student_profile',
    data: {
      id: student._id || student.id,
      name: student.username || student.userName || student.name || student.student_name || 'Unknown',
      rollNumber: student.roll_number || student.rollNumber || student.registerNumber || '—',
      department: student.department || student.dept || '—',
      year: student.year || student.currentYear || '—',
      room: student.room_number || student.roomNumber || student.room?.room_number || '—',
      block: student.block || student.room?.block || '—',
      status: student.current_status || student.status || 'Inside',
      phone: student.phone || student.mobile || '—',
      email: student.email || '—',
      photo: student.photo || student.profile_photo || null,
    },
  };
};

export const buildStudentListCards = (students) => {
  return students.slice(0, 5).map(s => buildStudentProfileCard(s));
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEARCH HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const handleStudentSearch = async (query, role) => {
  if (!query || query.length < 2) {
    return {
      text: `Please provide at least 2 characters to search for a student.`,
      cards: [],
      suggestions: ['Search Rahul', 'Search 2211101', 'Student list'],
    };
  }

  const students = await searchStudentsByQuery(query, role);

  if (!students || students.length === 0) {
    return {
      text: `🔍 No student found matching "**${query}**".\n\nTry searching by:\n• Full name (e.g., "Show Rahul")\n• Roll number (e.g., "Search 2211101")\n• Partial name (e.g., "Find Bala")`,
      cards: [],
      suggestions: ['Student list', 'Attendance', 'Today dashboard'],
    };
  }

  if (students.length === 1) {
    const student = students[0];
    // Save context for follow-up questions
    setContext('lastStudent', {
      ...student,
      name: student.username || student.userName || student.name || student.student_name,
      rollNumber: student.roll_number || student.rollNumber || student.registerNumber,
      id: student._id || student.id,
    });
    setContext('lastTopic', 'profile');

    const card = buildStudentProfileCard(student);
    return {
      text: `👤 Found 1 student matching "**${query}**":`,
      cards: [card],
      cardType: 'student_list',
      suggestions: ['Attendance', 'Complaints', 'Gate pass', 'Room details'],
    };
  }

  // Multiple results
  const shown = students.slice(0, 5);
  const hasMore = students.length > 5;

  const listText = shown.map((s, i) => {
    const name = s.username || s.userName || s.name || s.student_name || 'Unknown';
    const roll = s.roll_number || s.rollNumber || s.registerNumber || '';
    const dept = s.department || s.dept || '';
    return `${i + 1}. **${name}** — ${roll}${dept ? ` (${dept})` : ''}`;
  }).join('\n');

  return {
    text: `🔍 Found ${students.length} students matching "**${query}**":\n\n${listText}${hasMore ? `\n\n_Showing first 5 of ${students.length} results._` : ''}`,
    cards: buildStudentListCards(shown),
    cardType: 'student_list',
    hasMore,
    totalCount: students.length,
    suggestions: ['Search again', 'Student list', 'Today dashboard'],
  };
};
