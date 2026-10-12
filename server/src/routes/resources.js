import { Router } from 'express'
import {
  Announcement, Attendance, Complaint, Fee, MessMenu, Payment, Room, Student, User, Visitor,
} from '../models/index.js'
import { authorize } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../utils/errors.js'

export const resourceRouter = Router()
const adminOnly = authorize('admin')
const allowed = {
  students: ['studentId', 'name', 'email', 'phone', 'department', 'academicYear', 'guardianContact', 'joiningDate', 'room', 'password', 'status'],
  rooms: ['roomNumber', 'floor', 'capacity', 'type', 'status'],
  fees: ['student', 'month', 'amount', 'dueDate'],
  attendance: ['student', 'date', 'status', 'note'],
  complaints: ['category', 'subject', 'description', 'priority', 'room', 'status', 'response'],
  mess: ['day', 'meal', 'items'],
  visitors: ['visitorName', 'phone', 'student', 'purpose', 'checkIn', 'checkOut'],
  announcements: ['title', 'category', 'body', 'expiresAt'],
}

function pick(source, fields) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new AppError(400, 'The request body must be an object.')
  const unsupported = Object.keys(source).find(key => !fields.includes(key))
  if (unsupported) throw new AppError(400, `Unsupported field: ${unsupported}.`)
  const values = {}
  for (const key of fields) if (Object.hasOwn(source, key)) values[key] = source[key]
  return values
}

function currentStudentFilter(user) {
  if (!user.student) throw new AppError(403, 'This account is not linked to a resident profile.')
  return user.student
}

function normalizeDate(value, field) {
  if (!value) return value
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) throw new AppError(400, `${field} must be a valid date.`)
  return date
}

function feeStatus(amount, paidAmount, dueDate) {
  if (paidAmount >= amount) return 'Paid'
  if (paidAmount > 0) return 'Partially paid'
  return new Date(dueDate) < new Date(new Date().toDateString()) ? 'Overdue' : 'Pending'
}

async function reserveRoom(roomId) {
  if (!roomId) return null
  const room = await Room.findOneAndUpdate(
    { _id: roomId, status: { $ne: 'Maintenance' }, $expr: { $lt: ['$occupiedBeds', '$capacity'] } },
    { $inc: { occupiedBeds: 1 } },
    { new: true, runValidators: true },
  )
  if (!room) throw new AppError(409, 'That room is unavailable, under maintenance, or at capacity.')
  if (room.occupiedBeds >= room.capacity) {
    room.status = 'Full'
    await room.save()
  }
  return room
}

async function releaseRoom(roomId) {
  if (!roomId) return
  await Room.updateOne({ _id: roomId, occupiedBeds: { $gt: 0 } }, { $inc: { occupiedBeds: -1 } })
}

async function validateStudent(studentId) {
  if (!studentId) throw new AppError(400, 'Select a resident.')
  const student = await Student.findOne({ _id: studentId, isActive: true })
  if (!student) throw new AppError(400, 'The selected resident does not exist or is inactive.')
  return student
}

async function createStudent(req, res) {
  const input = pick(req.body, allowed.students)
  for (const key of ['studentId', 'name', 'email', 'phone', 'department', 'academicYear', 'guardianContact', 'joiningDate', 'password']) {
    if (typeof input[key] !== 'string' || !input[key].trim()) throw new AppError(400, `${key} is required.`)
  }
  if (input.password.length < 12) throw new AppError(400, 'The initial password must be at least 12 characters.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new AppError(400, 'Enter a valid email address.')
  let reservedRoom = null
  let user
  let student
  try {
    if (input.room) reservedRoom = await reserveRoom(input.room)
    const passwordHash = await User.hashPassword(input.password)
    user = await User.create({
      name: input.name.trim(),
      username: input.studentId.trim().toLowerCase(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: 'student',
    })
    student = await Student.create({
      ...input,
      password: undefined,
      room: reservedRoom?._id || null,
      joiningDate: normalizeDate(input.joiningDate, 'Joining date'),
      user: user._id,
    })
    user.student = student._id
    await user.save()
    return res.status(201).json({ item: await Student.findById(student._id).populate('room', 'roomNumber status') })
  } catch (error) {
    if (student) await Student.findByIdAndDelete(student._id)
    if (reservedRoom) await releaseRoom(reservedRoom._id)
    if (user) await User.findByIdAndDelete(user._id)
    throw error
  }
}

async function updateStudent(id, req) {
  const input = pick(req.body, allowed.students.filter(key => key !== 'password'))
  const student = await Student.findById(id)
  if (!student) throw new AppError(404, 'Resident not found.')
  if (input.room !== undefined && String(input.room || '') !== String(student.room || '')) {
    const previousRoom = student.room
    let nextRoom = null
    try {
      if (input.room) nextRoom = await reserveRoom(input.room)
      student.room = nextRoom?._id || null
      delete input.room
      if (input.status !== undefined) student.isActive = input.status !== 'Inactive'
      for (const [key, value] of Object.entries(input)) if (key !== 'status') student[key] = value
      await student.save()
      await releaseRoom(previousRoom)
    } catch (error) {
      if (nextRoom) await releaseRoom(nextRoom._id)
      throw error
    }
  } else {
    if (input.status !== undefined) {
      student.isActive = input.status !== 'Inactive'
      delete input.status
    }
    Object.assign(student, input)
    await student.save()
  }
  if (input.email || input.name || input.status !== undefined) {
    await User.findByIdAndUpdate(student.user, {
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.status !== undefined ? { isActive: input.status !== 'Inactive' } : {}),
    }, { runValidators: true })
  }
  return Student.findById(student._id).populate('room', 'roomNumber status')
}

async function createFee(req, res) {
  const input = pick(req.body, allowed.fees)
  const student = await validateStudent(input.student)
  if (!input.month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new AppError(400, 'Billing month must use YYYY-MM format.')
  const amount = Number(input.amount)
  const paidAmount = 0
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError(400, 'The monthly fee must be greater than zero.')
  const dueDate = normalizeDate(input.dueDate, 'Due date')
  const fee = await Fee.create({ student: student._id, month: input.month, amount, paidAmount, dueDate, status: feeStatus(amount, paidAmount, dueDate) })
  return res.status(201).json({ item: await fee.populate('student', 'studentId name') })
}

async function updateFee(id, req) {
  const input = pick(req.body, ['month', 'amount', 'dueDate'])
  const fee = await Fee.findById(id)
  if (!fee) throw new AppError(404, 'Fee record not found.')
  const newAmount = input.amount === undefined ? fee.amount : Number(input.amount)
  if (!Number.isFinite(newAmount) || newAmount <= 0 || newAmount < fee.paidAmount) throw new AppError(400, 'The billed amount must be positive and cannot be less than payments already received.')
  if (input.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new AppError(400, 'Billing month must use YYYY-MM format.')
  if (input.dueDate) input.dueDate = normalizeDate(input.dueDate, 'Due date')
  Object.assign(fee, input, { amount: newAmount })
  fee.status = feeStatus(newAmount, fee.paidAmount, input.dueDate || fee.dueDate)
  await fee.save()
  return fee.populate('student', 'studentId name')
}

function populateFor(resource, query) {
  if (resource === 'students') return query.populate('room', 'roomNumber status')
  if (['fees', 'attendance'].includes(resource)) return query.populate({ path: 'student', select: 'studentId name room department', populate: { path: 'room', select: 'roomNumber' } })
  if (resource === 'complaints') return query.populate('student', 'studentId name').populate('room', 'roomNumber')
  if (resource === 'visitors') return query.populate('student', 'studentId name').populate('recordedBy', 'name')
  if (resource === 'announcements') return query.populate('author', 'name')
  return query
}

function present(resource, document) {
  const row = document.toObject ? document.toObject() : document
  if (row.student && typeof row.student === 'object') {
    row.studentName = row.student.name
    if (row.student.room && typeof row.student.room === 'object') row.roomNumber = row.student.room.roomNumber
  }
  if (row.room && typeof row.room === 'object') row.roomNumber ||= row.room.roomNumber
  if (row.author && typeof row.author === 'object') row.authorName = row.author.name
  if (resource === 'rooms' && row.status !== 'Maintenance') row.status = row.occupiedBeds >= row.capacity ? 'Full' : 'Available'
  if (resource === 'fees') {
    row.balance = Math.max(0, row.amount - row.paidAmount)
    row.status = feeStatus(row.amount, row.paidAmount, row.dueDate)
  }
  if (resource === 'students') row.status = row.isActive ? 'Active' : 'Inactive'
  return row
}

const definitions = {
  students: { model: Student, list: (user) => user.role === 'admin' ? {} : { user: user._id }, sort: { createdAt: -1 } },
  rooms: { model: Room, list: (user) => user.role === 'admin' ? {} : { _id: user.room || null }, sort: { roomNumber: 1 } },
  fees: { model: Fee, list: (user) => user.role === 'admin' ? {} : { student: currentStudentFilter(user) }, sort: { month: -1, createdAt: -1 } },
  attendance: { model: Attendance, list: (user) => user.role === 'admin' ? {} : { student: currentStudentFilter(user) }, sort: { date: -1 } },
  complaints: { model: Complaint, list: (user) => user.role === 'admin' ? {} : { student: currentStudentFilter(user) }, sort: { createdAt: -1 } },
  mess: { model: MessMenu, list: () => ({}), sort: { day: 1, meal: 1 } },
  visitors: { model: Visitor, list: (user) => user.role === 'admin' ? {} : { student: null }, sort: { checkIn: -1 } },
  announcements: { model: Announcement, list: () => ({ $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }] }), sort: { createdAt: -1 } },
}

resourceRouter.get('/payments', authorize('admin', 'student'), asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { student: currentStudentFilter(req.user) }
  const items = await Payment.find(filter).populate('student', 'studentId name').sort({ createdAt: -1 }).limit(500)
  res.json({ items: items.map(item => ({ ...item.toObject(), studentName: item.student?.name })) })
}))

resourceRouter.get('/:resource', asyncHandler(async (req, res) => {
  const { resource } = req.params
  if (!definitions[resource]) throw new AppError(404, 'This record type is not available.')
  if (resource === 'visitors' && req.user.role !== 'admin') throw new AppError(403, 'Visitor records are available to residence staff only.')
  const definition = definitions[resource]
  const filter = definition.list(req.user)
  if (req.query.status && resource === 'students' && req.user.role === 'admin') filter.isActive = req.query.status === 'Inactive' ? false : true
  if (resource === 'rooms' && req.user.role === 'student') {
    const student = await Student.findOne({ user: req.user._id }).select('room')
    filter._id = student?.room || null
  }
  let query = definition.model.find(filter).sort(definition.sort).limit(1000)
  query = populateFor(resource, query)
  const documents = await query
  let items = documents.map(document => present(resource, document))
  if (resource === 'fees' && documents.length) {
    const feeIds = documents.map(fee => fee._id)
    const recentPayments = await Payment.find({ fee: { $in: feeIds } }).sort({ createdAt: -1 }).select('fee method amount createdAt')
    const latestByFee = new Map()
    for (const payment of recentPayments) if (!latestByFee.has(String(payment.fee))) latestByFee.set(String(payment.fee), payment)
    items = items.map(item => ({ ...item, paymentMethod: latestByFee.get(String(item._id))?.method || '—', lastPaymentAmount: latestByFee.get(String(item._id))?.amount || 0 }))
  }
  res.json({ items })
}))

resourceRouter.post('/students', adminOnly, asyncHandler(createStudent))
resourceRouter.post('/fees', adminOnly, asyncHandler(createFee))
resourceRouter.post('/fees/:id/payments', adminOnly, asyncHandler(async (req, res) => {
  const { amount, method } = pick(req.body, ['amount', 'method'])
  const paymentAmount = Number(amount)
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) throw new AppError(400, 'Payment amount must be greater than zero.')
  if (!['Cash', 'UPI', 'Bank transfer', 'Card'].includes(method)) throw new AppError(400, 'Choose a valid payment method.')
  const fee = await Fee.findById(req.params.id)
  if (!fee) throw new AppError(404, 'Fee record not found.')
  const nextPaid = fee.paidAmount + paymentAmount
  if (nextPaid > fee.amount) throw new AppError(400, 'Payment exceeds the outstanding balance.')
  const nextStatus = feeStatus(fee.amount, nextPaid, fee.dueDate)
  const updatedFee = await Fee.findOneAndUpdate(
    { _id: fee._id, paidAmount: fee.paidAmount },
    { $set: { paidAmount: nextPaid, status: nextStatus } },
    { new: true, runValidators: true },
  )
  if (!updatedFee) throw new AppError(409, 'This fee was updated by another user. Refresh and try again.')
  try {
    const payment = await Payment.create({ student: fee.student, fee: fee._id, month: fee.month, amount: paymentAmount, method, recordedBy: req.user._id })
    res.status(201).json({ item: payment, fee: present('fees', updatedFee) })
  } catch (error) {
    await Fee.updateOne({ _id: fee._id, paidAmount: nextPaid }, { $set: { paidAmount: fee.paidAmount, status: fee.status } })
    throw error
  }
}))

resourceRouter.post('/:resource', asyncHandler(async (req, res) => {
  const { resource } = req.params
  if (!['rooms', 'attendance', 'complaints', 'mess', 'visitors', 'announcements'].includes(resource)) throw new AppError(404, 'This record type is not available.')
  const admin = req.user.role === 'admin'
  if (['rooms', 'attendance', 'visitors'].includes(resource) && !admin) throw new AppError(403, 'This action is reserved for residence staff.')
  if (resource === 'mess' && !admin) throw new AppError(403, 'Only residence staff can update the weekly menu.')
  if (resource === 'announcements' && !admin) throw new AppError(403, 'Only residence staff can publish announcements.')
  const input = pick(req.body, allowed[resource])
  let document
  if (resource === 'rooms') {
    if (Number(input.capacity) < 1) throw new AppError(400, 'Room capacity must be at least one.')
    document = await Room.create(input)
  } else if (resource === 'attendance') {
    const student = await validateStudent(input.student)
    const date = normalizeDate(input.date, 'Attendance date')
    date.setUTCHours(0, 0, 0, 0)
    document = await Attendance.create({ ...input, student: student._id, date, markedBy: req.user._id })
  } else if (resource === 'complaints') {
    let student
    let room
    if (admin) {
      student = await validateStudent(input.student)
      room = input.room || student.room
    } else {
      student = await Student.findOne({ user: req.user._id, isActive: true })
      if (!student) throw new AppError(403, 'This account is not linked to an active resident profile.')
      room = student.room
    }
    if (room) {
      const roomExists = await Room.exists({ _id: room })
      if (!roomExists) throw new AppError(400, 'The selected room does not exist.')
    }
    document = await Complaint.create({ ...input, student: student._id, room, status: 'Open', priority: admin ? input.priority : 'Normal' })
  } else if (resource === 'mess') {
    document = await MessMenu.create({ ...input, updatedBy: req.user._id })
  } else if (resource === 'visitors') {
    const student = await validateStudent(input.student)
    const checkIn = normalizeDate(input.checkIn, 'Check-in time')
    const checkOut = input.checkOut ? normalizeDate(input.checkOut, 'Check-out time') : null
    if (checkOut && checkOut < checkIn) throw new AppError(400, 'Check-out must be after check-in.')
    document = await Visitor.create({ ...input, student: student._id, checkIn, checkOut, recordedBy: req.user._id })
  } else {
    document = await Announcement.create({ ...input, author: req.user._id, expiresAt: input.expiresAt ? normalizeDate(input.expiresAt, 'Expiry date') : null })
  }
  const populated = await populateFor(resource, document.constructor.findById(document._id))
  res.status(201).json({ item: present(resource, await populated) })
}))

resourceRouter.put('/:resource/:id', adminOnly, asyncHandler(async (req, res) => {
  const { resource, id } = req.params
  if (!definitions[resource]) throw new AppError(404, 'This record type is not available.')
  let document
  if (resource === 'students') {
    document = await updateStudent(id, req)
  } else if (resource === 'fees') {
    document = await updateFee(id, req)
  } else {
    const model = definitions[resource].model
    document = await model.findById(id)
    if (!document) throw new AppError(404, `${resource.slice(0, -1)} record not found.`)
    const input = pick(req.body, allowed[resource])
    if (resource === 'rooms') {
      if (input.capacity !== undefined && Number(input.capacity) < document.occupiedBeds) throw new AppError(409, 'Room capacity cannot be lower than its occupied beds.')
      const status = input.status
      delete input.status
      const updated = await Room.findOneAndUpdate(
        { _id: id, ...(input.capacity !== undefined ? { occupiedBeds: { $lte: Number(input.capacity) } } : {}) },
        { $set: { ...input, ...(status !== undefined ? { status: status === 'Maintenance' ? 'Maintenance' : 'Available' } : {}) } },
        { new: true, runValidators: true },
      )
      if (!updated) throw new AppError(409, 'Room capacity cannot be lower than its occupied beds. Refresh and try again.')
      document = updated
    } else if (resource === 'attendance') {
      if (input.date) {
        input.date = normalizeDate(input.date, 'Attendance date')
        input.date.setUTCHours(0, 0, 0, 0)
      }
      if (input.student) await validateStudent(input.student)
      Object.assign(document, input)
    } else if (resource === 'complaints') {
      if (Object.hasOwn(input, 'student') || Object.hasOwn(input, 'room')) throw new AppError(400, 'Complaint ownership and room cannot be changed.')
      Object.assign(document, input)
    } else if (resource === 'mess') {
      Object.assign(document, input, { updatedBy: req.user._id })
    } else if (resource === 'visitors') {
      if (input.student) await validateStudent(input.student)
      if (input.checkIn) input.checkIn = normalizeDate(input.checkIn, 'Check-in time')
      if (input.checkOut) input.checkOut = normalizeDate(input.checkOut, 'Check-out time')
      if ((input.checkOut || document.checkOut) && (input.checkOut || document.checkOut) < (input.checkIn || document.checkIn)) throw new AppError(400, 'Check-out must be after check-in.')
      Object.assign(document, input, { recordedBy: req.user._id })
    } else {
      if (input.expiresAt) input.expiresAt = normalizeDate(input.expiresAt, 'Expiry date')
      Object.assign(document, input)
    }
    await document.save()
    document = await populateFor(resource, model.findById(document._id))
  }
  res.json({ item: present(resource, await document) })
}))

resourceRouter.delete('/:resource/:id', adminOnly, asyncHandler(async (req, res) => {
  const { resource, id } = req.params
  if (!definitions[resource]) throw new AppError(404, 'This record type is not available.')
  if (resource === 'students') {
    const student = await Student.findById(id)
    if (!student) throw new AppError(404, 'Resident not found.')
    student.isActive = false
    const assignedRoom = student.room
    student.room = null
    await student.save()
    await User.findByIdAndUpdate(student.user, { isActive: false })
    await releaseRoom(assignedRoom)
  } else if (resource === 'rooms') {
    const room = await Room.findById(id)
    if (!room) throw new AppError(404, 'Room not found.')
    if (room.occupiedBeds > 0) throw new AppError(409, 'A room with assigned residents cannot be deleted. Transfer the residents first.')
    await Room.findByIdAndDelete(id)
  } else if (resource === 'fees') {
    if (await Payment.exists({ fee: id })) throw new AppError(409, 'Fee records with payment history cannot be deleted.')
    const result = await Fee.findByIdAndDelete(id)
    if (!result) throw new AppError(404, 'Fee record not found.')
  } else {
    const result = await definitions[resource].model.findByIdAndDelete(id)
    if (!result) throw new AppError(404, `${resource.slice(0, -1)} record not found.`)
  }
  res.status(204).end()
}))
