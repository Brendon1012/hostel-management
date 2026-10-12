export const adminNavigation = [
  { label: 'Overview', path: '/portal', icon: 'LayoutDashboard' },
  { label: 'People & rooms', section: true },
  { label: 'Students', path: '/portal/students', icon: 'Users', resource: 'students' },
  { label: 'Rooms', path: '/portal/rooms', icon: 'BedDouble', resource: 'rooms' },
  { label: 'Operations', section: true },
  { label: 'Fee management', path: '/portal/fees', icon: 'WalletCards', resource: 'fees' },
  { label: 'Attendance', path: '/portal/attendance', icon: 'CalendarCheck', resource: 'attendance' },
  { label: 'Complaints', path: '/portal/complaints', icon: 'MessageSquareWarning', resource: 'complaints' },
  { label: 'Mess menu', path: '/portal/mess', icon: 'Utensils', resource: 'mess' },
  { label: 'Visitors', path: '/portal/visitors', icon: 'ContactRound', resource: 'visitors' },
  { label: 'Announcements', path: '/portal/announcements', icon: 'Megaphone', resource: 'announcements' },
  { label: 'Reports', path: '/portal/reports', icon: 'ChartNoAxesCombined' },
]

export const studentNavigation = [
  { label: 'My dashboard', path: '/portal/student', icon: 'LayoutDashboard' },
  { label: 'My fees', path: '/portal/fees', icon: 'WalletCards', resource: 'fees' },
  { label: 'My attendance', path: '/portal/attendance', icon: 'CalendarCheck', resource: 'attendance' },
  { label: 'My complaints', path: '/portal/complaints', icon: 'MessageSquareWarning', resource: 'complaints' },
  { label: 'Weekly menu', path: '/portal/mess', icon: 'Utensils', resource: 'mess' },
  { label: 'Announcements', path: '/portal/announcements', icon: 'Megaphone', resource: 'announcements' },
]

export const modules = {
  students: {
    title: 'Student management', singular: 'student', description: 'The people who make JMR a community.',
    fields: [
      ['studentId', 'Student ID', 'text', true], ['name', 'Full name', 'text', true], ['email', 'Email address', 'email', true],
      ['phone', 'Phone', 'tel', true], ['department', 'Department', 'text', true], ['academicYear', 'Academic year', 'text', true],
      ['guardianContact', 'Guardian contact', 'tel', true], ['joiningDate', 'Joining date', 'date', true], ['room', 'Room', 'select:rooms', false], ['password', 'Initial sign-in password', 'password', true],
    ],
    columns: [['studentId', 'Student ID'], ['name', 'Name'], ['department', 'Department'], ['roomNumber', 'Room'], ['phone', 'Phone'], ['status', 'Status']],
    searchable: ['studentId', 'name', 'email', 'department'],
  },
  rooms: {
    title: 'Room management', singular: 'room', description: 'Comfortable spaces, thoughtfully managed.',
    fields: [['roomNumber', 'Room number', 'text', true], ['floor', 'Floor', 'number', true], ['capacity', 'Bed capacity', 'number', true], ['type', 'Room type', 'select:roomTypes', true], ['status', 'Room status', 'select:roomStatuses', true]],
    columns: [['roomNumber', 'Room'], ['floor', 'Floor'], ['capacity', 'Capacity'], ['occupiedBeds', 'Occupied'], ['status', 'Status']],
    searchable: ['roomNumber', 'type'],
  },
  fees: {
    title: 'Fee management', singular: 'fee record', description: 'Clear balances and a complete payment history.',
    fields: [['student', 'Student', 'select:students', true], ['month', 'Billing month (YYYY-MM)', 'month', true], ['amount', 'Monthly fee (₹)', 'number', true], ['dueDate', 'Due date', 'date', true]],
    columns: [['studentName', 'Student'], ['month', 'Month'], ['amount', 'Billed'], ['paidAmount', 'Paid'], ['balance', 'Balance'], ['paymentMethod', 'Last payment'], ['status', 'Status']],
    searchable: ['studentName', 'month', 'status'],
  },
  attendance: {
    title: 'Attendance', singular: 'attendance record', description: 'A clear daily record of resident wellbeing.',
    fields: [['student', 'Student', 'select:students', true], ['date', 'Date', 'date', true], ['status', 'Status', 'select:attendanceStatuses', true], ['note', 'Note', 'text', false]],
    columns: [['studentName', 'Student'], ['date', 'Date'], ['status', 'Status'], ['note', 'Note']],
    searchable: ['studentName', 'date', 'status'],
  },
  complaints: {
    title: 'Complaints & maintenance', singular: 'complaint', description: 'Every concern deserves a thoughtful response.',
    fields: [['category', 'Category', 'select:complaintCategories', true], ['subject', 'Subject', 'text', true], ['description', 'Details', 'textarea', true], ['priority', 'Priority', 'select:priorities', true], ['room', 'Room', 'select:rooms', false], ['status', 'Status', 'select:complaintStatuses', false], ['response', 'Admin response', 'textarea', false]],
    columns: [['subject', 'Subject'], ['studentName', 'Resident'], ['category', 'Category'], ['priority', 'Priority'], ['status', 'Status'], ['createdAt', 'Submitted']],
    searchable: ['subject', 'studentName', 'category', 'status'],
  },
  mess: {
    title: 'Weekly mess menu', singular: 'menu item', description: 'Good food, made fresh and served daily.',
    fields: [['day', 'Day of week', 'select:weekdays', true], ['meal', 'Meal', 'select:mealTypes', true], ['items', 'Menu items', 'text', true]],
    columns: [['day', 'Day'], ['meal', 'Meal'], ['items', 'Menu items']],
    searchable: ['day', 'meal', 'items'],
  },
  visitors: {
    title: 'Visitor register', singular: 'visitor', description: 'A welcoming visit, recorded responsibly.',
    fields: [['visitorName', 'Visitor name', 'text', true], ['phone', 'Phone', 'tel', true], ['student', 'Student visited', 'select:students', true], ['purpose', 'Purpose', 'text', true], ['checkIn', 'Check-in time', 'datetime-local', true], ['checkOut', 'Check-out time', 'datetime-local', false]],
    columns: [['visitorName', 'Visitor'], ['studentName', 'Visiting'], ['purpose', 'Purpose'], ['checkIn', 'Checked in'], ['checkOut', 'Checked out']],
    searchable: ['visitorName', 'studentName', 'purpose'],
  },
  announcements: {
    title: 'Announcements', singular: 'announcement', description: 'Keep every resident in the loop.',
    fields: [['title', 'Headline', 'text', true], ['category', 'Category', 'select:announcementCategories', true], ['body', 'Announcement', 'textarea', true], ['expiresAt', 'Expiry date', 'date', false]],
    columns: [['title', 'Headline'], ['category', 'Category'], ['authorName', 'Published by'], ['createdAt', 'Published']],
    searchable: ['title', 'category', 'body'],
  },
}

export const options = {
  roomTypes: ['Single', 'Double', 'Shared'],
  roomStatuses: ['Available', 'Full', 'Maintenance'],
  paymentMethods: ['Cash', 'UPI', 'Bank transfer', 'Card'],
  attendanceStatuses: ['Present', 'Absent', 'On Leave'],
  complaintCategories: ['Room', 'Water', 'Electricity', 'Cleaning', 'Food', 'Other'],
  priorities: ['Low', 'Normal', 'High', 'Urgent'],
  complaintStatuses: ['Open', 'In progress', 'Resolved'],
  weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  mealTypes: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
  announcementCategories: ['General', 'Fee deadline', 'Maintenance', 'Event'],
}
