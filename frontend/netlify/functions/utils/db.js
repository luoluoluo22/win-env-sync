import mongoose from 'mongoose'

// 缓存数据库连接
let cachedDb = null

export async function connectDb() {
  // 如果已经有连接，直接返回
  if (cachedDb) {
    return cachedDb
  }

  // 连接配置
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    // 自动重试连接
    retryWrites: true,
    w: 'majority',
    // 连接池设置
    maxPoolSize: 10,
  }

  try {
    // 检查环境变量
    if (!process.env.MONGODB_URI) {
      throw new Error('请设置 MONGODB_URI 环境变量')
    }

    // 建立连接
    const client = await mongoose.connect(process.env.MONGODB_URI, options)

    // 注册事件处理程序
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB连接错误:', err)
      cachedDb = null
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB连接断开')
      cachedDb = null
    })

    mongoose.connection.on('connected', () => {
      console.log('MongoDB连接成功')
    })

    // 缓存连接
    cachedDb = client
    return client
  } catch (error) {
    console.error('MongoDB连接失败:', error)
    throw error
  }
}
