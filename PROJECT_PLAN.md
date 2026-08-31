# Twitter Clone 项目计划

## 技术栈
- **前端**: HTML + CSS + JavaScript (现有)
- **后端**: Node.js + Express.js
- **数据库**: PostgreSQL (推荐) 或 MySQL
- **部署**: 云服务器 (VPS)

## 项目结构

```
twitter-clone/
├── server/
│   ├── index.js           # 主服务器入口
│   ├── config/
│   │   └── database.js    # 数据库配置
│   ├── models/
│   │   ├── User.js        # 用户模型
│   │   ├── Post.js        # 帖子模型
│   │   └── Follow.js      # 关注关系模型
│   ├── routes/
│   │   ├── auth.js        # 认证路由
│   │   ├── posts.js       # 帖子路由
│   │   └── users.js       # 用户路由
│   └── middleware/
│       └── auth.js        # 权限验证中间件
├── public/
│   ├── index.html         # 前端页面
│   ├── css/
│   └── js/
├── .env                   # 环境变量
├── package.json
└── README.md
```

## 数据库设计

### 用户表 (users)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | VARCHAR(50) | 用户名 (唯一) |
| email | VARCHAR(100) | 邮箱 (唯一) |
| password | VARCHAR(255) | 密码 (加密) |
| display_name | VARCHAR(50) | 显示名称 |
| bio | TEXT | 个人简介 |
| avatar | VARCHAR(255) | 头像URL |
| created_at | TIMESTAMP | 创建时间 |

### 帖子表 (posts)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| user_id | INTEGER | 发布者ID (外键) |
| content | TEXT | 帖子内容 |
| image_url | VARCHAR(255) | 图片URL (可选) |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 点赞表 (likes)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户ID |
| post_id | INTEGER | 帖子ID |
| created_at | TIMESTAMP | 点赞时间 |

### 评论表 (comments)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 评论者ID |
| post_id | INTEGER | 帖子ID |
| content | TEXT | 评论内容 |
| created_at | TIMESTAMP | 评论时间 |

### 关注表 (follows)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| follower_id | INTEGER | 关注者 |
| following_id | INTEGER | 被关注者 |
| created_at | TIMESTAMP | 关注时间 |

## API 接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 帖子
- `GET /api/posts` - 获取首页时间线
- `GET /api/posts/:id` - 获取单个帖子
- `POST /api/posts` - 发帖
- `DELETE /api/posts/:id` - 删除帖子
- `POST /api/posts/:id/like` - 点赞
- `POST /api/posts/:id/retweet` - 转发
- `POST /api/posts/:id/comments` - 发表评论

### 用户
- `GET /api/users/:username` - 获取用户资料
- `PUT /api/users/profile` - 修改个人资料
- `POST /api/users/:id/follow` - 关注用户
- `DELETE /api/users/:id/follow` - 取消关注
- `GET /api/users/:id/followers` - 获取粉丝列表
- `GET /api/users/:id/following` - 获取关注列表

## 实现步骤

### 第一阶段：后端基础
1. 初始化 Node.js 项目
2. 安装依赖 (express, pg, bcrypt, jsonwebtoken, cors, dotenv)
3. 配置数据库连接
4. 创建数据库表结构
5. 实现用户注册/登录

### 第二阶段：核心功能
1. 实现发帖功能
2. 实现点赞/评论/转发
3. 实现关注功能
4. 实现时间线 (用户 + 关注的人)

### 第三阶段：前端对接
1. 修改前端页面
2. 对接后端 API
3. 处理登录状态
4. 实时更新数据

### 第四阶段：部署
1. 购买 VPS 服务器
2. 安装 Node.js 和 PostgreSQL
3. 配置域名 (可选)
4. 使用 PM2 运行服务

## 预计开发时间
- 后端基础: 1-2小时
- 核心功能: 2-3小时
- 前端对接: 1-2小时
- 部署: 30分钟

总计: 约 5-8小时