const pool = require('./db');
const bcrypt = require('bcrypt');

const initDB = async () => {
  console.log('🚀 Initializing database...');
  
  try {
    // 用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        bio TEXT,
        avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        cover_image TEXT,
        location VARCHAR(100),
        website VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table');

    // 帖子表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        video_url TEXT,
        location VARCHAR(100),
        retweet_from INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Posts table');

    // 点赞表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);
    console.log('✅ Likes table');

    // 评论表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Comments table');

    // 关注表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      )
    `);
    console.log('✅ Follows table');

    // 直播间表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_rooms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200),
        description TEXT,
        stream_key VARCHAR(100),
        is_live BOOLEAN DEFAULT false,
        viewer_count INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Live rooms table');

    // 通知表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Notifications table');

    // 私信表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Messages table');

    // 检查是否有示例数据
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('📝 Creating sample data...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // 示例用户
      const users = [
        { username: 'kejiribao', email: 'keji@demo.com', display_name: '科技日报', bio: '最新科技资讯' },
        { username: 'coder_life', email: 'coder@demo.com', display_name: '程序人生', bio: '分享编程经验' },
        { username: 'tech_watcher', email: 'watcher@demo.com', display_name: '互联网观察', bio: '观察互联网' },
        { username: 'ai_news', email: 'ai@demo.com', display_name: 'AI 前沿', bio: 'AI 最新动态' },
        { username: 'live_star', email: 'live@demo.com', display_name: '直播明星', bio: '每晚8点直播' }
      ];
      
      for (const u of users) {
        await pool.query(
          'INSERT INTO users (username, email, password, display_name, bio, avatar) VALUES ($1, $2, $3, $4, $5, $6)',
          [u.username, u.email, hashedPassword, u.display_name, u.bio, `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`]
        );
      }
      
      // 示例帖子
      const posts = [
        { user_id: 0, content: '🚀 最新消息：GPT-5 即将发布！#AI #科技', created_at: new Date(Date.now() - 2*60*60*1000) },
        { user_id: 1, content: '💡 JavaScript 技巧：Array.from() 超好用！', created_at: new Date(Date.now() - 4*60*60*1000) },
        { user_id: 2, content: '📱 互联网最新动态，关注我不迷路', created_at: new Date(Date.now() - 6*60*60*1000) },
        { user_id: 3, content: '🤖 AI 时代来，你准备好了吗？#人工智能', created_at: new Date(Date.now() - 8*60*60*1000) },
        { user_id: 4, content: '🎥 今晚8点直播！不见不散', created_at: new Date(Date.now() - 10*60*60*1000) }
      ];
      
      for (const p of posts) {
        await pool.query(
          'INSERT INTO posts (user_id, content, created_at) VALUES ($1, $2, $3)',
          [p.user_id, p.content, p.created_at]
        );
      }
      
      console.log(`✅ Created ${users.length} users, ${posts.length} posts`);
    }

    console.log('\n🎉 Database ready!\n');
  } catch (error) {
    console.error('❌ Database init error:', error.message);
  }
};

initDB();
