const ACTIONS = {
  student: [
    { label: 'Apply Outpass', message: 'Apply outpass', navigationPath: '/outpass' },
    { label: 'Apply Leave', message: 'Apply leave', navigationPath: '/apply-leave' },
    { label: 'My Room', message: 'My room', navigationPath: '/view-rooms' },
    { label: 'My Fees', message: 'My fees', navigationPath: '/hfee' },
    { label: 'Raise Complaint', message: 'Raise complaint', navigationPath: '/submit-complaint' },
    { label: 'Food Order', message: 'Food order', navigationPath: '/food-order' },
  ],
  parent: [
    { label: 'Student Details', message: 'Student details' }, { label: 'Room Details', message: 'Room details' },
    { label: 'Leave Status', message: 'Leave status' }, { label: 'Fee Status', message: 'Fee status' }, { label: 'Notices', message: 'Notices' },
  ],
  warden: [
    { label: 'List Students', message: 'List students' }, { label: 'Find Student', message: 'Search student', navigationPath: '/students' }, { label: 'Enroll Student', message: 'Enroll student', navigationPath: '/enroll-student' },
    { label: 'Outpass Approvals', message: 'Pending gate passes', navigationPath: '/outpass-approval' }, { label: 'Leave Requests', message: 'Leave requests', navigationPath: '/leave-requests' },
    { label: 'Manage Rooms', message: 'Room allotment', navigationPath: '/room-allotment' }, { label: 'Complaints', message: 'Manage complaints', navigationPath: '/complaints' },
  ],
  admin: [
    { label: 'List Students', message: 'List students' }, { label: 'Dashboard', message: 'Admin dashboard', navigationPath: '/dashboard' }, { label: 'Manage Hostels', message: 'Manage hostels', navigationPath: '/hostels' },
    { label: 'Room Management', message: 'Room management', navigationPath: '/room-management' }, { label: 'Create User', message: 'Create user', navigationPath: '/create-user' },
    { label: 'Sessions', message: 'Manage sessions', navigationPath: '/sessions' }, { label: 'Outpass Logs', message: 'Outpass logs', navigationPath: '/outpass-logs' },
  ],
  mess: [
    { label: 'Menu Management', message: 'Manage menus', navigationPath: '/menus' }, { label: 'Menu Planner', message: 'Menu planner', navigationPath: '/menu-planner' },
    { label: 'Stock Management', message: 'Stock management', navigationPath: '/stock' }, { label: 'Daily Meal Entry', message: 'Daily meal entry', navigationPath: '/single-page-daily-entry' },
    { label: 'Food Orders', message: 'Food orders', navigationPath: '/food-orders' }, { label: 'Mess Reports', message: 'Mess reports', navigationPath: '/consumption-report' },
  ],
  security: [
    { label: 'Today\'s Gate Status', message: 'Gate pass summary' }, { label: 'Students Outside', message: 'Students outside hostel' }, { label: 'Outpass Lookup', message: 'Search outpass' },
  ],
};

export const normalizeChatRole = (role) => String(role || 'student').trim().toLowerCase() === 'lapc' ? 'student' : String(role || 'student').trim().toLowerCase();
export const getChatRoleActions = (role) => ACTIONS[normalizeChatRole(role)] || ACTIONS.student;
