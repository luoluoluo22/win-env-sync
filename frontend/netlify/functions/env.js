import { connectDb } from './utils/db.js'
import EnvVariable from './models/EnvVariable.js'
import jwt from 'jsonwebtoken'

// 验证token中间件
const verifyToken = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }

  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: '未提供认证token' }),
    }
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return { userId: decoded.userId, headers }
  } catch (error) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: '无效或过期的token' }),
    }
  }
}

export const handler = async (event, context) => {
  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    }
  }

  // 验证token
  const authResult = await verifyToken(event)
  if (authResult.statusCode === 401) {
    return authResult
  }
  const { userId, headers } = authResult

  try {
    await connectDb()

    switch (event.httpMethod) {
      case 'GET':
        // 获取用户的所有环境变量
        const variables = await EnvVariable.find({ userId }).sort({ key: 1 })
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(variables),
        }

      case 'POST':
        // 添加或更新环境变量
        const { key, value, description } = JSON.parse(event.body)

        if (!key || !value) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: '变量名和值都是必需的' }),
          }
        }

        // 使用upsert来添加或更新
        const updated = await EnvVariable.findOneAndUpdate(
          { userId, key },
          { value, description, lastSync: new Date() },
          { upsert: true, new: true }
        )

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updated),
        }

      case 'DELETE':
        // 删除环境变量
        const { key: deleteKey } = JSON.parse(event.body)

        if (!deleteKey) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: '请提供要删除的变量名' }),
          }
        }

        const deleted = await EnvVariable.findOneAndDelete({
          userId,
          key: deleteKey,
        })
        if (!deleted) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: '未找到指定的环境变量' }),
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: '环境变量已删除' }),
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: '不支持的请求方法' }),
        }
    }
  } catch (error) {
    console.error('环境变量操作错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '服务器错误，请重试' }),
    }
  }
}
