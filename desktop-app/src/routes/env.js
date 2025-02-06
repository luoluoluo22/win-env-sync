const express = require('express')
const { PowerShell } = require('node-powershell')
const envSyncService = require('../services/envSyncService')
const router = express.Router()

// 获取环境变量
router.get('/env', async (req, res) => {
  let ps
  try {
    console.log('开始获取环境变量...')

    ps = new PowerShell({
      executionPolicy: 'Bypass',
      noProfile: true,
      debugMsg: false,
    })

    console.log('正在获取用户环境变量...')
    const userEnvResult = await ps.invoke(`
      [System.Environment]::GetEnvironmentVariables([System.EnvironmentVariableTarget]::User) | 
      ConvertTo-Json -Compress
    `)

    console.log('正在获取系统环境变量...')
    const systemEnvResult = await ps.invoke(`
      [System.Environment]::GetEnvironmentVariables([System.EnvironmentVariableTarget]::Machine) | 
      ConvertTo-Json -Compress
    `)

    const userEnv = JSON.parse(userEnvResult.raw)
    const systemEnv = JSON.parse(systemEnvResult.raw)

    // 获取当前配置和备份
    const [config, backup] = await Promise.all([
      envSyncService.readConfig(),
      envSyncService.readBackup(),
    ])

    res.json({
      user: userEnv,
      system: systemEnv,
      syncItems: config.syncItems,
      backup: backup,
    })
  } catch (error) {
    console.error('获取环境变量失败:', error)
    res.status(500).json({
      success: false,
      message: '获取环境变量失败',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  } finally {
    if (ps) {
      await ps.dispose()
    }
  }
})

// 更新同步配置
router.post('/sync/config', async (req, res) => {
  try {
    const { name, type, enabled } = req.body
    const config = await envSyncService.readConfig()

    if (enabled) {
      if (!config.syncItems[type].includes(name)) {
        config.syncItems[type].push(name)
      }
    } else {
      config.syncItems[type] = config.syncItems[type].filter(
        (item) => item !== name
      )
    }

    await envSyncService.saveConfig(config)
    res.json({ success: true, message: '同步配置已更新' })
  } catch (error) {
    console.error('更新同步配置失败:', error)
    res
      .status(500)
      .json({ message: '更新同步配置失败', details: error.message })
  }
})

// 执行同步
router.post('/sync/execute', async (req, res) => {
  try {
    await envSyncService.syncEnvironmentVariables()
    res.json({ success: true, message: '同步执行成功' })
  } catch (error) {
    console.error('执行同步失败:', error)
    res.status(500).json({ message: '执行同步失败', details: error.message })
  }
})

module.exports = router
