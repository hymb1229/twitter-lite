const bcrypt = require('bcrypt');

const db = require('./db');

const initDB = async () => {
  if (db.users.length === 0) {
    console.log('📝 Creating sample data...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Users
    const avatars = ['kejiribao', 'coderlife', 'techwatcher', 'ainews', 'livestar'];
    const names = ['科技日报', '程序人生', '互联网观察', 'AI前沿', '直播明星'];
    const bios = ['最新科技资讯', '分享编程经验', '观察互联网', 'AI动态', '每晚8点直播'];
    
    for (let i = 0; i < 5; i++) {
      db.users.push({
        id: i,
        username: avatars[i],
        email: `${avatars[i]}@demo.com`,
        password: hashedPassword,
        display_name: names[i],
        bio: bios[i],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatars[i]}`
      });
    }
    
    // Posts
    const contents = [
      '🚀 最新消息：GPT-5 即将发布！#AI',
      '💡 JavaScript技巧分享！#编程',
      '📱 互联网最新动态！',
      '🤖 AI时代来，你准备好了吗？',
      '🎥 今晚8点直播！不见不散'
    ];
    
    for (let i = 0; i < 5; i++) {
      db.posts.push({
        id: i,
        user_id: i,
        content: contents[i],
        created_at: new Date(Date.now() - i*3600000).toISOString()
      });
    }
    
    console.log('✅ Sample data created');
  }
  console.log('✅ Database ready');
};

initDB();
