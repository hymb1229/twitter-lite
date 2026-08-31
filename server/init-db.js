const pool = require('./db');
const bcrypt = require('bcrypt');

const initDB = async () => {
  try {
    // 创建表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        display_name TEXT,
        bio TEXT,
        avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        retweet_from INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Posts table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);
    console.log('✅ Likes table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Comments table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      )
    `);
    console.log('✅ Follows table created');

    // 检查是否已有数据
    const result = await pool.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(result.rows[0].count) === 0) {
      console.log('📝 Adding sample data...');
      
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // 创建示例用户
      const users = [
        { username: 'kejiribao', email: 'keji@demo.com', display_name: '科技日报', bio: '最新的科技资讯，每天更新' },
        { username: 'coder_life', email: 'coder@demo.com', display_name: '程序人生', bio: '分享编程经验和代码技巧' },
        { username: 'tech_watcher', email: 'watcher@demo.com', display_name: '互联网观察', bio: '观察互联网行业的那些事' },
        { username: 'ai_news', email: 'ai@demo.com', display_name: 'AI 前沿', bio: '人工智能最新动态' },
        { username: 'funny_videos', email: 'fun@demo.com', display_name: '有趣视频', bio: '分享有趣的视频内容' }
      ];
      
      const now = Date.now();
      for (let i = 0; i < users.length; i++) {
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${users[i].username}`;
        await pool.query(
          'INSERT INTO users (username, email, password, display_name, bio, avatar) VALUES ($1, $2, $3, $4, $5, $6)',
          [users[i].username, users[i].email, hashedPassword, users[i].display_name, users[i].bio, avatar]
        );
      }
      console.log(`✅ Created ${users.length} sample users`);
      
      // 创建示例帖子
      const posts = [
        '🚀 最新消息：GPT-5 即将发布！预计将带来更强大的推理能力和多模态理解。#AI #ChatGPT #科技',
        '💡 分享一个实用的 JavaScript 技巧：使用 Array.from() 可以轻松创建指定长度的数组！#编程',
        '📱 苹果发布会总结：iPhone 16 带来了全新的 AI 功能，你会买吗？',
        '🤖 报告显示：2024年AI相关岗位需求增长300%，薪资平均涨幅40%！#人工智能',
        '😂 今天的快乐源泉：程序员的Bug修复日常... #程序员'
      ];
      
      for (let i = 0; i < posts.length; i++) {
        await pool.query(
          'INSERT INTO posts (user_id, content, created_at) VALUES ($1, $2, $3)',
          [i, posts[i], new Date(now - (i+1)*2*60*60*1000)]
        );
      }
      console.log(`✅ Created ${posts.length} sample posts`);
      
      console.log('\n🎉 Database with sample data initialized!');
    } else {
      console.log('📁 Database already has data');
    }
    
    console.log('✨ Ready to start the server.');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
};

initDB();
