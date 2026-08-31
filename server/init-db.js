const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../data/twitter.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const initDB = async () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        display_name TEXT,
        bio TEXT,
        avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        retweet_from INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Posts table created');

    db.exec(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);
    console.log('✅ Likes table created');

    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Comments table created');

    db.exec(`
      CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      )
    `);
    console.log('✅ Follows table created');

    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`);
    console.log('✅ Indexes created');

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    if (userCount.count === 0) {
      console.log('📝 Adding sample data...');
      
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const users = [
        { username: 'kejiribao', email: 'keji@demo.com', display_name: '科技日报', bio: '最新的科技资讯，每天更新', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kejiribao' },
        { username: 'coder_life', email: 'coder@demo.com', display_name: '程序人生', bio: '分享编程经验和代码技巧', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=coderlife' },
        { username: 'tech_watcher', email: 'watcher@demo.com', display_name: '互联网观察', bio: '观察互联网行业的那些事', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techwatcher' },
        { username: 'ai_news', email: 'ai@demo.com', display_name: 'AI 前沿', bio: '人工智能最新动态', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ainews' },
        { username: 'funny_videos', email: 'fun@demo.com', display_name: '有趣视频', bio: '分享有趣的视频内容', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=funnyvideos' }
      ];
      
      const insertUser = db.prepare('INSERT INTO users (username, email, password, display_name, bio, avatar) VALUES (?, ?, ?, ?, ?, ?)');
      
      for (const user of users) {
        insertUser.run(user.username, user.email, hashedPassword, user.display_name, user.bio, user.avatar);
      }
      console.log(`✅ Created ${users.length} sample users`);
      
      // 使用固定时间戳
      const now = Date.now();
      const times = [
        new Date(now - 2*60*60*1000).toISOString(),  // 2小时前
        new Date(now - 4*60*60*1000).toISOString(),  // 4小时前
        new Date(now - 6*60*60*1000).toISOString(),  // 6小时前
        new Date(now - 8*60*60*1000).toISOString(),  // 8小时前
        new Date(now - 10*60*60*1000).toISOString(), // 10小时前
        new Date(now - 12*60*60*1000).toISOString(), // 12小时前
        new Date(now - 14*60*60*1000).toISOString(), // 14小时前
        new Date(now - 16*60*60*1000).toISOString(), // 16小时前
        new Date(now - 18*60*60*1000).toISOString(), // 18小时前
        new Date(now - 20*60*60*1000).toISOString(), // 20小时前
      ];
      
      const posts = [
        { user_id: 1, content: '🚀 最新消息：GPT-5 即将发布！预计将带来更强大的推理能力和多模态理解。#AI #ChatGPT #科技', time: times[0] },
        { user_id: 2, content: '💡 分享一个实用的 JavaScript 技巧：使用 Array.from() 可以轻松创建指定长度的数组，比 for 循环简洁多了！#编程 #JavaScript', time: times[1] },
        { user_id: 3, content: '📱 苹果发布会总结：iPhone 16 带来了全新的 AI 功能，相机系统也有重大升级，你会买吗？', time: times[2] },
        { user_id: 4, content: '🤖 报告显示：2024年AI相关岗位需求增长300%，薪资平均涨幅40%。AI人才炙手可热！#人工智能 #职场', time: times[3] },
        { user_id: 5, content: '😂 今天的快乐源泉：程序员的Bug修复日常... #程序员 #搞笑', time: times[4] },
        { user_id: 1, content: '🌟 SpaceX 成功发射新一代星舰！人类火星计划又近一步。#SpaceX #太空', time: times[5] },
        { user_id: 2, content: '🔧 推荐一个开源项目：NiceGUI，简单易用的 Python UI 框架，无需HTML/CSS基础也能做漂亮的界面！#开源 #Python', time: times[6] },
        { user_id: 4, content: '📊 研究表明：大语言模型在数学推理方面已经超过大多数人类。但创造性思维仍有差距。#LLM #AI', time: times[7] },
        { user_id: 3, content: '💰 互联网大厂最新薪资曝光：AI工程师年薪最高可达200万+，你拖后腿了吗？ #薪资 #互联网', time: times[8] },
        { user_id: 5, content: '🎮 游戏推荐：黑神话悟空真的是国产游戏的里程碑！画面精美绝伦 @coder_life 你玩了吗？', time: times[9] }
      ];
      
      const insertPost = db.prepare('INSERT INTO posts (user_id, content, created_at) VALUES (?, ?, ?)');
      
      for (const post of posts) {
        insertPost.run(post.user_id, post.content, post.time);
      }
      console.log(`✅ Created ${posts.length} sample posts`);
      
      const likes = [
        { user_id: 2, post_id: 1 },
        { user_id: 3, post_id: 1 },
        { user_id: 4, post_id: 1 },
        { user_id: 1, post_id: 2 },
        { user_id: 3, post_id: 2 },
        { user_id: 5, post_id: 3 },
        { user_id: 1, post_id: 4 },
        { user_id: 2, post_id: 4 }
      ];
      
      const insertLike = db.prepare('INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)');
      for (const like of likes) {
        insertLike.run(like.user_id, like.post_id);
      }
      console.log(`✅ Created ${likes.length} sample likes`);
      
      const follows = [
        { follower_id: 1, following_id: 2 },
        { follower_id: 1, following_id: 3 },
        { follower_id: 2, following_id: 1 },
        { follower_id: 2, following_id: 4 },
        { follower_id: 3, following_id: 1 },
        { follower_id: 4, following_id: 1 },
        { follower_id: 5, following_id: 1 },
        { follower_id: 5, following_id: 2 }
      ];
      
      const insertFollow = db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)');
      for (const follow of follows) {
        insertFollow.run(follow.follower_id, follow.following_id);
      }
      console.log(`✅ Created ${follows.length} sample follows`);
      
      console.log('\n🎉 Database with sample data initialized!');
    } else {
      console.log('📁 Database already has data, skipping sample data');
    }

    db.close();
    console.log('\n✨ All done! Ready to start the server.');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
};

initDB();
