import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/bright_triage',
  ...(process.env.NODE_ENV === 'production' && { ssl: { rejectUnauthorized: false } }),
});

export default pool;
