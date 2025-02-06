const { PowerShell } = require('node-powershell')
const axios = require('axios')
const fs = require('fs').promises
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

class EnvSyncService {
  constructor() {
    this.netlifyEndpoint =
      process.env.NETLIFY_ENDPOINT || 'https://winenv.netlify.app'
    this.authToken = process.env.AUTH_TOKEN
    this.syncInterval = null
    this.configPath = path.join(__dirname, '..', 'config', 'config.json')
    this.dataDir = path.join(
      __dirname,
      '..',
      '..',
      process.env.DATA_DIR || 'data'
    )
    this.backupPath = path.join(this.dataDir, 'env-backup.json')
  }

  async initialize() {
    if (!this.authToken) {
      throw new Error('请提供AUTH_TOKEN环境变量')
    }

    // 确保数据目录存在
    await fs.mkdir(this.dataDir, { recursive: true })

    // 设置axios请求头
    this.api = axios.create({
      baseURL: this.netlifyEndpoint,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
    })

    // 开始定时同步
    this.startSync()
  }

  async startSync(
    interval = parseInt(process.env.SYNC_INTERVAL) || 5 * 60 * 1000
  ) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // 立即执行一次同步
    await this.syncEnvironmentVariables()

    // 设置定时同步
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncEnvironmentVariables()
      } catch (error) {
        console.error('自动同步失败:', error)
      }
    }, interval)

    console.log(`同步服务已启动，间隔: ${interval}ms`)
  }

  async getLocalEnvVariables() {
    let ps
    try {
      ps = new PowerShell({
        executionPolicy: 'Bypass',
        noProfile: true,
      })

      // 获取用户环境变量
      const userEnvResult = await ps.invoke(`
        [System.Environment]::GetEnvironmentVariables([System.EnvironmentVariableTarget]::User) | 
        ConvertTo-Json -Compress
      `)

      // 获取系统环境变量
      const systemEnvResult = await ps.invoke(`
        [System.Environment]::GetEnvironmentVariables([System.EnvironmentVariableTarget]::Machine) | 
        ConvertTo-Json -Compress
      `)

      const userEnv = JSON.parse(userEnvResult.raw)
      const systemEnv = JSON.parse(systemEnvResult.raw)

      return { user: userEnv, system: systemEnv }
    } finally {
      if (ps) {
        await ps.dispose()
      }
    }
  }

  async syncEnvironmentVariables() {
    try {
      // 获取本地环境变量
      const localEnv = await this.getLocalEnvVariables()

      // 读取同步配置
      const config = await this.readConfig()

      // 过滤需要同步的变量
      const syncedVars = {}
      for (const type of ['user', 'system']) {
        syncedVars[type] = {}
        for (const key of config.syncItems[type]) {
          if (localEnv[type][key] !== undefined) {
            syncedVars[type][key] = localEnv[type][key]
          }
        }
      }

      // 保存到备份文件
      await this.saveBackup(syncedVars)

      // 发送到Netlify函数
      await this.api.post('/api/env', {
        variables: syncedVars,
        timestamp: new Date().toISOString(),
      })

      console.log('环境变量同步成功')
    } catch (error) {
      console.error('同步环境变量失败:', error)
      throw error
    }
  }

  async readConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') {
        const defaultConfig = {
          syncItems: {
            user: [],
            system: [],
          },
        }
        await fs.writeFile(
          this.configPath,
          JSON.stringify(defaultConfig, null, 2)
        )
        return defaultConfig
      }
      throw error
    }
  }

  async saveBackup(data) {
    try {
      await fs.writeFile(this.backupPath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('保存备份失败:', error)
      throw error
    }
  }

  async readBackup() {
    try {
      const data = await fs.readFile(this.backupPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') {
        const defaultBackup = {
          user: {},
          system: {},
        }
        await fs.writeFile(
          this.backupPath,
          JSON.stringify(defaultBackup, null, 2)
        )
        return defaultBackup
      }
      throw error
    }
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('同步服务已停止')
    }
  }
}

module.exports = new EnvSyncService()
