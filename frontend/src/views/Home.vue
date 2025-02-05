<template>
  <div class="container">
    <el-card class="env-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <h2>Windows 环境变量管理</h2>
            <el-button type="success" @click="syncAll" :loading="syncLoading">
              一键同步
            </el-button>
          </div>
          <el-button type="primary" @click="showAddDialog">添加环境变量</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="用户变量" name="user">
          <el-table :data="userEnvList" style="width: 100%">
            <el-table-column prop="name" label="变量名" width="180" />
            <el-table-column prop="value" label="变量值" />
            <el-table-column label="同步" width="80">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.sync"
                  @change="(val) => toggleSync(scope.row.name, 'user', val)"
                />
              </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="200">
              <template #default="scope">
                <el-button type="success" size="small" @click="syncItem(scope.row.name, 'user')" :disabled="!scope.row.sync">
                  同步
                </el-button>
                <el-button type="primary" size="small" @click="editEnv(scope.row, 'user')">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteEnv(scope.row.name, 'user')">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="系统变量" name="system">
          <el-table :data="systemEnvList" style="width: 100%">
            <el-table-column prop="name" label="变量名" width="180" />
            <el-table-column prop="value" label="变量值" />
            <el-table-column label="同步" width="80">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.sync"
                  @change="(val) => toggleSync(scope.row.name, 'system', val)"
                />
              </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="200">
              <template #default="scope">
                <el-button type="success" size="small" @click="syncItem(scope.row.name, 'system')" :disabled="!scope.row.sync">
                  同步
                </el-button>
                <el-button type="primary" size="small" @click="editEnv(scope.row, 'system')">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteEnv(scope.row.name, 'system')">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑环境变量' : '添加环境变量'"
      width="500px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="变量类型">
          <el-radio-group v-model="form.type">
            <el-radio value="user">用户变量</el-radio>
            <el-radio value="system">系统变量</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="变量名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="变量值">
          <el-input v-model="form.value" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveEnv">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../utils/axios'

const activeTab = ref('user')
const userEnvList = ref([])
const systemEnvList = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const syncLoading = ref(false)
const form = ref({
  type: 'user',
  name: '',
  value: ''
})

// 获取环境变量
const fetchEnv = async () => {
  try {
    const { user, system, syncItems } = await http.get('/env')
    
    userEnvList.value = Object.entries(user).map(([name, value]) => ({
      name,
      value,
      sync: syncItems.user.includes(name)
    }))
    
    systemEnvList.value = Object.entries(system).map(([name, value]) => ({
      name,
      value,
      sync: syncItems.system.includes(name)
    }))
  } catch (error) {
    ElMessage.error('获取环境变量失败')
  }
}

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    type: 'user',
    name: '',
    value: ''
  }
  dialogVisible.value = true
}

// 编辑环境变量
const editEnv = (row, type) => {
  isEdit.value = true
  form.value = {
    type,
    name: row.name,
    value: row.value
  }
  dialogVisible.value = true
}

// 删除环境变量
const deleteEnv = async (name, type) => {
  try {
    await ElMessageBox.confirm('确定要删除这个环境变量吗？', '提示', {
      type: 'warning'
    })
    
    await http.delete(`/env/${name}?type=${type}`)
    ElMessage.success('删除成功')
    // 延迟 1 秒后刷新列表，等待注册表更新
    setTimeout(() => {
      fetchEnv()
    }, 1000)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 保存环境变量
const saveEnv = async () => {
  try {
    await http.post('/env', form.value)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchEnv()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 切换同步状态
const toggleSync = async (name, type, enabled) => {
  try {
    await http.post('/sync/config', { name, type, enabled })
    ElMessage.success(enabled ? '已添加到同步列表' : '已从同步列表移除')
  } catch (error) {
    ElMessage.error('更新同步配置失败')
    // 恢复开关状态
    fetchEnv()
  }
}

// 同步单个项目
const syncItem = async (name, type) => {
  try {
    const { results } = await http.post('/sync/execute', {
      items: [{ name, type }]
    })
    
    const result = results[0]
    if (result.success) {
      ElMessage.success('同步成功')
    } else {
      ElMessage.error(`同步失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error('同步失败')
  }
}

// 一键同步
const syncAll = async () => {
  try {
    syncLoading.value = true
    const { results } = await http.post('/sync/execute')
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    if (failCount === 0) {
      ElMessage.success(`同步完成，成功同步 ${successCount} 个环境变量`)
    } else {
      ElMessage.warning(`同步完成，成功 ${successCount} 个，失败 ${failCount} 个`)
    }
  } catch (error) {
    ElMessage.error('同步失败')
  } finally {
    syncLoading.value = false
  }
}

onMounted(() => {
  fetchEnv()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.env-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.card-header h2 {
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 