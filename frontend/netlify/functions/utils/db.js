const mongoose = require('mongoose')

let conn = null

exports.connectDb = async function () {
  if (conn == null) {
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    // 注册连接事件处理器
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB连接错误:', err)
    })

    mongoose.connection.once('open', () => {
      console.log('MongoDB连接成功')
    })
  }

  return conn
}
