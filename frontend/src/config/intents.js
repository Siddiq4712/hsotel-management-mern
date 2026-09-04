export const INTENTS = [
  // ================= V2 SPECIAL INTENTS =================
  {
    intent: "TODAY_HIGHLIGHTS",
    keywords: [
      "today", "today highlights", "today's highlights", "todays highlights",
      "todays summary", "today summary", "today dashboard", "dashboard today",
      "hostel overview", "morning summary", "daily summary", "daily overview",
      "whats happening", "what is happening", "status"
    ],
    roles: ["warden"],
    action: "highlights",
    response: "📅 Fetching today's live hostel highlights..."
  },
  {
    intent: "STUDENT_SEARCH",
    keywords: [
      "show student", "search student", "find student", "display student",
      "show roll", "search roll", "find roll", "student record",
      "look up student", "student details", "who is", "where is",
      "student info", "roll number", "register number"
    ],
    roles: ["warden", "admin"],
    action: "student_search",
    response: "🔍 Searching student database..."
  },
  {
    intent: "WARDEN_ATTENDANCE_SUMMARY",
    keywords: [
      "attendance summary", "todays attendance", "today attendance",
      "attendance report", "who are absent today", "absent students",
      "attendance status", "how many absent", "present count", "absent count",
      "how many present", "attendance percentage", "attendance stats",
      "show attendance", "check attendance"
    ],
    roles: ["warden"],
    action: "warden_attendance",
    response: "📊 Fetching today's attendance data..."
  },
  {
    intent: "WARDEN_COMPLAINT_SUMMARY",
    keywords: [
      "complaint summary", "complaint analytics", "complaint stats",
      "how many complaints", "complaints today", "unresolved complaints",
      "pending complaints", "urgent complaints", "complaint trend",
      "top complaint", "complaint report"
    ],
    roles: ["warden"],
    action: "warden_complaints",
    response: "📋 Fetching complaint analytics..."
  },
  {
    intent: "WARDEN_LEAVE_SUMMARY",
    keywords: [
      "leave summary", "leave requests pending", "pending leave requests",
      "how many leave requests", "leave statistics", "leave stats",
      "leave report", "leave status", "leave requests today"
    ],
    roles: ["warden"],
    action: "warden_leaves",
    response: "📄 Fetching leave request statistics..."
  },
  {
    intent: "WARDEN_OUTPASS_SUMMARY",
    keywords: [
      "outpass summary", "gate pass summary", "gatepass statistics",
      "pending approvals", "students outside hostel", "students outside",
      "who is outside", "outside students", "gate pass stats",
      "outpass stats", "how many outside", "outside count",
      "gate pass report"
    ],
    roles: ["warden"],
    action: "warden_outpass",
    response: "🚪 Fetching gate pass statistics..."
  },
  {
    intent: "WARDEN_SUSPENSION_SUMMARY",
    keywords: [
      "suspension summary", "suspended students", "active suspensions",
      "who is suspended", "suspension list", "suspension status",
      "discipline summary", "disciplinary action"
    ],
    roles: ["warden"],
    action: "warden_suspensions",
    response: "🚫 Fetching suspension records..."
  },
  {
    intent: "WARDEN_HOLIDAY_SUMMARY",
    keywords: [
      "holiday summary", "today holiday", "todays holiday",
      "upcoming holidays", "holiday list", "is there holiday today",
      "any holiday", "holiday status", "holiday schedule"
    ],
    roles: ["warden"],
    action: "warden_holidays",
    response: "🎉 Fetching holiday schedule..."
  },
  {
    intent: "WARDEN_REBATE_SUMMARY",
    keywords: [
      "rebate summary", "mess rebate summary", "pending rebates",
      "rebate requests", "rebate status", "how many rebates",
      "mess rebate pending"
    ],
    roles: ["warden"],
    action: "warden_rebates",
    response: "🍽 Fetching mess rebate data..."
  },
  {
    intent: "WARDEN_OCCUPANCY_SUMMARY",
    keywords: [
      "room occupancy", "bed occupancy", "room occupancy summary",
      "occupied beds", "available beds", "how many beds",
      "room availability", "hostel capacity", "bed count",
      "occupancy rate", "rooms occupied"
    ],
    roles: ["warden"],
    action: "warden_occupancy",
    response: "🛏 Fetching room occupancy data..."
  },
  // ================= ANALYTICAL INTENTS =================
  {
    intent: "STUDENT_STATS_SUMMARY",
    keywords: [
      "how many complaints do i have", "whats my attendance", "do i have any pending fees", 
      "show my gate pass history", "my complaints count", "my attendance percentage", 
      "my pending fees", "my gate pass history", "student summary", "complaints count", 
      "my attendance", "pending fees"
    ],
    roles: ["student"],
    action: "summary",
    response: "Let me pull your live student dashboard stats for you... 📊"
  },
  {
    intent: "WARDEN_STATS_SUMMARY",
    keywords: [
      "show todays absentees", "how many students are outside the hostel", 
      "pending gate passes", "emergency requests today", "room occupancy summary", 
      "todays absentees", "students outside", "emergency requests", "occupancy summary", 
      "warden summary"
    ],
    roles: ["warden"],
    action: "summary",
    response: "Fetching today's live hostel statistics for you... 📊"
  },
  {
    intent: "MESS_STATS_SUMMARY",
    keywords: [
      "meal count today", "students attending lunch", "todays menu", 
      "inventory status", "lowstock items", "mess summary", "low stock items",
      "today food count", "food status"
    ],
    roles: ["mess"],
    action: "summary",
    response: "Fetching live kitchen & menu statistics... 🍽️"
  },
  {
    intent: "ADMIN_STATS_SUMMARY",
    keywords: [
      "hostel overview", "total students", "occupied rooms", "pending complaints", 
      "pending fee payments", "todays hostel summary", "dashboard analytics", 
      "admin summary", "overview summary"
    ],
    roles: ["admin"],
    action: "summary",
    response: "Retrieving system-wide analytics overview... 📊"
  },
  // ================= STUDENT INTENTS =================
  {
    intent: "CREATE_GATEPASS",
    keywords: [
      "gate pass", "gatepass", "leave", "outing", "permission",
      "gate pass apply", "gate pass apply pannanum", "leave venum",
      "permission venum", "outing request", "outpass", "apply gate pass", "apply outpass"
    ],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/outpass",
    response: "Sure 😊 Opening the Gate Outpass page for you..."
  },
  {
    intent: "VIEW_LEAVES",
    keywords: ["gate pass status", "leave status", "my leaves", "leave history", "outing status"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/my-leaves",
    response: "Let me fetch your leave requests history for you 📋..."
  },
  {
    intent: "APPLY_LEAVE",
    keywords: ["apply leave", "leave application", "request leave", "need leave"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/apply-leave",
    response: "Opening the Apply Leave request form 📝..."
  },
  {
    intent: "CREATE_COMPLAINT",
    keywords: [
      "complaint podanum", "raise complaint", "submit complaint",
      "lodge complaint", "new complaint", "complent", "complaintt", "complaint"
    ],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/submit-complaint",
    response: "Complaint page is ready. Please let us know the issue 👍..."
  },
  {
    intent: "VIEW_COMPLAINTS",
    keywords: ["my complaints", "view complaints", "complaint status", "complaints list"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/my-complaints",
    response: "Opening your complaints history to view status update 🔍..."
  },
  {
    intent: "VIEW_FEES",
    keywords: ["fees", "fees evlo", "hostel fees", "fee detail", "hfee", "fine amount"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/hfee",
    response: "Here is your hostel fee structure and details 💸..."
  },
  {
    intent: "STUDENT_REBATE",
    keywords: ["rebate", "student rebate", "apply rebate", "my rebates"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/my-rebates",
    response: "Opening your rebates page..."
  },
  {
    intent: "DAY_REDUCTION",
    keywords: ["day reduction", "apply day reduction", "days reduction", "days-reduc"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/day-reduction",
    response: "Opening the Apply Day Reduction page for you..."
  },
  {
    intent: "MESS_MENU",
    keywords: [
      "mess menu", "today menu", "food menu", "today's menu",
      "messe menu", "food order", "special food"
    ],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/food-order",
    response: "Here is today's special food menu 🍽️. Would you like to order?"
  },
  {
    intent: "MESS_HISTORY",
    keywords: ["mess history", "mess charges", "mess bill", "food orders history", "my food orders"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/my-food-orders",
    response: "Fetching your food orders and mess history 🍔..."
  },
  {
    intent: "ROOM_DETAILS",
    keywords: ["room details", "view room", "my room", "view-rooms", "room change", "room availability"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/view-rooms",
    response: "Opening the rooms and layout page for you 🛏️..."
  },
  {
    intent: "STUDENT_PROFILE",
    keywords: ["profile", "my profile", "my details", "student details"],
    roles: ["student"],
    action: "navigate",
    navigationPath: "/profile",
    response: "Opening your profile settings page..."
  },

  // ================= WARDEN INTENTS =================
  {
    intent: "PENDING_GATEPASS",
    keywords: ["pending gate passes", "approve gate pass", "reject gate pass", "outpass approval", "approve gatepasses"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/outpass-approval",
    response: "Loading pending gate pass and outpass approvals for you..."
  },
  {
    intent: "STUDENT_LIST",
    keywords: ["student list", "students", "manage students", "student details"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/students",
    response: "Opening the Manage Students portal..."
  },
  {
    intent: "ENROLL_STUDENT",
    keywords: ["enroll student", "new student", "add student", "register student"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/enroll-student",
    response: "Loading student enrollment form..."
  },
  {
    intent: "WARDEN_ATTENDANCE",
    keywords: ["attendance", "attendence", "student attendance", "mark attendance"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/attendance",
    response: "Opening the student attendance management system 📝..."
  },
  {
    intent: "ROOM_ALLOTMENT",
    keywords: ["room allotment", "allot room", "manage rooms", "rooms list"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/room-allotment",
    response: "Sure, loading Room Allotments..."
  },
  {
    intent: "CREATE_ROOM",
    keywords: ["create room", "add room", "new room"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/create-room",
    response: "Opening the Create Room screen..."
  },
  {
    intent: "VIEW_LAYOUT",
    keywords: ["view layout", "hostel layout", "building layout"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/view-layout",
    response: "Opening the hostel floor view and layout..."
  },
  {
    intent: "APPROVE_ROOM_REQUESTS",
    keywords: ["room requests", "approve room requests", "change requests"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/approve-room-requests",
    response: "Loading student room allotment requests..."
  },
  {
    intent: "WARDEN_COMPLAINTS",
    keywords: ["complaints", "manage complaints", "complaint resolution"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/complaints",
    response: "Loading hostel complaints dashboard..."
  },
  {
    intent: "LEAVE_REQUESTS",
    keywords: ["leave requests", "student leaves", "approve leaves", "pending leaves"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/leave-requests",
    response: "Opening Student Leave Requests page..."
  },
  {
    intent: "WARDEN_DAY_RED",
    keywords: ["day reduction list", "warden-day-red", "day reductions"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/warden-day-red",
    response: "Opening student Day Reduction requests..."
  },
  {
    intent: "REBATES_LIST",
    keywords: ["rebates list", "rebate", "approve rebate", "manage rebates"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/rebate",
    response: "Loading student rebate applications..."
  },
  {
    intent: "MESS_BILLS",
    keywords: ["mess bills", "mess billing", "calculate bill", "bill list"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/mess-bills",
    response: "Opening Mess Bill Management system..."
  },
  {
    intent: "SUSPENSIONS",
    keywords: ["suspensions", "suspend student", "discipline", "suspension list"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/suspensions",
    response: "Opening Suspension Management screen..."
  },
  {
    intent: "HOLIDAYS",
    keywords: ["holidays", "hostel holidays", "declare holiday", "holiday list"],
    roles: ["warden"],
    action: "navigate",
    navigationPath: "/holidays",
    response: "Opening Holiday Management settings..."
  },

  // ================= MESS STAFF INTENTS =================
  {
    intent: "MESS_DASHBOARD",
    keywords: ["mess dashboard", "mess home", "mess main"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/dashboard",
    response: "Opening Mess Staff Dashboard..."
  },
  {
    intent: "MANAGE_MENUS",
    keywords: ["menus", "manage menus", "update menu", "edit menu", "food menus"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/menus",
    response: "Opening Menu Management..."
  },
  {
    intent: "CREATE_MENU",
    keywords: ["create menu", "add menu", "new menu"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/create-menu",
    response: "Opening the Create Menu wizard..."
  },
  {
    intent: "RECIPE_MANAGEMENT",
    keywords: ["recipe", "create recipe", "recipes", "food recipe"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/recipe",
    response: "Opening Recipe Management..."
  },
  {
    intent: "MENU_PLANNER",
    keywords: ["menu planner", "plan menu", "weekly plan"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/menu-planner",
    response: "Loading Menu Planner..."
  },
  {
    intent: "MENU_SCHEDULE",
    keywords: ["menu schedule", "scheduled menus", "meal times"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/menu-schedule",
    response: "Opening Menu Schedule Management..."
  },
  {
    intent: "ITEM_MANAGEMENT",
    keywords: ["items", "manage items", "food items", "add items"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/items",
    response: "Opening Item Management portal..."
  },
  {
    intent: "STOCK_MANAGEMENT",
    keywords: ["stock", "stock management", "inventory level", "kitchen stock", "inventory"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/stock",
    response: "Opening Stock Management..."
  },
  {
    intent: "DAILY_MEAL_COUNT",
    keywords: ["daily meal entry", "meal count", "single page daily entry", "single-page meal entry", "single-page-daily-entry"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/single-page-daily-entry",
    response: "Opening Single-Page Meal Entry sheet..."
  },
  {
    intent: "PURCHASE_ORDERS",
    keywords: ["purchase orders", "purchase order", "supplier order", "po"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/purchase-orders",
    response: "Opening Purchase Orders portal..."
  },
  {
    intent: "RECORD_CONSUMPTION",
    keywords: ["record consumption", "consumption log", "use stock", "adhoc consumption"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/record-consumption",
    response: "Opening Record Consumption portal..."
  },
  {
    intent: "MESS_REPORTS",
    keywords: ["consumption report", "daily expenses", "daily rate report", "mess reports", "reports"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/consumption-report",
    response: "Opening Mess Reports dashboard..."
  },
  {
    intent: "MESS_EXPENSES",
    keywords: ["Daily-expenses", "daily expenses", "mess expense", "spendings"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/Daily-expenses",
    response: "Opening Daily Expenses tracker..."
  },
  {
    intent: "MESS_FEE_SUMMARY",
    keywords: ["mess fee", "mess-fee", "mess billing status"],
    roles: ["mess"],
    action: "navigate",
    navigationPath: "/mess-fee",
    response: "Loading Mess Fee Summary database..."
  },

  // ================= ADMIN INTENTS =================
  {
    intent: "ADMIN_DASHBOARD",
    keywords: ["dashboard", "admin dashboard", "analytics", "overview", "home"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/dashboard",
    response: "Sure! Heading over to the Admin Dashboard overview page..."
  },
  {
    intent: "MANAGE_HOSTELS_ADMIN",
    keywords: ["hostels", "manage hostels", "hostel list"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/hostels",
    response: "Opening Hostels Management portal..."
  },
  {
    intent: "CREATE_HOSTEL_ADMIN",
    keywords: ["create hostel", "add hostel", "new hostel"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/create-hostel",
    response: "Opening Create Hostel portal..."
  },
  {
    intent: "ROOM_MANAGEMENT_ADMIN",
    keywords: ["room management", "manage rooms", "rooms setup", "hostel blocks", "blocks"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/room-management",
    response: "Opening Room Management tabs..."
  },
  {
    intent: "DAYS_REDUCTION_ADMIN",
    keywords: ["days reduction admin", "days-reduc", "day reductions admin"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/days-reduc",
    response: "Opening Day Reduction requests approval dashboard..."
  },
  {
    intent: "CREATE_USER_ADMIN",
    keywords: ["create user", "add user", "new user", "wardens", "mess staff", "mess staff add"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/create-user",
    response: "Opening Create User Form..."
  },
  {
    intent: "MANAGE_SESSIONS",
    keywords: ["sessions", "manage sessions", "academic sessions", "session settings"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/sessions",
    response: "Opening Academic Sessions setup..."
  },
  {
    intent: "OUTPASS_LOGS_ADMIN",
    keywords: ["outpass logs", "outpass-logs", "gate logs"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/outpass-logs",
    response: "Opening Outpass & Gate Pass security logs..."
  },
  {
    intent: "FACILITIES_ADMIN",
    keywords: ["facilities", "facility types", "manage facilities", "facility-types"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/facilities",
    response: "Opening Hostel Facilities manager..."
  },
  {
    intent: "MAINTENANCE_ADMIN",
    keywords: ["maintenance", "repairs", "hostel maintenance"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/maintenance",
    response: "Opening Maintenance request and allocation portal..."
  },
  {
    intent: "FINANCIAL_TYPES_ADMIN",
    keywords: ["income types", "expense types", "income-types", "expense-types", "payments"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/income-types",
    response: "Opening Financial Income and Expense categories configuration..."
  },
  {
    intent: "UOMS_ADMIN",
    keywords: ["uoms", "units of measure", "units"],
    roles: ["admin"],
    action: "navigate",
    navigationPath: "/uoms",
    response: "Opening Units of Measure configuration..."
  }
];

export const getQuickActionsForRole = (role) => {
  if (!role) return [];
  const normRole = role === 'lapc' ? 'student' : role.toLowerCase().trim();

  switch (normRole) {
    case 'student':
      return [
        { label: "Apply Gate Pass", text: "gate pass" },
        { label: "Mess Menu", text: "mess menu" },
        { label: "Complaint", text: "complaint" },
        { label: "Fees", text: "fees" },
        { label: "My Leaves", text: "my leaves" }
      ];
    case 'warden':
      return [
        { label: "📅 Today's Highlights", text: "today highlights" },
        { label: "📊 Attendance", text: "attendance summary" },
        { label: "📋 Complaints", text: "complaint summary" },
        { label: "🚪 Gate Passes", text: "gate pass summary" },
        { label: "📄 Leave Requests", text: "leave summary" },
        { label: "🔍 Search Student", text: "search student" }
      ];
    case 'mess':
      return [
        { label: "Today's Menu", text: "menus" },
        { label: "Meal Count", text: "daily meal entry" },
        { label: "Stock Management", text: "stock" },
        { label: "Daily Expenses", text: "Daily-expenses" }
      ];
    case 'admin':
      return [
        { label: "Dashboard", text: "dashboard" },
        { label: "Manage Rooms", text: "room management" },
        { label: "Create User", text: "create user" },
        { label: "Outpass Logs", text: "outpass logs" }
      ];
    default:
      return [];
  }
};

export const getSuggestionsForRole = (role) => {
  if (!role) return ["Gate Pass", "Complaint", "Fees", "Mess Menu", "Attendance"];
  const normRole = role === 'lapc' ? 'student' : role.toLowerCase().trim();

  switch (normRole) {
    case 'student':
      return ["Gate Pass", "Complaint", "Fees", "Mess Menu", "Room Details"];
    case 'warden':
      return ["Today highlights", "Attendance summary", "Complaint summary", "Gate pass summary", "Leave requests", "Search student"];
    case 'mess':
      return ["Menus", "Daily Meal Entry", "Stock", "Reports"];
    case 'admin':
      return ["Dashboard", "Manage Rooms", "Create User", "Outpass Logs"];
    default:
      return ["Gate Pass", "Complaint", "Fees", "Mess Menu", "Attendance"];
  }
};
