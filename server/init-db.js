const pool = require('./db');
const bcrypt = require('bcrypt');

const initDB = async () => {
  let retries = 5;
  
  while (retries > 0) {
    try {
      // 测试数据库连接
      await pool.query('SELECT 1');
      console.log('✅ Database connected');
      
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
      console.log('✅ Users table ready');

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
      console.log('✅ Posts table ready');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS likes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, post_id)
        )
      `);
      console.log('✅ Likes table ready');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Comments table ready');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS follows (
          id SERIAL PRIMARY KEY,
          follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(follower_id, following_id)
        )
      `);
      console.log('✅ Follows table ready');

      // 检查是否已有数据
      const result = await pool.query('SELECT COUNT(*) FROM users');
      
      if (parseInt(result.rows[0].count) === 0) {
        console.log('📝 Adding sample data...');
        
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const users = [
          { username: 'kejiribao', email: 'keji@demo.com', display_name: '科技日报', bio: '最新的科技资讯' },
          { username: 'coder_life', email: 'coder@demo.com', display_name: '程序人生', bio: '分享编程经验' },
          { username: 'tech_watcher', email: 'watcher@demo.com', display_name: '互联网观察', bio: '观察互联网' },
          { username: 'ai_news', email: 'ai@demo.com', display_name: 'AI 前沿', bio: 'AI 最新动态' },
          { username: 'funny_videos', email: 'fun@demo.com', display_name: '有趣视频', bio: '分享有趣视频' }
        ];
        
        for (let i = 0; i < users.length; i++) {
          const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${users[i].username}`;
          await pool.query(
            'INSERT INTO users (username, email, password, display_name, bio, avatar) VALUES ($1, $2, $3, $4, $5, $6)',
            [users[i].username, users[i].email, hashedPassword, users[i].display_name, users[i].bio, avatar]
          );
        }
        console.log(`✅ Created ${users.length} users`);
        
        const posts = [
          '🚀 最新消息：GPT-5 即将发布！#AI #科技',
          '💡 JavaScript技巧：Array.from() 超好用！#编程',
          '📱 iPhone 16 发布，你会买吗？',
          '🤖 AI岗位需求增长300%！#人工智能',
          '😂 程序员的Bug日常...'
        ];
        
        const now = Date.now();
        for (let i = 0; i < posts.length; i++) {
          await pool.query(
            'INSERT INTO posts (user_id, content, created_at) VALUES ($1, $2, $3)',
            [i, posts[i], new Date(now - (i+1)*2*60*60*1000)]
          );
        }
        console.log(`✅ Created ${posts.length} posts`);
        
        console.log('\n🎉 Database initialized!');
      } else {
        console.log('📁 Database already has data');
      }
      
      console.log('✨ Ready!');
      return;
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}, retrying...`);
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log('⚠️ Database initialization failed, starting server anyway...');
};

initDB();
