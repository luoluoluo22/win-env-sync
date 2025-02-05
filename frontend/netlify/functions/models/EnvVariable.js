import mongoose from 'mongoose'

const envVariableSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, '环境变量名称是必需的'],
      trim: true,
    },
    value: {
      type: String,
      required: [true, '环境变量值是必需的'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID是必需的'],
    },
    description: {
      type: String,
      trim: true,
    },
    lastSync: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// 创建复合索引确保用户的环境变量key唯一
envVariableSchema.index({ userId: 1, key: 1 }, { unique: true })

const EnvVariable =
  mongoose.models.EnvVariable ||
  mongoose.model('EnvVariable', envVariableSchema)
export default EnvVariable
