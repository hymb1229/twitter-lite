const express = require('express');
const db = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 获取用户资料
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    await db.read();
    const currentUserId = req.user ? req.user.id : null;

    const user = db.data.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const followers_count = db.data.follows.filter(f => f.following_id === user.id).length;
    const following_count = db.data.follows.filter(f => f.follower_id === user.id).length;
    const posts_count = db.data.posts.filter(p => p.user_id === user.id && !p.retweet_from).length;

    let isFollowing = false;
    if (currentUserId) {
      isFollowing = db.data.follows.some(f => f.follower_id === currentUserId && f.following_id === user.id);
    }

    res.json({ user: { ...user, followers_count, following_count, posts_count, is_following: isFollowing } });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户帖子
router.get('/:username/posts', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    await db.read();
    const currentUserId = req.user ? req.user.id : null;

    const user = db.data.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const posts = db.data.posts
      .filter(p => p.user_id === user.id && !p.retweet_from)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(post => {
        const likes_count = db.data.likes.filter(l => l.post_id === post.id).length;
        const comments_count = db.data.comments.filter(c => c.post_id === post.id).length;
        const retweets_count = db.data.posts.filter(p => p.retweet_from === post.id).length;
        const liked_by_me = currentUserId ? db.data.likes.some(l => l.post_id === post.id && l.user_id === currentUserId) : false;
        const retweeted_by_me = currentUserId ? db.data.posts.some(p => p.retweet_from === post.id && p.user_id === currentUserId) : false;
        
        return {
          ...post,
          user_id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar: user.avatar,
          likes_count,
          comments_count,
          retweets_count,
          liked_by_me: liked_by_me ? 1 : 0,
          retweeted_by_me: retweeted_by_me ? 1 : 0
        };
      });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 关注用户
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    await db.read();
    const targetUser = db.data.users.find(u => u.id === parseInt(id));
    if (!targetUser) return res.status(404).json({ error: '用户不存在' });

    const existingFollow = db.data.follows.find(f => f.follower_id === req.user.id && f.following_id === parseInt(id));

    if (existingFollow) {
      db.data.follows = db.data.follows.filter(f => !(f.follower_id === req.user.id && f.following_id === parseInt(id)));
      await db.write();
      res.json({ following: false, message: '取消关注' });
    } else {
      db.data.follows.push({ follower_id: req.user.id, following_id: parseInt(id), created_at: new Date().toISOString() });
      await db.write();
      res.json({ following: true, message: '关注成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取粉丝列表
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const followers = db.data.follows
      .filter(f => f.following_id === parseInt(id))
      .map(f => {
        const user = db.data.users[f.follower_id];
        return user ? { ...user, followed_at: f.created_at } : null;
      })
      .filter(u => u);
    res.json({ followers });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取关注列表
router.get('/:id/following', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const following = db.data.follows
      .filter(f => f.follower_id === parseInt(id))
      .map(f => {
        const user = db.data.users[f.following_id];
        return user ? { ...user, followed_at: f.created_at } : null;
      })
      .filter(u => u);
    res.json({ following });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 搜索用户
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    await db.read();
    const users = db.data.users
      .filter(u => u.username.toLowerCase().includes(query.toLowerCase()) || (u.display_name && u.display_name.toLowerCase().includes(query.toLowerCase())))
      .slice(0, 10)
      .map(u => ({ id: u.id, username: u.username, display_name: u.display_name, avatar: u.avatar, bio: u.bio }));
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
