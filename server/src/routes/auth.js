import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import { authenticate } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!identifier || !password) throw new AppError(400, 'Enter your email or username and password.')
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }], isActive: true }).select('+passwordHash')
  if (!user || !(await user.comparePassword(password))) throw new AppError(401, 'The email or password you entered is incorrect.')
  const token = jwt.sign({ sub: user.id, role: user.role, ver: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h', issuer: 'jmr-api', audience: 'jmr-web' })
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role },
  })
}))

authRouter.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } })
  res.status(204).end()
}))
