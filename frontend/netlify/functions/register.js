const { connectDb } = require('./utils/db')
const User = require('./models/User')

exports.handler = async function (event, context) {
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
    const { email, username, password } = JSON.parse(event.body)

    // 验证必需字段
    if (!email || !username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '所有字段都是必需的' }),
      }
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '该邮箱已被注册' }),
      }
    }

    // 创建新用户
    const user = new User({
      email,
      username,
      password,
    })

    await user.save()

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: '注册成功',
        user: {
          email: user.email,
          username: user.username,
        },
      }),
    }
  } catch (error) {
    console.error('注册错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '注册失败，请重试' }),
    }
  }
}
