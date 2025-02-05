import { connectDb } from './utils/db.js'
import User from './models/User.js'

export const handler = async function (event, context) {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    }
  }

  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: true,
        message: '方法不允许',
      }),
    }
  }

  try {
    // 解析请求体
    const { email, username, password } = JSON.parse(event.body)

    // 验证必需字段
    if (!email || !username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: true,
          message: '请提供所有必需字段：邮箱、用户名和密码',
        }),
      }
    }

    // 连接数据库
    await connectDb()

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: true,
          message: '该邮箱已被注册',
        }),
      }
    }

    // 创建新用户
    const user = new User({
      email,
      username,
      password,
    })

    // 保存用户
    await user.save()

    // 返回成功响应
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: '注册成功',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      }),
    }
  } catch (error) {
    console.error('注册错误:', error)

    // 处理验证错误
    if (error.name === 'ValidationError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: true,
          message: Object.values(error.errors)
            .map((err) => err.message)
            .join(', '),
        }),
      }
    }

    // 处理其他数据库错误
    if (error.code === 11000) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: true,
          message: '该邮箱已被注册',
        }),
      }
    }

    // 其他错误
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: '注册失败，请稍后重试',
      }),
    }
  }
}
