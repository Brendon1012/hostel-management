import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { AppError } from '../utils/errors.js'

export async function authenticate(req, res, next) {
  try {
    const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) throw new AppError(401, 'Please sign in to continue.')
    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'jmr-api', audience: 'jmr-web' })
    } catch {
      throw new AppError(401, 'Your session has expired. Please sign in again.')
    }
    const user = await User.findById(payload.sub).select('_id name username email role student isActive tokenVersion')
    if (!user || !user.isActive || payload.ver !== user.tokenVersion) throw new AppError(401, 'This account or session is no longer active.')
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'You do not have permission to perform this action.'))
    next()
  }
}
