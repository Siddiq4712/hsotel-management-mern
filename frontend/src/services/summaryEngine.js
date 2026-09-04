/**
 * Summary Engine — converts raw API data into human-readable text + card definitions.
 * Each builder returns: { text: string, cards: Array, suggestions: Array, navPath?: string }
 */

// ─────────────────────────────────────────────────────────────────────────────
// WARDEN SUMMARIES
// ─────────────────────────────────────────────────────────────────────────────

export const buildAttendanceSummary = (stats) => {
  const total = stats.totalStudents || 0;
  const present = stats.attendanceStatus?.P || 0;
  const absent = stats.attendanceStatus?.A || 0;
  const od = stats.attendanceStatus?.OD || 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const text = [
    `📊 **Today's Attendance Summary**`,
    ``,
    `• Total Students: **${total}**`,
    `• Present ✅: **${present}**`,
    `• Absent ❌: **${absent}**`,
    `• On Duty 📋: **${od}**`,
    ``,
    `Attendance today is **${pct}%**.`,
    absent > 0 ? `${absent} students are absent.` : `Everyone is present today! 🎉`,
    od > 0 ? `${od} students are on official duty.` : ``,
  ].filter(Boolean).join('\n');

  const cards = [
    { label: 'Total Students', value: total, type: 'info', icon: 'students' },
    { label: 'Present ✅', value: present, type: 'success', icon: 'students' },
    { label: 'Absent ❌', value: absent, type: absent > 0 ? 'danger' : 'success', icon: 'students' },
    { label: 'On Duty 📋', value: od, type: 'warning', icon: 'students' },
  ];

  return {
    text,
    cards,
    navPath: '/attendance',
    navLabel: 'View Attendance',
    suggestions: ['Show absentees', 'Pending leaves', 'Students outside', 'Today dashboard'],
  };
};

export const buildComplaintSummary = (stats) => {
  const pending = stats.pendingComplaints || 0;
  const total = stats.totalComplaints || 0;
  const urgent = stats.urgentComplaints || 0;
  const resolved = total - pending;

  const text = [
    `📋 **Complaint Summary**`,
    ``,
    `• Total Complaints: **${total}**`,
    `• Unresolved: **${pending}**`,
    `• Resolved: **${resolved}**`,
    urgent > 0 ? `• ⚠ Urgent: **${urgent}**` : ``,
    ``,
    pending > 0
      ? `There are **${pending}** complaints awaiting resolution.`
      : `All complaints have been resolved. ✅`,
  ].filter(Boolean).join('\n');

  const cards = [
    { label: 'Total Complaints', value: total, type: 'info', icon: 'complaints' },
    { label: 'Unresolved', value: pending, type: pending > 0 ? 'danger' : 'success', icon: 'complaints' },
    { label: 'Resolved', value: resolved, type: 'success', icon: 'complaints' },
  ];

  if (urgent > 0) {
    cards.push({ label: '⚠ Urgent', value: urgent, type: 'danger', icon: 'complaints' });
  }

  return {
    text,
    cards,
    navPath: '/complaints',
    navLabel: 'View Complaints',
    suggestions: ['Pending leaves', 'Room occupancy', 'Today dashboard', 'Attendance'],
  };
};

export const buildLeaveSummary = (stats) => {
  const pending = stats.pendingLeaves || 0;

  const text = [
    `📄 **Leave Requests Summary**`,
    ``,
    `• Pending Leave Requests: **${pending}**`,
    ``,
    pending > 0
      ? `There are **${pending}** leave requests awaiting your approval.`
      : `No pending leave requests. All cleared! ✅`,
  ].join('\n');

  const cards = [
    { label: 'Pending Leaves', value: pending, type: pending > 0 ? 'warning' : 'success', icon: 'attendance' },
  ];

  return {
    text,
    cards,
    navPath: '/leave-requests',
    navLabel: 'View Leave Requests',
    suggestions: ['Pending gate passes', 'Complaints', 'Attendance', 'Today dashboard'],
  };
};

export const buildOutpassSummary = (stats) => {
  const pendingGP = stats.outpasses?.pending || 0;
  const outside = stats.outpasses?.outside || 0;

  const text = [
    `🚪 **Gate Pass / Outpass Summary**`,
    ``,
    `• Students Currently Outside: **${outside}**`,
    `• Pending Gate Pass Approvals: **${pendingGP}**`,
    ``,
    pendingGP > 0
      ? `**${pendingGP}** gate pass requests need your approval.`
      : `No pending gate pass requests. ✅`,
    outside > 0 ? `**${outside}** students are currently outside the hostel.` : ``,
  ].filter(Boolean).join('\n');

  const cards = [
    { label: 'Students Outside', value: outside, type: outside > 0 ? 'warning' : 'success', icon: 'students' },
    { label: 'Pending Approvals', value: pendingGP, type: pendingGP > 0 ? 'warning' : 'success', icon: 'attendance' },
  ];

  return {
    text,
    cards,
    navPath: '/outpass-approval',
    navLabel: 'View Gate Passes',
    suggestions: ['Attendance', 'Pending leaves', 'Complaints', 'Room occupancy'],
  };
};

export const buildSuspensionSummary = (suspensions) => {
  const active = suspensions.filter(s => s.status === 'active' || !s.status);
  const count = active.length;

  const studentNames = active.slice(0, 5).map((s, i) =>
    `${i + 1}. ${s.student?.name || s.studentName || 'Unknown'} — ${s.reason || 'Disciplinary action'}`
  ).join('\n');

  const text = [
    `🚫 **Suspension Summary**`,
    ``,
    `• Active Suspensions: **${count}**`,
    ``,
    count > 0
      ? `Currently suspended students:\n${studentNames}`
      : `No active suspensions. ✅`,
  ].join('\n');

  const cards = [
    { label: 'Active Suspensions', value: count, type: count > 0 ? 'danger' : 'success', icon: 'students' },
  ];

  return {
    text,
    cards,
    navPath: '/suspensions',
    navLabel: 'View Suspensions',
    suggestions: ['Complaints', 'Attendance', 'Today dashboard', 'Pending leaves'],
  };
};

export const buildHolidaySummary = (holidays) => {
  const today = new Date().toISOString().slice(0, 10);
  const todayHols = holidays.filter(h => h.date && String(h.date).slice(0, 10) === today);
  const upcoming = holidays.filter(h => {
    const d = h.date ? new Date(h.date) : null;
    return d && d > new Date();
  }).slice(0, 3);

  const todayText = todayHols.length > 0
    ? `Today's Holiday: **${todayHols.map(h => h.name || h.title || 'Holiday').join(', ')}** 🎉`
    : `No holidays today.`;

  const upcomingText = upcoming.length > 0
    ? `\nUpcoming Holidays:\n${upcoming.map(h => `• ${h.name || h.title || 'Holiday'} — ${h.date?.slice(0, 10) || ''}`).join('\n')}`
    : `\nNo upcoming holidays scheduled.`;

  const text = [
    `🎉 **Holiday Summary**`,
    ``,
    todayText,
    upcomingText,
  ].join('\n');

  const cards = [
    { label: "Today's Holidays", value: todayHols.length, type: todayHols.length > 0 ? 'warning' : 'success', icon: 'hostels' },
    { label: 'Total Holidays', value: holidays.length, type: 'info', icon: 'hostels' },
  ];

  return {
    text,
    cards,
    navPath: '/holidays',
    navLabel: 'Manage Holidays',
    suggestions: ['Today dashboard', 'Attendance', 'Suspensions', 'Rebates'],
  };
};

export const buildRebateSummary = (rebates) => {
  const pending = rebates.filter(r => r.status === 'pending' || !r.status);
  const count = pending.length;

  const names = pending.slice(0, 5).map((r, i) =>
    `${i + 1}. ${r.student?.name || r.studentName || 'Unknown'} — ${r.reason || 'Rebate request'}`
  ).join('\n');

  const text = [
    `🍽 **Mess Rebate Summary**`,
    ``,
    `• Pending Rebate Requests: **${count}**`,
    ``,
    count > 0
      ? `Students awaiting rebate approval:\n${names}`
      : `No pending rebate requests. ✅`,
  ].join('\n');

  const cards = [
    { label: 'Pending Rebates', value: count, type: count > 0 ? 'warning' : 'success', icon: 'food' },
  ];

  return {
    text,
    cards,
    navPath: '/rebate',
    navLabel: 'View Rebates',
    suggestions: ['Holidays', 'Suspensions', 'Attendance', 'Today dashboard'],
  };
};

export const buildOccupancySummary = (stats) => {
  const occupied = stats.occupiedBeds || 0;
  const available = stats.availableBeds || 0;
  const total = stats.totalCapacity || (occupied + available);
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const text = [
    `🛏 **Room & Bed Occupancy Summary**`,
    ``,
    `• Beds Occupied: **${occupied}**`,
    `• Beds Available: **${available}**`,
    `• Total Capacity: **${total}**`,
    `• Occupancy Rate: **${pct}%**`,
  ].join('\n');

  const cards = [
    { label: 'Occupied Beds', value: occupied, type: 'success', icon: 'rooms' },
    { label: 'Available Beds', value: available, type: 'info', icon: 'rooms' },
    { label: 'Total Capacity', value: total, type: 'info', icon: 'rooms' },
  ];

  return {
    text,
    cards,
    navPath: '/room-allotment',
    navLabel: 'View Room Allotment',
    suggestions: ['Today dashboard', 'Students', 'Complaints', 'Attendance'],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL WARDEN DASHBOARD OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const buildWardenDashboardSummary = (stats) => {
  const text = [
    `🏠 **Hostel Overview — Today's Summary**`,
    ``,
    `• Total Students: **${stats.totalStudents || 0}**`,
    `• Present: **${stats.attendanceStatus?.P || 0}** | Absent: **${stats.attendanceStatus?.A || 0}**`,
    `• Students Outside: **${stats.outpasses?.outside || 0}**`,
    `• Pending Leaves: **${stats.pendingLeaves || 0}**`,
    `• Pending Gate Passes: **${stats.outpasses?.pending || 0}**`,
    `• Unresolved Complaints: **${stats.pendingComplaints || 0}**`,
  ].join('\n');

  const cards = [
    { label: 'Total Students', value: stats.totalStudents || 0, type: 'info', icon: 'students' },
    { label: 'Present ✅', value: stats.attendanceStatus?.P || 0, type: 'success', icon: 'students' },
    { label: 'Absent ❌', value: stats.attendanceStatus?.A || 0, type: stats.attendanceStatus?.A > 0 ? 'danger' : 'success', icon: 'students' },
    { label: 'Outside 🏃', value: stats.outpasses?.outside || 0, type: 'warning', icon: 'students' },
    { label: 'Pending Leaves', value: stats.pendingLeaves || 0, type: stats.pendingLeaves > 0 ? 'warning' : 'success', icon: 'attendance' },
    { label: 'Complaints', value: stats.pendingComplaints || 0, type: stats.pendingComplaints > 0 ? 'danger' : 'success', icon: 'complaints' },
  ];

  return {
    text,
    cards,
    navPath: '/dashboard',
    navLabel: 'Open Full Dashboard',
    suggestions: ['Attendance', 'Complaints', 'Gate passes', 'Leave requests'],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT PORTAL SUMMARIES
// ─────────────────────────────────────────────────────────────────────────────

export const buildStudentDashboardSummary = (d) => {
  const text = [
    `👤 **Your Student Portal Summary**`,
    ``,
    `• Pending Mess Bills: **${d.pendingBills || 0}**`,
    `• Pending Complaints: **${d.pendingComplaints || 0}**`,
    `• Total Leaves: **${d.totalLeaves || 0}**`,
    `• Facility Usages: **${d.facilityUsageCount || 0}**`,
  ].join('\n');

  const cards = [
    { label: 'Pending Bills', value: d.pendingBills || 0, type: d.pendingBills > 0 ? 'danger' : 'success', icon: 'money' },
    { label: 'Complaints', value: d.pendingComplaints || 0, type: d.pendingComplaints > 0 ? 'warning' : 'success', icon: 'complaints' },
    { label: 'Leaves', value: d.totalLeaves || 0, type: 'info', icon: 'attendance' },
    { label: 'Facility Uses', value: d.facilityUsageCount || 0, type: 'info', icon: 'hostels' },
  ];

  return {
    text,
    cards,
    navPath: '/dashboard',
    navLabel: 'Open Dashboard',
    suggestions: ['My complaints', 'Pending fees', 'My leaves', 'Gate pass'],
  };
};
