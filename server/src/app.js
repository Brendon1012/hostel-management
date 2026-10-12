import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { authRouter } from './routes/auth.js'
import { resourceRouter } from './routes/resources.js'
import { dashboardRouter } from './routes/dashboard.js'
import { authenticate } from './middleware/auth.js'
import { AppError, errorHandler } from './utils/errors.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim()),
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))
app.use(express.json({ limit: '32kb' }))
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please try again later.' } }))
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.use('/api', authenticate)
app.use('/api/dashboard', dashboardRouter)
app.use('/api', resourceRouter)
app.use((req, res, next) => next(new AppError(404, 'The requested endpoint was not found.')))
app.use(errorHandler)
