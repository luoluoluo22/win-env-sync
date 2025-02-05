<template>
  <div class="container">
    <el-card class="device-card">
      <template #header>
        <div class="card-header">
          <h2>设备管理</h2>
          <el-button type="primary" @click="showAddDialog">添加设备</el-button>
        </div>
      </template>

      <el-table :data="deviceList" style="width: 100%">
        <el-table-column prop="deviceName" label="设备名称" />
        <el-table-column prop="platform" label="平台" width="120">
          <template #default="scope">
            <el-tag>{{ scope.row.platform }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastSync" label="最后同步时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.lastSync) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'online' ? 'success' : 'info'">
              {{ scope.row.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="150">
          <template #default="scope">
            <el-button type="primary" size="small" @click="editDevice(scope.row)">
              编辑
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="deleteDevice(scope.row._id)"
              :disabled="scope.row.current"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '添加设备'"
      width="500px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="设备名称">
          <el-input v-model="form.deviceName" />
        </el-form-item>
        <el-form-item label="平台">
          <el-select v-model="form.platform">
            <el-option label="Windows" value="windows" />
            <el-option label="Linux" value="linux" />
            <el-option label="macOS" value="macos" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveDevice">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { API_BASE_URL } from '../config/api'

const deviceList = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref({
  deviceName: '',
  platform: 'windows'
})

// 格式化日期
const formatDate = (date) => {
  if (!date) return '从未同步'
  return new Date(date).toLocaleString()
}

// 获取设备列表
const fetchDevices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/devices`)
    deviceList.value = response.data
  } catch (error) {
    ElMessage.error('获取设备列表失败')
  }
}

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    deviceName: '',
    platform: 'windows'
  }
  dialogVisible.value = true
}

// 编辑设备
const editDevice = (device) => {
  isEdit.value = true
  form.value = {
    _id: device._id,
    deviceName: device.deviceName,
    platform: device.platform
  }
  dialogVisible.value = true
}

// 删除设备
const deleteDevice = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个设备吗？', '提示', {
      type: 'warning'
    })
    
    await axios.delete(`${API_BASE_URL}/devices/${id}`)
    ElMessage.success('删除成功')
    fetchDevices()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 保存设备
const saveDevice = async () => {
  try {
    if (isEdit.value) {
      await axios.put(`${API_BASE_URL}/devices/${form.value._id}`, form.value)
    } else {
      await axios.post(`${API_BASE_URL}/devices`, form.value)
    }
    
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchDevices()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

onMounted(() => {
  fetchDevices()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.device-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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