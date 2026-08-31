const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const file = path.join(dataDir, 'twitter.json');

const defaultData = {
  users: [],
  posts: [],
  likes: [],
  comments: [],
  follows: []
};

const adapter = new JSONFile(file, defaultData);
const db = new Low(adapter, defaultData);

// 初始化数据库
db.read().then(() => {
  if (!db.data) {
    db.data = defaultData;
    db.write();
  }
  console.log('✅ Database connected (lowdb)');
});

module.exports = db;
