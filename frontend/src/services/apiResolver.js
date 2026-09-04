/**
 * API Resolver — centralised module for all chatbot live data fetching.
 * Each function maps to one "data need" and returns a normalised result object.
 */

import { wardenAPI, outpassAPI, studentAPI, messAPI, adminAPI } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// WARDEN DATA RESOLVERS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchWardenDashboardStats = async () => {
  const res = await wardenAPI.getDashboardStats();
  if (res?.data?.success) return res.data.data;
  throw new Error('Failed to fetch warden dashboard stats');
};

export const fetchWardenSuspensions = async () => {
  const res = await wardenAPI.getSuspensions();
  if (res?.data) {
    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return data;
  }
  return [];
};

export const fetchWardenHolidays = async () => {
  const res = await wardenAPI.getHolidays();
  if (res?.data) {
    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return data;
  }
  return [];
};

export const fetchWardenRebates = async () => {
  const res = await wardenAPI.getRebates({ status: 'pending' });
  if (res?.data) {
    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return data;
  }
  return [];
};

export const fetchWardenComplaints = async (params = {}) => {
  const res = await wardenAPI.getComplaints(params);
  if (res?.data) {
    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return data;
  }
  return [];
};

export const fetchWardenLeaves = async (params = {}) => {
  const res = await wardenAPI.getLeaveRequests(params);
  if (res?.data) {
    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return data;
  }
  return [];
};

export const fetchWardenOutpasses = async (params = {}) => {
  const res = await outpassAPI.getWardenOutpasses(params);
  if (res?.data) {
    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return data;
  }
  return [];
};

export const fetchWardenAttendance = async (params = {}) => {
  const res = await wardenAPI.getAttendance(params);
  if (res?.data) {
    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return data;
  }
  return [];
};

/**
 * Fetches all data for Today's Highlights panel.
 * Runs multiple API calls in parallel for speed.
 */
export const fetchWardenTodayHighlights = async () => {
  const today = new Date().toISOString().slice(0, 10);

  const [dashStats, suspensions, holidays, rebates] = await Promise.allSettled([
    fetchWardenDashboardStats(),
    fetchWardenSuspensions(),
    fetchWardenHolidays(),
    fetchWardenRebates(),
  ]);

  const stats = dashStats.status === 'fulfilled' ? dashStats.value : {};
  const suspList = suspensions.status === 'fulfilled' ? suspensions.value : [];
  const holList = holidays.status === 'fulfilled' ? holidays.value : [];
  const rebList = rebates.status === 'fulfilled' ? rebates.value : [];

  // Filter active suspensions
  const activeSuspensions = suspList.filter(s => s.status === 'active' || !s.status);

  // Filter today's holidays
  const todayHolidays = holList.filter(h => {
    const hDate = h.date ? String(h.date).slice(0, 10) : '';
    return hDate === today;
  });

  // Pending rebates
  const pendingRebates = rebList.filter(r => r.status === 'pending' || !r.status);

  return {
    totalStudents: stats.totalStudents || 0,
    present: stats.attendanceStatus?.P || 0,
    absent: stats.attendanceStatus?.A || 0,
    od: stats.attendanceStatus?.OD || 0,
    outpassStudents: stats.outpasses?.outside || 0,
    pendingLeaves: stats.pendingLeaves || 0,
    pendingGatePasses: stats.outpasses?.pending || 0,
    pendingComplaints: stats.pendingComplaints || 0,
    urgentComplaints: stats.urgentComplaints || 0,
    activeSuspensions: activeSuspensions.length,
    suspensionList: activeSuspensions.slice(0, 5),
    todayHolidays: todayHolidays.length,
    todayHolidayList: todayHolidays,
    pendingRebates: pendingRebates.length,
    rebateList: pendingRebates.slice(0, 5),
    occupiedBeds: stats.occupiedBeds || 0,
    availableBeds: stats.availableBeds || 0,
    totalCapacity: stats.totalCapacity || 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT SEARCH RESOLVERS
// ─────────────────────────────────────────────────────────────────────────────

export const searchStudentsByQuery = async (query, role) => {
  let res;
  if (role === 'warden') {
    res = await wardenAPI.getStudents({ search: query });
  } else if (role === 'admin') {
    // admin may not have getStudents — try wardenAPI as fallback
    try {
      res = await wardenAPI.getStudents({ search: query });
    } catch {
      return [];
    }
  } else {
    return [];
  }

  if (res?.data) {
    let data = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.data)
        ? res.data.data
        : Array.isArray(res.data.students)
          ? res.data.students
          : [];
          
    // Client-side filtering because backend getStudents returns all students
    if (query) {
      const q = query.toLowerCase();
      data = data.filter(s => {
        const name = (s.username || s.userName || s.name || s.student_name || '').toLowerCase();
        const roll = (s.roll_number || s.rollNumber || s.registerNumber || '').toLowerCase();
        return name.includes(q) || roll.includes(q);
      });
    }
    
    return data;
  }
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT PORTAL RESOLVERS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchStudentDashboardStats = async () => {
  const res = await studentAPI.getDashboardStats();
  if (res?.data?.success) return res.data.data;
  throw new Error('Failed to fetch student dashboard stats');
};

// ─────────────────────────────────────────────────────────────────────────────
// MESS RESOLVERS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchMessDashboardStats = async () => {
  const res = await messAPI.getMessDashboardStats();
  if (res?.data?.success) return res.data.data;
  throw new Error('Failed to fetch mess dashboard stats');
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN RESOLVERS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchAdminDashboardStats = async () => {
  const res = await adminAPI.getDashboardStats();
  if (res?.data?.success) return res.data.data;
  throw new Error('Failed to fetch admin dashboard stats');
};

/**
 * Fetches the specific student summary (Attendance, Complaints, Leaves, Room).
 */
export const fetchStudentSummaryForWarden = async (studentId) => {
  try {
    const res = await wardenAPI.getStudentSummary(studentId);
    if (res?.data?.success) {
      return res.data.data;
    }
    return null;
  } catch (error) {
    console.error('fetchStudentSummaryForWarden error:', error);
    return null;
  }
};
