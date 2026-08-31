const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_B7FbVmn6EYga@ep-fragrant-surf-ae6sbogi-pooler.c-2.us-east-2.aws.neon.tech/风舞?sslmode=require';

console.log('📦 Connecting to database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => console.log('✅ DB connected'));
pool.on('error', (err) => console.error('❌ DB error:', err.message));

// Test connection
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database ready'))
  .catch(err => console.error('❌ Database error:', err.message));

module.exports = pool;

// Simple query helper
global.db = async (text, params = []) => {
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err) {
    console.error('Query error:', err.message);
    throw err;
  }
};
