const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, '请提供邮箱地址'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, '请提供有效的邮箱地址'],
    },
    username: {
      type: String,
      required: [true, '请提供用户名'],
      trim: true,
      minlength: [2, '用户名至少2个字符'],
      maxlength: [20, '用户名最多20个字符'],
    },
    password: {
      type: String,
      required: [true, '请提供密码'],
      minlength: [6, '密码至少6个字符'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        delete ret.password
        return ret
      },
    },
  }
)

// 密码加密中间件
userSchema.pre('save', async function (next) {
  // 只有在密码被修改时才重新加密
  if (!this.isModified('password')) return next()

  try {
    // 生成盐值并加密密码
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// 验证密码的实例方法
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw new Error('密码比较失败')
  }
}

// 创建索引
userSchema.index({ email: 1 }, { unique: true })

// 确保模型只被创建一次
module.exports = mongoose.models.User || mongoose.model('User', userSchema)
