const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/twitter.db');

// 确保 data 目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// 启用外键
db.pragma('foreign_keys = ON');

console.log('✅ Connected to SQLite database');

module.exports = db;
