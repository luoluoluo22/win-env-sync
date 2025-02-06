# Windows环境变量同步工具

一个用于在不同Windows系统之间同步环境变量的工具。

## 项目结构

```
win-env-sync/
├── frontend/             # Web前端（Netlify部署）
│   ├── src/             # 前端源码
│   └── netlify/         # Netlify函数
│       └── functions/   # Serverless函数
├── desktop-app/         # 桌面应用（本地运行）
│   ├── package.json     # 项目配置
│   └── src/            # 源代码
│       ├── app.js      # 入口文件
│       ├── routes/     # 路由处理
│       ├── services/   # 业务逻辑
│       └── config/     # 配置文件
```

## 使用方法

### 本地桌面应用

1. 进入desktop-app目录：
   ```bash
   cd desktop-app
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 配置环境变量，创建或编辑 src/.env：
   ```
   PORT=3002
   NETLIFY_ENDPOINT=https://winenv.netlify.app
   AUTH_TOKEN=your-jwt-token-here  # 登录后获取的JWT令牌
   SYNC_INTERVAL=300000  # 同步间隔，默认5分钟
   ```

4. 启动应用：
   ```bash
   npm start
   ```

### Web前端（用户界面）

1. 访问 https://winenv.netlify.app
2. 注册/登录账号
3. 获取JWT令牌（登录后自动完成）
4. 将令牌配置到本地应用的.env文件中

## 功能特点

- 支持用户和系统级环境变量同步
- 自动定时同步（可配置间隔时间）
- 选择性同步（可选择需要同步的变量）
- 云端存储和备份
- 安全的JWT认证

## 开发

### 本地开发

```bash
# 前端开发
cd frontend
npm install
npm run dev

# 桌面应用开发
cd desktop-app
npm install
npm run dev
```

### 部署

- 前端自动部署到Netlify
- 本地应用需手动安装和配置

## 注意事项

- 系统环境变量的修改需要管理员权限
- 请确保妥善保管JWT令牌
- 建议定期备份重要的环境变量