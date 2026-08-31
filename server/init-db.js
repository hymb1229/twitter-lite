const db = require('./db');
const bcrypt = require('bcrypt');

const initDB = async () => {
  await db.read();
  
  if (db.data.users.length === 0) {
    console.log('📝 Adding sample data...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // 创建示例用户
    const users = [
      { username: 'kejiribao', email: 'keji@demo.com', password: hashedPassword, display_name: '科技日报', bio: '最新的科技资讯，每天更新', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kejiribao' },
      { username: 'coder_life', email: 'coder@demo.com', password: hashedPassword, display_name: '程序人生', bio: '分享编程经验和代码技巧', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=coderlife' },
      { username: 'tech_watcher', email: 'watcher@demo.com', password: hashedPassword, display_name: '互联网观察', bio: '观察互联网行业的那些事', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techwatcher' },
      { username: 'ai_news', email: 'ai@demo.com', password: hashedPassword, display_name: 'AI 前沿', bio: '人工智能最新动态', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ainews' },
      { username: 'funny_videos', email: 'fun@demo.com', password: hashedPassword, display_name: '有趣视频', bio: '分享有趣的视频内容', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=funnyvideos' }
    ];
    
    db.data.users = users;
    console.log(`✅ Created ${users.length} sample users`);
    
    // 创建示例帖子
    const now = Date.now();
    const posts = [
      { user_id: 0, content: '🚀 最新消息：GPT-5 即将发布！预计将带来更强大的推理能力和多模态理解。#AI #ChatGPT #科技', created_at: new Date(now - 2*60*60*1000).toISOString() },
      { user_id: 1, content: '💡 分享一个实用的 JavaScript 技巧：使用 Array.from() 可以轻松创建指定长度的数组！#编程 #JavaScript', created_at: new Date(now - 4*60*60*1000).toISOString() },
      { user_id: 2, content: '📱 苹果发布会总结：iPhone 16 带来了全新的 AI 功能，你会买吗？', created_at: new Date(now - 6*60*60*1000).toISOString() },
      { user_id: 3, content: '🤖 报告显示：2024年AI相关岗位需求增长300%，薪资平均涨幅40%！#人工智能 #职场', created_at: new Date(now - 8*60*60*1000).toISOString() },
      { user_id: 4, content: '😂 今天的快乐源泉：程序员的Bug修复日常... #程序员 #搞笑', created_at: new Date(now - 10*60*60*1000).toISOString() },
      { user_id: 0, content: '🌟 SpaceX 成功发射新一代星舰！人类火星计划又近一步。#SpaceX #太空', created_at: new Date(now - 12*60*60*1000).toISOString() },
      { user_id: 1, content: '🔧 推荐一个开源项目：NiceGUI，简单易用的 Python UI 框架！#开源 #Python', created_at: new Date(now - 14*60*60*1000).toISOString() },
      { user_id: 3, content: '📊 研究表明：大语言模型在数学推理方面已经超过大多数人类。#LLM #AI', created_at: new Date(now - 16*60*60*1000).toISOString() },
      { user_id: 2, content: '💰 互联网大厂最新薪资曝光：AI工程师年薪最高可达200万+！#薪资 #互联网', created_at: new Date(now - 18*60*60*1000).toISOString() },
      { user_id: 4, content: '🎮 游戏推荐：黑神话悟空真的是国产游戏的里程碑！画面精美绝伦', created_at: new Date(now - 20*60*60*1000).toISOString() }
    ];
    
    db.data.posts = posts;
    console.log(`✅ Created ${posts.length} sample posts`);
    
    // 点赞
    db.data.likes = [
      { user_id: 1, post_id: 0 }, { user_id: 2, post_id: 0 }, { user_id: 3, post_id: 0 },
      { user_id: 0, post_id: 1 }, { user_id: 2, post_id: 1 },
      { user_id: 4, post_id: 2 }, { user_id: 0, post_id: 3 }, { user_id: 1, post_id: 3 }
    ];
    console.log(`✅ Created ${db.data.likes.length} sample likes`);
    
    // 关注
    db.data.follows = [
      { follower_id: 0, following_id: 1 }, { follower_id: 0, following_id: 2 },
      { follower_id: 1, following_id: 0 }, { follower_id: 1, following_id: 3 },
      { follower_id: 2, following_id: 0 }, { follower_id: 3, following_id: 0 },
      { follower_id: 4, following_id: 0 }, { follower_id: 4, following_id: 1 }
    ];
    console.log(`✅ Created ${db.data.follows.length} sample follows`);
    
    await db.write();
    console.log('\n🎉 Database with sample data initialized!');
  } else {
    console.log('📁 Database already has data');
  }
  
  console.log('✨ Ready to start the server.');
};

initDB();
