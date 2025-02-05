# Windows 环境变量同步工具

一个用于管理和同步 Windows 环境变量的工具，提供友好的 Web 界面。

## 功能特点

- 查看和管理用户环境变量
- 查看和管理系统环境变量
- 支持添加、编辑、删除操作
- 友好的 Web 界面
- 支持用户认证和权限管理
- 操作历史记录

## 目录结构

```
win-env-sync/
├── backend/         # 后端服务
│   ├── middleware/  # 中间件
│   ├── models/     # 数据模型
│   ├── routes/     # 路由定义
│   └── server.js   # 服务入口
├── frontend/        # 前端界面
│   ├── src/        # 源代码
│   │   ├── auth/   # 认证相关
│   │   ├── views/  # 页面组件
│   │   └── router/ # 路由配置
│   └── vite.config.js # Vite配置
├── package.json     # 项目配置
└── README.md        # 说明文档
```

## 快速开始

1. 克隆项目：
```bash
git clone <repository-url>
cd win-env-sync
```

2. 安装依赖：
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. 配置环境变量：
- 在backend目录下创建`.env`文件
- 在frontend目录下根据环境创建对应的`.env`文件

4. 启动开发服务：
```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd frontend
npm run dev
```

5. 访问界面：
打开浏览器访问 `http://localhost:5173`

## 开发说明

### 后端开发
- 服务运行在 3000 端口
- 使用 Express.js 框架
- 通过 node-powershell 操作系统环境变量
- JWT 用户认证
- 需要管理员权限执行系统环境变量操作

### 前端开发
- 开发服务运行在 5173 端口
- 基于 Vue 3 + Vite
- 使用 Element Plus UI 组件库
- Vue Router 处理路由
- Auth0 集成用户认证

## 部署说明

### Netlify 部署
1. Fork 或克隆此仓库
2. 在 Netlify 中连接你的仓库
3. 设置以下部署配置：
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/dist`
4. 设置环境变量：
   - `VITE_APP_API_URL`: 后端API地址
   - `AUTH0_DOMAIN`: Auth0域名
   - `AUTH0_CLIENT_ID`: Auth0客户端ID

### 后端部署
1. 准备一个支持Node.js的Windows服务器
2. 安装必要的依赖：
```bash
npm install -g pm2
```
3. 配置环境变量
4. 使用PM2启动服务：
```bash
pm2 start server.js
```

## 技术栈

### 后端
- Express.js：Web框架
- node-powershell：PowerShell操作
- JWT：用户认证
- SQLite：数据存储

### 前端
- Vue 3：框架
- Element Plus：UI组件库
- Vite：构建工具
- Vue Router：路由管理
- Auth0：身份认证

## 注意事项

- 修改系统环境变量时请谨慎操作
- 建议在修改前备份重要的环境变量
- 需要 Node.js 环境（建议 v16 或更高版本）
- 系统环境变量操作需要管理员权限
- 确保服务器有足够的权限执行PowerShell命令

## 安全建议

- 及时更新依赖包版本
- 妥善保管环境配置文件
- 定期备份数据
- 使用强密码保护管理员账号
- 限制API访问频率
- 启用HTTPS
- 正确配置CORS