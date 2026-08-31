const db = require('./db');
const bcrypt = require('bcrypt');

const initDB = async () => {
  await db.read();
  
  if (!db.data || db.data.users.length === 0) {
    console.log('📝 Adding sample data...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    db.data = {
      users: [
        { username: 'kejiribao', email: 'keji@demo.com', password: hashedPassword, display_name: '科技日报', bio: '最新科技资讯', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kejiribao' },
        { username: 'coder_life', email: 'coder@demo.com', password: hashedPassword, display_name: '程序人生', bio: '分享编程经验', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=coderlife' },
        { username: 'tech_watcher', email: 'watcher@demo.com', password: hashedPassword, display_name: '互联网观察', bio: '观察互联网', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techwatcher' }
      ],
      posts: [
        { user_id: 0, content: '🚀 最新消息：GPT-5 即将发布！#AI #科技', created_at: new Date().toISOString() },
        { user_id: 1, content: '💡 JavaScript 技巧分享！#编程', created_at: new Date().toISOString() },
        { user_id: 2, content: '📱 互联网最新动态', created_at: new Date().toISOString() }
      ],
      likes: [],
      comments: [],
      follows: []
    };
    
    await db.write();
    console.log('✅ Sample data created');
  }
  
  console.log('✨ Ready!');
};

initDB();
