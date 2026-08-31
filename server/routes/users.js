const express = require('express');
const db = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 获取用户资料
router.get('/:username', optionalAuth, (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = db.prepare(
      'SELECT id, username, display_name, bio, avatar, created_at FROM users WHERE username = ?'
    ).get(username);

    if (!user) return res.status(404).json({ error: '用户不存在' });

    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = ?) as posts_count
    `).get(user.id, user.id, user.id);

    let isFollowing = false;
    if (currentUserId) {
      const follow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, user.id);
      isFollowing = !!follow;
    }

    res.json({ user: { ...user, ...stats, is_following: isFollowing } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户帖子
router.get('/:username/posts', optionalAuth, (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null;

    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const posts = db.prepare(`
      SELECT 
        p.id, p.content, p.image_url, p.retweet_from, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id) as retweets_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as liked_by_me,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id AND user_id = ?) as retweeted_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND p.retweet_from IS NULL
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(currentUserId, currentUserId, user.id, limit, offset);

    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 关注用户
router.post('/:id/follow', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!targetUser) return res.status(404).json({ error: '用户不存在' });

    const existingFollow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, id);

    if (existingFollow) {
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, id);
      res.json({ following: false, message: '取消关注' });
    } else {
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, id);
      res.json({ following: true, message: '关注成功' });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取粉丝列表
router.get('/:id/followers', (req, res) => {
  try {
    const { id } = req.params;

    const followers = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio, f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `).all(id);

    res.json({ followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取关注列表
router.get('/:id/following', (req, res) => {
  try {
    const { id } = req.params;

    const following = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio, f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).all(id);

    res.json({ following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 搜索用户
router.get('/search/:query', (req, res) => {
  try {
    const { query } = req.params;

    const users = db.prepare(`
      SELECT id, username, display_name, avatar, bio FROM users 
      WHERE username LIKE ? OR display_name LIKE ?
      LIMIT 10
    `).all(`%${query}%`, `%${query}%`);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
