const express = require('express');
const cors = require('cors');
const { PowerShell } = require('node-powershell');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const BACKUP_PATH = path.join(__dirname, 'env-backup.json');

app.use(cors());
app.use(express.json());

// 读取配置文件
async function readConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
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
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// 读取环境变量备份
async function readBackup() {
  try {
    const data = await fs.readFile(BACKUP_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
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
  await fs.writeFile(BACKUP_PATH, JSON.stringify(backup, null, 2));
}

// 获取环境变量
app.get('/api/env', async (req, res) => {
  let ps;
  try {
    ps = new PowerShell({
      executionPolicy: 'Bypass',
      noProfile: true
    });

    console.log('正在获取用户环境变量...');
    const userEnvResult = await ps.invoke(`
      $OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
      [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8

      # 获取用户环境变量
      $userVars = Get-ItemProperty -Path 'HKCU:\\Environment'
      $result = @{}
      
      # 处理每个环境变量
      $userVars.PSObject.Properties | ForEach-Object {
        if ($_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSProvider', 'Description')) {
          # 转换为 UTF-8 编码
          $nameBytes = [System.Text.Encoding]::UTF8.GetBytes($_.Name)
          $valueBytes = [System.Text.Encoding]::UTF8.GetBytes($_.Value)
          $encodedName = [System.Text.Encoding]::UTF8.GetString($nameBytes)
          $encodedValue = [System.Text.Encoding]::UTF8.GetString($valueBytes)
          $result[$encodedName] = $encodedValue
        }
      }
      
      ConvertTo-Json -InputObject $result -Compress
    `);
    console.log('用户环境变量结果:', userEnvResult);

    console.log('正在获取系统环境变量...');
    const systemEnvResult = await ps.invoke(`
      $OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
      [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8

      # 获取系统环境变量
      $systemVars = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
      $result = @{}
      
      # 处理每个环境变量
      $systemVars.PSObject.Properties | ForEach-Object {
        if ($_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSProvider', 'Description')) {
          # 转换为 UTF-8 编码
          $nameBytes = [System.Text.Encoding]::UTF8.GetBytes($_.Name)
          $valueBytes = [System.Text.Encoding]::UTF8.GetBytes($_.Value)
          $encodedName = [System.Text.Encoding]::UTF8.GetString($nameBytes)
          $encodedValue = [System.Text.Encoding]::UTF8.GetString($valueBytes)
          $result[$encodedName] = $encodedValue
        }
      }
      
      ConvertTo-Json -InputObject $result -Compress
    `);
    console.log('系统环境变量结果:', systemEnvResult);

    let userEnv = {}, systemEnv = {};
    try {
      userEnv = JSON.parse(userEnvResult.raw || '{}');
      systemEnv = JSON.parse(systemEnvResult.raw || '{}');

      // 清理可能的乱码值
      Object.entries(userEnv).forEach(([key, value]) => {
        if (typeof value === 'string' && /[\uFFFD]/.test(value)) {
          delete userEnv[key];
        }
      });

      Object.entries(systemEnv).forEach(([key, value]) => {
        if (typeof value === 'string' && /[\uFFFD]/.test(value)) {
          delete systemEnv[key];
        }
      });

    } catch (parseError) {
      console.error('JSON解析错误:', parseError);
      console.error('用户环境变量原始数据:', userEnvResult);
      console.error('系统环境变量原始数据:', systemEnvResult);
      throw new Error('环境变量数据格式错误');
    }

    // 读取同步配置
    const config = await readConfig();

    // 将所有环境变量添加到同步列表
    const userVarNames = Object.keys(userEnv);
    const systemVarNames = Object.keys(systemEnv);

    let configUpdated = false;
    
    userVarNames.forEach(name => {
      if (!config.syncItems.user.includes(name)) {
        config.syncItems.user.push(name);
        configUpdated = true;
      }
    });

    systemVarNames.forEach(name => {
      if (!config.syncItems.system.includes(name)) {
        config.syncItems.system.push(name);
        configUpdated = true;
      }
    });

    if (configUpdated) {
      await saveConfig(config);
    }

    res.json({
      user: userEnv,
      system: systemEnv,
      syncItems: config.syncItems
    });
  } catch (error) {
    console.error('获取环境变量失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '获取环境变量失败', details: error.message });
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

// 更新同步配置
app.post('/api/sync/config', async (req, res) => {
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
    res.status(500).json({ error: '更新同步配置失败', details: error.message });
  }
});

// 执行同步
app.post('/api/sync/execute', async (req, res) => {
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
    res.status(500).json({ error: '执行同步失败', details: error.message });
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
app.post('/api/env', async (req, res) => {
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
    res.status(500).json({ error: '更新环境变量失败', details: error.message });
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
app.delete('/api/env/:name', async (req, res) => {
  const { name } = req.params;
  const { type } = req.query;
  let ps;

  try {
    ps = new PowerShell({
      executionPolicy: 'Bypass',
      noProfile: true
    });

    const target = type === 'user' ? 'User' : 'Machine';
    const regPath = type === 'user' ? 'HKCU:\\Environment' : 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment';
    
    // 使用 PowerShell 的 Remove-ItemProperty 命令删除环境变量，并确保正确的编码
    await ps.invoke(`
      $OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
      [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
      
      # 转换为 UTF-8 编码
      $nameBytes = [System.Text.Encoding]::UTF8.GetBytes('${name}')
      $envName = [System.Text.Encoding]::UTF8.GetString($nameBytes)
      
      # 删除环境变量
      Remove-ItemProperty -Path '${regPath}' -Name $envName -ErrorAction SilentlyContinue
      
      # 更新当前会话的环境变量
      Remove-Item -Path "env:$envName" -ErrorAction SilentlyContinue
      
      # 刷新环境变量
      $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "${target}")
    `);

    // 从同步列表和备份中移除
    const [config, backup] = await Promise.all([readConfig(), readBackup()]);
    config.syncItems[type] = config.syncItems[type].filter(item => item !== name);
    delete backup[type][name];
    await Promise.all([saveConfig(config), saveBackup(backup)]);

    res.json({ success: true, message: '环境变量已删除' });
  } catch (error) {
    console.error('删除环境变量失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '删除环境变量失败', details: error.message });
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

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 