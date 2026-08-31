const express = require('express');
const pool = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 获取用户资料
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = await pool.query(
      'SELECT id, username, display_name, bio, avatar, created_at FROM users WHERE username = $1',
      [username]
    );

    if (user.rows.length === 0) return res.status(404).json({ error: '用户不存在' });

    const u = user.rows[0];
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND retweet_from IS NULL) as posts_count
    `, [u.id]);

    let isFollowing = false;
    if (currentUserId) {
      const follow = await pool.query(
        'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
        [currentUserId, u.id]
      );
      isFollowing = follow.rows.length > 0;
    }

    res.json({ user: { ...u, ...stats.rows[0], is_following: isFollowing } });
  } catch (error) {
    res.status(500).json({ error: '服务器错误: $服务器错误' });
  }
});

// 获取用户帖子
router.get('/:username/posts', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) return res.status(404).json({ error: '用户不存在' });

    const posts = await pool.query(`
      SELECT 
        p.id, p.content, p.image_url, p.retweet_from, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id) as retweets_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = $1) as liked_by_me,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id AND user_id = $1) as retweeted_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $2 AND p.retweet_from IS NULL
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [currentUserId || null, user.rows[0].id]);

    res.json({ posts: posts.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误: $服务器错误' });
  }
});

// 关注用户
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    const targetUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) return res.status(404).json({ error: '用户不存在' });

    const existingFollow = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, id]
    );

    if (existingFollow.rows.length > 0) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, id]);
      res.json({ following: false, message: '取消关注' });
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [req.user.id, id]);
      res.json({ following: true, message: '关注成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误: $服务器错误' });
  }
});

// 获取粉丝列表
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;
    const followers = await pool.query(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio, f.created_at as followed_at
      FROM follows f JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1 ORDER BY f.created_at DESC
    `, [id]);
    res.json({ followers: followers.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误: $服务器错误' });
  }
});

// 获取关注列表
router.get('/:id/following', async (req, res) => {
  try {
    const { id } = req.params;
    const following = await pool.query(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio, f.created_at as followed_at
      FROM follows f JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1 ORDER BY f.created_at DESC
    `, [id]);
    res.json({ following: following.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误: $服务器错误' });
  }
});

// 搜索用户
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const users = await pool.query(`
      SELECT id, username, display_name, avatar, bio FROM users 
      WHERE username ILIKE $1 OR display_name ILIKE $1
      LIMIT 10
    `, [`%${query}%`]);
    res.json({ users: users.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误: $服务器错误' });
  }
});

module.exports = router;
