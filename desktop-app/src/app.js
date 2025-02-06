const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { join } = require('path')
const fs = require('fs').promises

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') })

// 服务实例
const app = express()

// 确保数据目录存在
const dataDir = join(__dirname, '..', process.env.DATA_DIR || 'data')
fs.mkdir(dataDir, { recursive: true }).catch(console.error)

// 服务
const envSyncService = require('./services/envSyncService')

// 中间件
app.use(cors())
app.use(express.json())

// 路由
const envRoutes = require('./routes/env')
app.use('/api', envRoutes)

// 404 处理
app.use((req, res) => {
  res.status(404).json({ message: '未找到请求的资源' })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err)
  console.error('错误堆栈:', err.stack)

  // 默认服务器错误
  res.status(500).json({
    message: '服务器内部错误',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  })
})

const PORT = process.env.PORT || 3002
const server = app.listen(PORT, async () => {
  console.log(`服务器运行在端口 ${PORT}`)

  try {
    // 初始化环境变量同步服务
    await envSyncService.initialize()
    console.log('环境变量同步服务已启动')
  } catch (error) {
    console.error('初始化环境变量同步服务失败:', error)
  }
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，准备关闭服务...')

  // 停止同步服务
  envSyncService.stopSync()

  // 关闭服务器
  server.close(() => {
    console.log('HTTP服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，准备关闭服务...')

  // 停止同步服务
  envSyncService.stopSync()

  // 关闭服务器
  server.close(() => {
    console.log('HTTP服务器已关闭')
    process.exit(0)
  })
})
