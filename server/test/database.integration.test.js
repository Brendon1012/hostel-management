import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { app } from '../src/app.js'
import { Attendance, Fee, MessMenu, Room, Student, User } from '../src/models/index.js'

const testUri = process.env.MONGODB_TEST_URI
const safeTestDatabase = (() => {
  if (!testUri) return false
  try {
    const name = new URL(testUri).pathname.replace(/^\//, '')
    return /(^|[_-])test([_-]|$)/i.test(name)
  } catch {
    return false
  }
})()

describe('MongoDB-backed JMR management flows', { skip: !safeTestDatabase }, () => {
  let server
  let origin
  let adminToken
  let residentToken
  let otherResidentToken
  let residentId
  let otherResidentId
  const secret = 'test-only-signing-key-at-least-32-characters-long'
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  async function request(path, { token = adminToken, method = 'GET', body } = {}) {
    const response = await fetch(`${origin}/api${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: response.status === 204 ? null : await response.json() }
  }

  async function createResident(studentId, room) {
    const response = await request('/students', {
      method: 'POST',
      body: {
        studentId,
        name: `Resident ${studentId}`,
        email: `${studentId.toLowerCase()}@example.test`,
        phone: '+91 9876543210',
        department: 'Design',
        academicYear: 'Year 1',
        guardianContact: '+91 9876543211',
        joiningDate: '2026-06-01',
        password: 'TestPassword12345',
        ...(room ? { room } : {}),
      },
    })
    assert.equal(response.status, 201, response.body?.message)
    return response.body.item._id
  }

  before(async () => {
    process.env.JWT_SECRET = secret
    process.env.CLIENT_ORIGIN = 'http://localhost:5173'
    await mongoose.connect(testUri)
    await mongoose.connection.dropDatabase()
    await Promise.all([User.init(), Student.init(), Room.init(), Fee.init(), Attendance.init(), MessMenu.init()])
    await User.create({
      name: 'Test Administrator',
      username: `admin-${suffix}`,
      email: `admin-${suffix}@example.test`,
      passwordHash: await User.hashPassword('AdminTestPassword12345'),
      role: 'admin',
    })
    server = app.listen(0, '127.0.0.1')
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    origin = `http://127.0.0.1:${server.address().port}`
    const login = await request('/auth/login', { token: null, method: 'POST', body: { identifier: `admin-${suffix}`, password: 'AdminTestPassword12345' } })
    assert.equal(login.status, 200, login.body?.message)
    adminToken = login.body.token
  })

  after(async () => {
    if (server) {
      server.closeAllConnections()
      await new Promise(resolve => server.close(resolve))
    }
    if (mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    }
  })

  test('keeps room capacity, billing, attendance, and student ownership consistent', async () => {
    const room = await request('/rooms', { method: 'POST', body: { roomNumber: `T-${suffix}`, floor: 1, capacity: 1, type: 'Single', status: 'Available' } })
    assert.equal(room.status, 201, room.body?.message)
    const roomId = room.body.item._id
    residentId = await createResident(`S${suffix.slice(-6)}A`, roomId)
    const overCapacity = await request('/students', {
      method: 'POST',
      body: {
        studentId: `X${suffix.slice(-6)}`, name: 'Full Room Attempt', email: `full-${suffix}@example.test`,
        phone: '+91 9876543212', department: 'Design', academicYear: 'Year 1',
        guardianContact: '+91 9876543213', joiningDate: '2026-06-01',
        password: 'TestPassword12345', room: roomId,
      },
    })
    assert.equal(overCapacity.status, 409)
    const fullRoom = await request('/rooms')
    assert.equal(fullRoom.body.items.find(item => item._id === roomId).occupiedBeds, 1)
    assert.equal(fullRoom.body.items.find(item => item._id === roomId).status, 'Full')

    otherResidentId = await createResident(`S${suffix.slice(-6)}B`)
    const firstResident = await request(`/students`)
    const studentId = firstResident.body.items.find(item => item._id === residentId).studentId
    const secondStudentId = firstResident.body.items.find(item => item._id === otherResidentId).studentId
    const studentLogin = await request('/auth/login', { token: null, method: 'POST', body: { identifier: `${studentId.toLowerCase()}@example.test`, password: 'TestPassword12345' } })
    assert.equal(studentLogin.status, 200, studentLogin.body?.message)
    residentToken = studentLogin.body.token
    const otherLogin = await request('/auth/login', { token: null, method: 'POST', body: { identifier: `${secondStudentId.toLowerCase()}@example.test`, password: 'TestPassword12345' } })
    assert.equal(otherLogin.status, 200, otherLogin.body?.message)
    otherResidentToken = otherLogin.body.token

    const fee = await request('/fees', { method: 'POST', body: { student: residentId, month: '2026-10', amount: 10000, dueDate: '2026-10-10' } })
    assert.equal(fee.status, 201, fee.body?.message)
    const duplicateFee = await request('/fees', { method: 'POST', body: { student: residentId, month: '2026-10', amount: 10000, dueDate: '2026-10-10' } })
    assert.equal(duplicateFee.status, 409)
    const payment = await request(`/fees/${fee.body.item._id}/payments`, { method: 'POST', body: { amount: 3500, method: 'UPI' } })
    assert.equal(payment.status, 201, payment.body?.message)
    const tooMuch = await request(`/fees/${fee.body.item._id}/payments`, { method: 'POST', body: { amount: 7000, method: 'Cash' } })
    assert.equal(tooMuch.status, 400)
    const ownFeeList = await request('/fees', { token: residentToken })
    assert.equal(ownFeeList.body.items.length, 1)
    assert.equal(ownFeeList.body.items[0].paidAmount, 3500)
    assert.equal(ownFeeList.body.items[0].paymentMethod, 'UPI')
    assert.equal((await request('/fees', { token: otherResidentToken })).body.items.length, 0)
    assert.equal((await request('/visitors', { token: residentToken })).status, 403)

    const attendance = await request('/attendance', { method: 'POST', body: { student: residentId, date: '2026-10-12', status: 'Present' } })
    assert.equal(attendance.status, 201, attendance.body?.message)
    const duplicateAttendance = await request('/attendance', { method: 'POST', body: { student: residentId, date: '2026-10-12', status: 'Absent' } })
    assert.equal(duplicateAttendance.status, 409)

    const complaint = await request('/complaints', { token: residentToken, method: 'POST', body: { category: 'Water', subject: 'Test request', description: 'Please inspect the tap.' } })
    assert.equal(complaint.status, 201, complaint.body?.message)
    assert.equal((await request('/complaints', { token: otherResidentToken })).body.items.length, 0)
  })
})
