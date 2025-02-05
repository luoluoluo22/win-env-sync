import { connectDb } from './utils/db.js'
import User from './models/User.js'
import jwt from 'jsonwebtoken'

export const handler = async function (event, context) {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '方法不允许' }),
    }
  }

  try {
    // 连接数据库
    await connectDb()

    // 解析请求体
    const { email, password } = JSON.parse(event.body)

    // 验证必需字段
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '邮箱和密码都是必需的' }),
      }
    }

    // 查找用户
    const user = await User.findOne({ email })
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: '邮箱或密码错误' }),
      }
    }

    // 验证密码
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: '邮箱或密码错误' }),
      }
    }

    // 生成 JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: '登录成功',
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
        },
      }),
    }
  } catch (error) {
    console.error('登录错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '登录失败，请重试' }),
    }
  }
}
