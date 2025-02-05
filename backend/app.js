const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 路由
const authRoutes = require('./routes/auth');
const envRoutes = require('./routes/env');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 连接数据库
let dbConnected = false;
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('数据库连接成功');
  dbConnected = true;
})
.catch((error) => {
  console.error('数据库连接失败:', error);
  console.log('将以受限模式继续运行（仅支持环境变量操作）');
});

// 中间件：检查数据库连接状态
const checkDbConnection = (req, res, next) => {
  // 如果请求的是认证相关的路由，且数据库未连接，则返回错误
  if (req.path.startsWith('/api/auth') && !dbConnected) {
    return res.status(503).json({ 
      message: '认证服务暂时不可用',
      details: '数据库连接失败'
    });
  }
  next();
};

// 路由
app.use('/api/auth', checkDbConnection, authRoutes);
app.use('/api', checkDbConnection, envRoutes);

// 404 处理
app.use((req, res, next) => {
  res.status(404).json({ message: '未找到请求的资源' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  console.error('错误堆栈:', err.stack);
  
  // 区分不同类型的错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: '数据验证错误', details: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: '未授权的访问' });
  }
  
  // 默认服务器错误
  res.status(500).json({ 
    message: '服务器内部错误',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 