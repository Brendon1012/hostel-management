import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDatabase } from '../src/config/database.js'
import { User } from '../src/models/index.js'

const required = ['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']

try {
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required in server/.env.`)
  }
  if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  if (/replace-with|change-me|password123/i.test(process.env.ADMIN_PASSWORD)) throw new Error('Set a unique admin password instead of the example placeholder.')
  await connectDatabase()
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase()
  const username = process.env.ADMIN_USERNAME.trim().toLowerCase()
  const existing = await User.findOne({ $or: [{ email }, { username }] })
  if (existing) throw new Error('An account already exists with this admin email or username. No changes were made.')
  const passwordHash = await User.hashPassword(process.env.ADMIN_PASSWORD)
  await User.create({ name: process.env.ADMIN_NAME.trim(), email, username, passwordHash, role: 'admin' })
  console.info(`Admin account created for ${email}. Keep your .env file private.`)
} catch (error) {
  console.error(`Admin seed failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
