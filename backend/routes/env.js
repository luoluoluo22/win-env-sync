const express = require('express');
const { PowerShell } = require('node-powershell');
const fs = require('fs').promises;
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const CONFIG_PATH = path.join(__dirname, '../config.json');
const BACKUP_PATH = path.join(__dirname, '../env-backup.json');

// 读取配置文件
async function readConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取配置文件失败:', error);
    if (error.code === 'ENOENT') {
      // 如果文件不存在，创建默认配置
      const defaultConfig = {
        syncItems: {
          user: [],
          system: []
        }
      };
      await fs.writeFile(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    throw error;
  }
}

// 保存配置文件
async function saveConfig(config) {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('保存配置文件失败:', error);
    throw error;
  }
}

// 读取环境变量备份
async function readBackup() {
  try {
    const data = await fs.readFile(BACKUP_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取备份文件失败:', error);
    if (error.code === 'ENOENT') {
      const defaultBackup = {
        user: {},
        system: {}
      };
      await fs.writeFile(BACKUP_PATH, JSON.stringify(defaultBackup, null, 2));
      return defaultBackup;
    }
    throw error;
  }
}

// 保存环境变量备份
async function saveBackup(backup) {
  try {
    await fs.writeFile(BACKUP_PATH, JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('保存备份文件失败:', error);
    throw error;
  }
}

// 获取环境变量
router.get('/env', async (req, res) => {
  let ps;
  try {
    console.log('开始获取环境变量...');
    
    ps = new PowerShell({
      executionPolicy: 'Bypass',
      noProfile: true,
      debugMsg: false
    });

    // 测试 PowerShell 是否可用
    try {
      await ps.invoke('Write-Output "PowerShell test connection successful"');
      console.log('PowerShell 测试连接成功');
    } catch (testError) {
      console.error('PowerShell 测试连接失败:', testError);
      throw new Error('PowerShell connection failed: ' + testError.message);
    }

    console.log('正在获取用户环境变量...');
    const userEnvResult = await ps.invoke(`
      try {
        $ErrorActionPreference = "Stop"
        
        if (-not (Test-Path 'HKCU:\\Environment')) {
          throw "User environment registry path does not exist"
        }

        $userVars = Get-ItemProperty -Path 'HKCU:\\Environment' -ErrorAction Stop
        $result = @{}
        
        $userVars.PSObject.Properties | Where-Object {
          $_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSProvider', 'Description')
        } | ForEach-Object {
          $result[$_.Name] = $_.Value.ToString()
        }
        
        $jsonResult = ConvertTo-Json -InputObject $result -Compress
        Write-Output $jsonResult
      } catch {
        throw $_.Exception.Message
      }
    `);

    console.log('正在获取系统环境变量...');
    const systemEnvResult = await ps.invoke(`
      try {
        $ErrorActionPreference = "Stop"
        
        if (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment')) {
          throw "System environment registry path does not exist"
        }

        $systemVars = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment' -ErrorAction Stop
        $result = @{}
        
        $systemVars.PSObject.Properties | Where-Object {
          $_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSProvider', 'Description')
        } | ForEach-Object {
          $result[$_.Name] = $_.Value.ToString()
        }
        
        $jsonResult = ConvertTo-Json -InputObject $result -Compress
        Write-Output $jsonResult
      } catch {
        throw $_.Exception.Message
      }
    `);

    let userEnv = {}, systemEnv = {};
    try {
      if (userEnvResult?.raw) {
        userEnv = JSON.parse(userEnvResult.raw);
        console.log('成功解析用户环境变量，变量数量:', Object.keys(userEnv).length);
      } else {
        console.warn('用户环境变量结果为空');
      }

      if (systemEnvResult?.raw) {
        systemEnv = JSON.parse(systemEnvResult.raw);
        console.log('成功解析系统环境变量，变量数量:', Object.keys(systemEnv).length);
      } else {
        console.warn('系统环境变量结果为空');
      }
    } catch (parseError) {
      console.error('JSON解析错误:', parseError);
      console.error('用户环境变量原始数据:', userEnvResult);
      console.error('系统环境变量原始数据:', systemEnvResult);
      throw new Error(`Failed to parse environment variables: ${parseError.message}`);
    }

    // 读取同步配置
    console.log('正在读取同步配置...');
    const config = await readConfig();
    console.log('成功读取同步配置');

    const response = {
      user: userEnv,
      system: systemEnv,
      syncItems: config.syncItems
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('获取环境变量失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false,
      message: '获取环境变量失败',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (ps) {
      try {
        await ps.dispose();
        console.log('PowerShell 会话已关闭');
      } catch (disposeError) {
        console.error('关闭PowerShell会话失败:', disposeError);
      }
    }
  }
});

// 更新同步配置
router.post('/sync/config', auth, async (req, res) => {
  try {
    const { name, type, enabled } = req.body;
    const config = await readConfig();
    
    if (enabled) {
      if (!config.syncItems[type].includes(name)) {
        config.syncItems[type].push(name);
      }
    } else {
      config.syncItems[type] = config.syncItems[type].filter(item => item !== name);
    }
    
    await saveConfig(config);
    res.json({ success: true, message: '同步配置已更新' });
  } catch (error) {
    console.error('更新同步配置失败:', error);
    res.status(500).json({ message: '更新同步配置失败', details: error.message });
  }
});

// 执行同步
router.post('/sync/execute', auth, async (req, res) => {
  let ps;
  try {
    const { items } = req.body; // 如果为空，则同步所有配置项
    const [config, backup] = await Promise.all([readConfig(), readBackup()]);
    
    ps = new PowerShell({
      executionPolicy: 'Bypass',
      noProfile: true
    });

    const syncResults = [];
    const syncItems = items || [...config.syncItems.user.map(name => ({ name, type: 'user' })), 
                                ...config.syncItems.system.map(name => ({ name, type: 'system' }))];

    for (const { name, type } of syncItems) {
      try {
        // 从备份中获取值
        const value = backup[type][name];
        if (value !== undefined) {
          const regPath = type === 'user' ? 'HKCU:\\Environment' : 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment';
          
          await ps.invoke(`
            $OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
            [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
            
            # 转换为 UTF-8 编码
            $nameBytes = [System.Text.Encoding]::UTF8.GetBytes('${name}')
            $valueBytes = [System.Text.Encoding]::UTF8.GetBytes('${value}')
            $envName = [System.Text.Encoding]::UTF8.GetString($nameBytes)
            $envValue = [System.Text.Encoding]::UTF8.GetString($valueBytes)
            
            # 设置环境变量
            Set-ItemProperty -Path '${regPath}' -Name $envName -Value $envValue
            
            # 更新当前会话的环境变量
            Set-Item -Path "env:$envName" -Value $envValue -ErrorAction SilentlyContinue
          `);
          syncResults.push({ name, type, success: true });
        }
      } catch (error) {
        console.error(`同步 ${name} 失败:`, error);
        syncResults.push({ name, type, success: false, error: error.message });
      }
    }

    // 刷新 Path 环境变量
    await ps.invoke(`
      $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    `);

    res.json({ success: true, results: syncResults });
  } catch (error) {
    console.error('执行同步失败:', error);
    res.status(500).json({ message: '执行同步失败', details: error.message });
  } finally {
    if (ps) {
      try {
        await ps.dispose();
      } catch (disposeError) {
        console.error('关闭PowerShell会话失败:', disposeError);
      }
    }
  }
});

// 更新环境变量
router.post('/env', auth, async (req, res) => {
  const { name, value, type } = req.body;
  let ps;
  
  try {
    ps = new PowerShell({
      executionPolicy: 'Bypass',
      noProfile: true
    });

    const target = type === 'user' ? 'User' : 'Machine';
    const regPath = type === 'user' ? 'HKCU:\\Environment' : 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment';
    
    // 使用 PowerShell 的 Set-ItemProperty 命令设置环境变量，并确保正确的编码
    await ps.invoke(`
      $OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
      [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
      
      # 转换为 UTF-8 编码
      $nameBytes = [System.Text.Encoding]::UTF8.GetBytes('${name}')
      $valueBytes = [System.Text.Encoding]::UTF8.GetBytes('${value}')
      $envName = [System.Text.Encoding]::UTF8.GetString($nameBytes)
      $envValue = [System.Text.Encoding]::UTF8.GetString($valueBytes)
      
      # 设置环境变量
      Set-ItemProperty -Path '${regPath}' -Name $envName -Value $envValue
      
      # 更新当前会话的环境变量
      Set-Item -Path "env:$envName" -Value $envValue -ErrorAction SilentlyContinue
      
      # 刷新环境变量
      $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "${target}")
    `);

    // 自动添加到同步列表和备份
    const [config, backup] = await Promise.all([readConfig(), readBackup()]);
    
    if (!config.syncItems[type].includes(name)) {
      config.syncItems[type].push(name);
    }
    
    backup[type][name] = value;
    
    await Promise.all([saveConfig(config), saveBackup(backup)]);

    res.json({ success: true, message: '环境变量已更新' });
  } catch (error) {
    console.error('更新环境变量失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ message: '更新环境变量失败', details: error.message });
  } finally {
    if (ps) {
      try {
        await ps.dispose();
      } catch (disposeError) {
        console.error('关闭PowerShell会话失败:', disposeError);
      }
    }
  }
});

// 删除环境变量
router.delete('/env/:name', auth, async (req, res) => {
  const { name } = req.params;
  const { type } = req.query;
  let ps;

  console.log(`Starting to delete environment variable: ${name} (${type})`);

  try {
    // First check configuration and backup files
    const [config, backup] = await Promise.all([readConfig(), readBackup()]);
    console.log('Current config:', config);
    console.log('Current backup:', backup);

    ps = new PowerShell({
      executionPolicy: 'Bypass',
      noProfile: true,
      debugMsg: false
    });

    const regPath = type === 'user' ? 'HKCU:\\Environment' : 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment';
    
    console.log(`Deleting environment variable, path: ${regPath}, name: ${name}`);

    // Use PowerShell to delete the environment variable
    const result = await ps.invoke(`
      try {
        $ErrorActionPreference = "Stop"
        
        # Check if registry path exists
        if (-not (Test-Path -Path '${regPath}')) {
          throw "Registry path does not exist: ${regPath}"
        }

        # Check if environment variable exists
        $prop = Get-ItemProperty -Path '${regPath}' -Name '${name}' -ErrorAction SilentlyContinue
        if (-not $prop -or -not $prop.'${name}') {
          throw "Environment variable does not exist: ${name}"
        }

        # Delete the environment variable
        Remove-ItemProperty -Path '${regPath}' -Name '${name}' -ErrorAction Stop
        Write-Output "Environment variable deleted successfully"

        # Update current session environment variable
        Remove-Item -Path "env:${name}" -ErrorAction SilentlyContinue
      } catch {
        throw $_.Exception.Message
      }
    `);

    console.log('PowerShell execution result:', result);

    // Remove from sync list and backup
    config.syncItems[type] = config.syncItems[type].filter(item => item !== name);
    delete backup[type][name];

    console.log('Updated config:', config);
    console.log('Updated backup:', backup);

    await Promise.all([saveConfig(config), saveBackup(backup)]);
    console.log('Configuration and backup files updated');

    res.json({ success: true, message: 'Environment variable deleted successfully' });
  } catch (error) {
    console.error('Failed to delete environment variable:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'Failed to delete environment variable';
    let statusCode = 500;

    if (error.message.includes('Registry path does not exist')) {
      errorMessage = 'Registry path does not exist';
      statusCode = 404;
    } else if (error.message.includes('Environment variable does not exist')) {
      errorMessage = 'Environment variable does not exist';
      statusCode = 404;
    } else if (error.message.includes('Access is denied')) {
      errorMessage = 'Access denied. Please run as administrator';
      statusCode = 403;
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (ps) {
      try {
        await ps.dispose();
        console.log('PowerShell session closed');
      } catch (disposeError) {
        console.error('Failed to close PowerShell session:', disposeError);
      }
    }
  }
});

module.exports = router; 