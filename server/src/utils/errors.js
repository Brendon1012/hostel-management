export class AppError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map(item => item.message).join(' ')
    return res.status(400).json({ message: message || 'Please check the submitted information.' })
  }
  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {})
    if (fields.includes('student') && fields.includes('month')) return res.status(409).json({ message: 'A monthly fee has already been created for this resident and billing month.' })
    if (fields.includes('student') && fields.includes('date')) return res.status(409).json({ message: 'Attendance has already been marked for this resident and date.' })
    if (fields.includes('day') && fields.includes('meal')) return res.status(409).json({ message: 'A menu item already exists for this day and meal.' })
    const field = fields[0] || 'record'
    return res.status(409).json({ message: `A record with this ${field} already exists.` })
  }
  if (error.name === 'CastError') return res.status(400).json({ message: 'The requested record is invalid.' })
  const status = error.status || 500
  if (status >= 500) console.error(error)
  return res.status(status).json({ message: status >= 500 ? 'An unexpected server error occurred.' : error.message })
}
