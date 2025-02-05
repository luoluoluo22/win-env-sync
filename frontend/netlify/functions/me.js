const { connectDb } = require('./utils/db');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

exports.handler = async function(event, context) {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 只允许GET请求
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '方法不允许' })
    };
  }

  try {
    // 获取Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: '未提供认证token' })
      };
    }

    // 验证token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 连接数据库
    await connectDb();

    // 查找用户
    const user = await User.findById(decoded.userId);
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: '用户不存在' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: user._id,
        email: user.email,
        username: user.username
      })
    };

  } catch (error) {
    console.error('获取用户信息错误:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: '无效或过期的token' })
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '获取用户信息失败' })
    };
  }
};