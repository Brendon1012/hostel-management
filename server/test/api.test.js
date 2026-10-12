import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../src/app.js'

let server
let origin

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  origin = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

describe('public API security and health', () => {
  test('reports the API as healthy', async () => {
    const response = await fetch(`${origin}/api/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'ok' })
  })

  test('rejects an incomplete sign-in request without querying the database', async () => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: '' }),
    })
    assert.equal(response.status, 400)
    assert.match((await response.json()).message, /email or username and password/i)
  })

  test('does not expose a public registration endpoint', async () => {
    const response = await fetch(`${origin}/api/auth/register`, { method: 'POST' })
    assert.equal(response.status, 401)
  })

  test('protects data routes when the caller has no token', async () => {
    const response = await fetch(`${origin}/api/dashboard/summary`)
    assert.equal(response.status, 401)
    assert.match((await response.json()).message, /sign in/i)
  })
})
