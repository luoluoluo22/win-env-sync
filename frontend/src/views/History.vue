<template>
  <div class="container">
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <h2>同步历史</h2>
          <div class="header-actions">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :shortcuts="shortcuts"
              @change="handleDateChange"
            />
            <el-button type="primary" @click="fetchHistory">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="historyList" style="width: 100%">
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="deviceName" label="设备" width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'user' ? 'success' : 'warning'">
              {{ scope.row.type === 'user' ? '用户变量' : '系统变量' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="100">
          <template #default="scope">
            <el-tag :type="getActionTagType(scope.row.action)">
              {{ getActionText(scope.row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="variableName" label="变量名" />
        <el-table-column prop="oldValue" label="旧值" show-overflow-tooltip />
        <el-table-column prop="newValue" label="新值" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
              {{ scope.row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL } from '../config/api'

const historyList = ref([])
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const shortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
]

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleString()
}

// 获取操作标签类型
const getActionTagType = (action) => {
  const types = {
    add: 'success',
    update: 'warning',
    delete: 'danger',
    sync: 'info'
  }
  return types[action] || 'info'
}

// 获取操作文本
const getActionText = (action) => {
  const texts = {
    add: '添加',
    update: '更新',
    delete: '删除',
    sync: '同步'
  }
  return texts[action] || action
}

// 获取历史记录
const fetchHistory = async () => {
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0].toISOString()
      params.endDate = dateRange.value[1].toISOString()
    }

    const response = await axios.get(`${API_BASE_URL}/history`, { params })
    historyList.value = response.data.items
    total.value = response.data.total
  } catch (error) {
    ElMessage.error('获取历史记录失败')
  }
}

// 处理日期变化
const handleDateChange = () => {
  currentPage.value = 1
  fetchHistory()
}

// 处理每页数量变化
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchHistory()
}

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchHistory()
}

onMounted(() => {
  // 默认显示最近一周的记录
  dateRange.value = shortcuts[0].value()
  fetchHistory()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.history-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.card-header h2 {
  margin: 0;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 