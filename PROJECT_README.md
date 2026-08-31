# 社交+直播平台 - 后端基础框架

## 功能清单

### ✅ 已完成
- [x] PostgreSQL 永久数据库
- [x] 用户系统（注册/登录/个人资料）
- [x] 帖子系统（文字/图片/点赞/评论/转发）
- [x] 关注系统
- [x] 搜索功能

### 🔄 待完成
- [ ] 直播功能（需要配置流媒体服务器）
- [ ] 通知系统
- [ ] 私信功能

## 技术栈
- 后端：Node.js + Express
- 数据库：PostgreSQL (Neon)
- 文件存储：本地 / 需配置云存储
- 实时通信：WebSocket (需要流媒体服务器)

## API 接口

### 用户
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- GET /api/auth/me - 当前用户
- PUT /api/users/profile - 更新资料
- GET /api/users/:username - 用户资料
- POST /api/users/:id/follow - 关注
- GET /api/users/:id/followers - 粉丝
- GET /api/users/:id/following - 关注列表
- GET /api/users/search/:query - 搜索用户

### 帖子
- GET /api/posts - 获取帖子列表
- POST /api/posts - 发帖
- DELETE /api/posts/:id - 删除帖子
- POST /api/posts/:id/like - 点赞
- POST /api/posts/:id/retweet - 转发
- GET /api/posts/:id/comments - 获取评论
- POST /api/posts/:id/comments - 发表评论

### 直播
- POST /api/live/create - 创建直播间
- GET /api/live/list - 直播列表
- GET /api/live/:id - 直播间详情

## 使用方法

1. 安装依赖：`npm install`
2. 启动服务：`npm start`
3. 访问：http://localhost:3000

## 配置

环境变量在 .env 文件中：
- DATABASE_URL - PostgreSQL 连接
- JWT_SECRET - JWT 密钥
- PORT - 端口