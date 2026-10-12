import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const { Schema, model } = mongoose

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'student'], required: true },
  student: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true })

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash)
}
userSchema.statics.hashPassword = (password) => bcrypt.hash(password, 12)

const studentSchema = new Schema({
  studentId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { type: String, required: true, trim: true, match: /^\+?[0-9\s().-]{7,20}$/ },
  department: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true, trim: true },
  guardianContact: { type: String, required: true, trim: true, match: /^\+?[0-9\s().-]{7,20}$/ },
  joiningDate: { type: Date, required: true },
  room: { type: Schema.Types.ObjectId, ref: 'Room', default: null },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const roomSchema = new Schema({
  roomNumber: { type: String, required: true, unique: true, trim: true },
  floor: { type: Number, required: true, min: 0 },
  capacity: { type: Number, required: true, min: 1, max: 100 },
  occupiedBeds: { type: Number, default: 0, min: 0 },
  type: { type: String, enum: ['Single', 'Double', 'Shared'], required: true },
  status: { type: String, enum: ['Available', 'Full', 'Maintenance'], default: 'Available' },
}, { timestamps: true })

const feeSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  amount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Paid', 'Partially paid', 'Pending', 'Overdue'], default: 'Pending' },
}, { timestamps: true })
feeSchema.index({ student: 1, month: 1 }, { unique: true })

const paymentSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  fee: { type: Schema.Types.ObjectId, ref: 'Fee', required: true },
  month: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: ['Cash', 'UPI', 'Bank transfer', 'Card'], required: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const attendanceSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'On Leave'], required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })
attendanceSchema.index({ student: 1, date: 1 }, { unique: true })

const complaintSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  room: { type: Schema.Types.ObjectId, ref: 'Room', default: null },
  category: { type: String, enum: ['Room', 'Water', 'Electricity', 'Cleaning', 'Food', 'Other'], required: true },
  subject: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
  status: { type: String, enum: ['Open', 'In progress', 'Resolved'], default: 'Open' },
  response: { type: String, trim: true, maxlength: 3000, default: '' },
}, { timestamps: true })

const messMenuSchema = new Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  meal: { type: String, enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'], required: true },
  items: { type: String, required: true, trim: true, maxlength: 500 },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })
messMenuSchema.index({ day: 1, meal: 1 }, { unique: true })

const visitorSchema = new Schema({
  visitorName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, match: /^\+?[0-9\s().-]{7,20}$/ },
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  purpose: { type: String, required: true, trim: true, maxlength: 300 },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const announcementSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  category: { type: String, enum: ['General', 'Fee deadline', 'Maintenance', 'Event'], required: true },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  expiresAt: { type: Date, default: null },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export const User = model('User', userSchema)
export const Student = model('Student', studentSchema)
export const Room = model('Room', roomSchema)
export const Fee = model('Fee', feeSchema)
export const Payment = model('Payment', paymentSchema)
export const Attendance = model('Attendance', attendanceSchema)
export const Complaint = model('Complaint', complaintSchema)
export const MessMenu = model('MessMenu', messMenuSchema)
export const Visitor = model('Visitor', visitorSchema)
export const Announcement = model('Announcement', announcementSchema)
