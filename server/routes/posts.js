const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// 获取帖子
router.get('/', optionalAuth, async (req, res) => {
  try {
    await db.read();
    const userId = req.user ? req.user.id : null;
    
    // 获取非转发的帖子
    const posts = db.data.posts
      .filter(p => !p.retweet_from)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(post => {
        const user = db.data.users[post.user_id];
        const likes_count = db.data.likes.filter(l => l.post_id === post.id).length;
        const comments_count = db.data.comments.filter(c => c.post_id === post.id).length;
        const retweets_count = db.data.posts.filter(p => p.retweet_from === post.id).length;
        const liked_by_me = userId ? db.data.likes.some(l => l.post_id === post.id && l.user_id === userId) : false;
        const retweeted_by_me = userId ? db.data.posts.some(p => p.retweet_from === post.id && p.user_id === userId) : false;
        
        // 获取转发原帖
        let retweet_post = null;
        if (post.retweet_from) {
          const origPost = db.data.posts.find(p => p.id === post.retweet_from);
          if (origPost) {
            const origUser = db.data.users[origPost.user_id];
            retweet_post = { ...origPost, username: origUser?.username, display_name: origUser?.display_name, avatar: origUser?.avatar };
          }
        }
        
        return {
          ...post,
          user_id: user?.id,
          username: user?.username,
          display_name: user?.display_name,
          avatar: user?.avatar,
          likes_count,
          comments_count,
          retweets_count,
          liked_by_me: liked_by_me ? 1 : 0,
          retweeted_by_me: retweeted_by_me ? 1 : 0,
          retweet_post
        };
      });

    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个帖子
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const post = db.data.posts.find(p => p.id === parseInt(id));
    
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    
    const user = db.data.users[post.user_id];
    res.json({ post: { ...post, username: user?.username, display_name: user?.display_name, avatar: user?.avatar } });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发帖
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { content, retweet_from } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '请输入内容' });
    }

    if (content.length > 280) {
      return res.status(400).json({ error: '内容不能超过280个字符' });
    }

    await db.read();
    
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const newPost = {
      id: db.data.posts.length,
      user_id: req.user.id,
      content,
      image_url,
      retweet_from: retweet_from ? parseInt(retweet_from) : null,
      created_at: new Date().toISOString()
    };

    db.data.posts.push(newPost);
    await db.write();

    res.status(201).json({ message: '发帖成功', post: newPost });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除帖子
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const postIndex = db.data.posts.findIndex(p => p.id === parseInt(id));
    
    if (postIndex === -1) return res.status(404).json({ error: '帖子不存在' });
    if (db.data.posts[postIndex].user_id !== req.user.id) return res.status(403).json({ error: '只能删除自己的帖子' });

    db.data.posts.splice(postIndex, 1);
    await db.write();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 点赞
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    
    const existingLike = db.data.likes.find(l => l.post_id === parseInt(id) && l.user_id === req.user.id);

    if (existingLike) {
      db.data.likes = db.data.likes.filter(l => !(l.post_id === parseInt(id) && l.user_id === req.user.id));
      await db.write();
      res.json({ liked: false, message: '取消点赞' });
    } else {
      db.data.likes.push({ user_id: req.user.id, post_id: parseInt(id), created_at: new Date().toISOString() });
      await db.write();
      res.json({ liked: true, message: '点赞成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 转发
router.post('/:id/retweet', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    
    const existingRetweet = db.data.posts.find(p => p.retweet_from === parseInt(id) && p.user_id === req.user.id);

    if (existingRetweet) {
      db.data.posts = db.data.posts.filter(p => !(p.retweet_from === parseInt(id) && p.user_id === req.user.id));
      await db.write();
      res.json({ retweeted: false, message: '取消转发' });
    } else {
      db.data.posts.push({ id: db.data.posts.length, user_id: req.user.id, content: '', retweet_from: parseInt(id), created_at: new Date().toISOString() });
      await db.write();
      res.json({ retweeted: true, message: '转发成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取评论
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const comments = db.data.comments
      .filter(c => c.post_id === parseInt(id))
      .map(c => {
        const user = db.data.users[c.user_id];
        return { ...c, username: user?.username, display_name: user?.display_name, avatar: user?.avatar };
      });
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发表评论
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '请输入评论内容' });
    }

    await db.read();
    const newComment = {
      id: db.data.comments.length,
      user_id: req.user.id,
      post_id: parseInt(id),
      content,
      created_at: new Date().toISOString()
    };

    db.data.comments.push(newComment);
    await db.write();

    const user = db.data.users[req.user.id];
    res.status(201).json({ comment: { ...newComment, username: user?.username, display_name: user?.display_name, avatar: user?.avatar }, message: '评论成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
