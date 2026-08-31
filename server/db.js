const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_B7FbVmn6EYga@ep-fragrant-surf-ae6sbogi-pooler.c-2.us-east-2.aws.neon.tech/风舞?sslmode=require&channel_binding=require';

console.log('Connecting to database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('✅ Database connected');
});

module.exports = pool;
