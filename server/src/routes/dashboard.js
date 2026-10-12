import { Router } from 'express'
import {
  Announcement, Attendance, Complaint, Fee, Payment, Room, Student,
} from '../models/index.js'
import { AppError, asyncHandler } from '../utils/errors.js'

export const dashboardRouter = Router()

dashboardRouter.get('/summary', asyncHandler(async (req, res) => {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)
  const attendanceStart = new Date(todayStart)
  attendanceStart.setUTCDate(attendanceStart.getUTCDate() - 6)

  if (req.user.role === 'student') {
    const student = await Student.findOne({ user: req.user._id, isActive: true }).populate('room', 'roomNumber floor type status capacity occupiedBeds')
    if (!student) throw new AppError(403, 'This account is not linked to an active resident profile.')
    const [fees, payments, attendances, openComplaints, announcements, attended] = await Promise.all([
      Fee.find({ student: student._id }).sort({ month: -1 }).limit(24),
      Payment.find({ student: student._id }).sort({ createdAt: -1 }).limit(8),
      Attendance.countDocuments({ student: student._id }),
      Complaint.countDocuments({ student: student._id, status: { $ne: 'Resolved' } }),
      Announcement.find({ $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] }).sort({ createdAt: -1 }).limit(4),
      Attendance.countDocuments({ student: student._id, status: 'Present' }),
    ])
    const feeBalance = fees.reduce((sum, fee) => sum + Math.max(0, fee.amount - fee.paidAmount), 0)
    const nextDue = fees.filter(fee => fee.amount > fee.paidAmount).sort((a, b) => a.dueDate - b.dueDate)[0]?.dueDate
    res.json({
      student: {
        studentId: student.studentId, name: student.name, department: student.department,
        academicYear: student.academicYear, roomNumber: student.room?.roomNumber || null,
        roomType: student.room?.type || null, roomStatus: student.room?.status || null,
      },
      stats: {
        feeBalance,
        nextDue: nextDue || null,
        attendanceRate: attendances ? Math.round((attended / attendances) * 100) : 0,
        openComplaints,
      },
      payments: payments.map(item => ({ ...item.toObject(), method: item.method })),
      fees: fees.map(item => ({ ...item.toObject(), balance: Math.max(0, item.amount - item.paidAmount) })),
      announcements,
    })
    return
  }

  const [
    students, rooms, roomRows, feeRows, pendingFeeCount, monthlyCollection,
    presentToday, attendanceMarked, complaintCount, recentStudents, payments, announcements, revenueRows, attendanceRows,
  ] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    Room.countDocuments(),
    Room.find().select('capacity occupiedBeds status'),
    Fee.find().select('amount paidAmount dueDate'),
    Fee.countDocuments({ $expr: { $lt: ['$paidAmount', '$amount'] } }),
    Payment.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
    Attendance.countDocuments({ date: { $gte: todayStart, $lt: todayEnd }, status: 'Present' }),
    Attendance.countDocuments({ date: { $gte: todayStart, $lt: todayEnd } }),
    Complaint.countDocuments({ status: { $ne: 'Resolved' } }),
    Student.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).select('studentId name department createdAt'),
    Payment.find().populate('student', 'name studentId').sort({ createdAt: -1 }).limit(5),
    Announcement.find({ $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] }).populate('author', 'name').sort({ createdAt: -1 }).limit(5),
    Payment.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, amount: { $sum: '$amount' } } },
    ]),
    Attendance.aggregate([
      { $match: { date: { $gte: attendanceStart, $lt: todayEnd } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } } } },
    ]),
  ])
  const occupiedBeds = roomRows.reduce((sum, room) => sum + room.occupiedBeds, 0)
  const totalBeds = roomRows.reduce((sum, room) => sum + room.capacity, 0)
  const roomData = {
    occupied: occupiedBeds,
    available: roomRows.filter(room => room.status !== 'Maintenance').reduce((sum, room) => sum + Math.max(0, room.capacity - room.occupiedBeds), 0),
    maintenance: roomRows.filter(room => room.status === 'Maintenance').reduce((sum, room) => sum + room.capacity, 0),
  }
  const revenueMap = new Map(revenueRows.map(row => [`${row._id.year}-${row._id.month}`, row.amount]))
  const revenue = Array.from({ length: 6 }, (_, offset) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + offset, 1))
    const key = `${month.getUTCFullYear()}-${month.getUTCMonth() + 1}`
    return { month: new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(month), amount: revenueMap.get(key) || 0 }
  })
  const attendanceMap = new Map(attendanceRows.map(row => [row._id, row]))
  const attendance = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(attendanceStart)
    date.setUTCDate(date.getUTCDate() + offset)
    const key = date.toISOString().slice(0, 10)
    const row = attendanceMap.get(key)
    return {
      day: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(date),
      percentage: row?.total ? Math.round((row.present / row.total) * 100) : 0,
    }
  })
  res.json({
    stats: {
      students, rooms, occupiedBeds,
      availableBeds: roomData.available,
      pendingFees: feeRows.reduce((sum, fee) => sum + Math.max(0, fee.amount - fee.paidAmount), 0),
      pendingFeeCount,
      monthlyCollection: monthlyCollection[0]?.amount || 0,
      attendanceToday: attendanceMarked ? Math.round((presentToday / attendanceMarked) * 100) : 0,
      pendingComplaints: complaintCount,
      occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    },
    occupancy: [
      { name: 'Occupied', value: roomData.occupied },
      { name: 'Available', value: roomData.available },
      { name: 'Maintenance', value: roomData.maintenance },
    ],
    revenue,
    attendance,
    recentStudents,
    payments: payments.map(payment => ({ ...payment.toObject(), studentName: payment.student?.name })),
    announcements,
  })
}))
