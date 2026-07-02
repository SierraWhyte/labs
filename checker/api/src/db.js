import pg from 'pg'

const { Pool } = pg

function getConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  const user = process.env.CHECKER_DB_USER
  const password = process.env.CHECKER_DB_PASSWORD
  const host = process.env.CHECKER_DB_HOST || 'localhost'
  const port = process.env.CHECKER_DB_PORT || '5432'
  const database = process.env.CHECKER_DB_NAME || 'checker'

  if (!user || !password) {
    throw new Error(
      'Missing CHECKER_DB_USER or CHECKER_DB_PASSWORD. Copy secrets.env.example to secrets.env.',
    )
  }

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

const pool = new Pool({
  connectionString: getConnectionString(),
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function waitForDb(maxAttempts = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch {
      if (attempt === maxAttempts) throw new Error('Database not ready')
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}
