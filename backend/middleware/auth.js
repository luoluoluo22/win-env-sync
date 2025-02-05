const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('未提供认证令牌');
      return res.status(401).json({ message: '请先登录' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        console.log('找不到对应的用户:', decoded.userId);
        return res.status(401).json({ message: '用户不存在' });
      }

      req.token = token;
      req.user = user;
      next();
    } catch (jwtError) {
      console.log('JWT验证失败:', jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: '登录已过期，请重新登录' });
      }
      return res.status(401).json({ message: '无效的认证令牌' });
    }
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({ message: '认证过程发生错误' });
  }
};

module.exports = auth; 