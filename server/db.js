const { Pool } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

module.exports = pool;

// 测试连接
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL connection OK'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err.message));
