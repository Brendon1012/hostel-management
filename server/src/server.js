import 'dotenv/config'
import { app } from './app.js'
import { connectDatabase } from './config/database.js'

const port = Number(process.env.PORT || 5000)

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set to a random value at least 32 characters long.')
  await connectDatabase()
  app.listen(port, () => console.info(`JMR API listening on http://localhost:${port}`))
} catch (error) {
  console.error(`JMR API could not start: ${error.message}`)
  process.exitCode = 1
}
