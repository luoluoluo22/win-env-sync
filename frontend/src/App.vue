<template>
  <div>
    <template v-if="loading">
      <div class="loading-container">
        <el-loading :fullscreen="true" />
      </div>
    </template>

    <template v-else-if="!isAuthenticated">
      <router-view></router-view>
    </template>

    <template v-else>
      <el-container>
        <el-header>
          <div class="header-content">
            <div class="header-left">
              <h1>Windows 环境同步工具</h1>
            </div>
            <div class="header-right">
              <el-dropdown>
                <el-button type="primary">
                  {{ user?.username }}
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="showDevices"
                      >设备管理</el-dropdown-item
                    >
                    <el-dropdown-item @click="showHistory"
                      >同步历史</el-dropdown-item
                    >
                    <el-dropdown-item divided @click="handleLogout"
                      >退出登录</el-dropdown-item
                    >
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>

        <el-main>
          <router-view></router-view>
        </el-main>
      </el-container>
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'
import { useAuthProvider } from './auth/useAuthProvider'

const router = useRouter()
const { user, isAuthenticated, loading, auth } = useAuthProvider()

function showDevices() {
  router.push('/devices')
}

function showHistory() {
  router.push('/history')
}

function handleLogout() {
  auth.logout()
}

onMounted(async () => {
  await auth.checkAuth()
})
</script>

<style>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5em;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  padding: 0 20px;
}

.el-main {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}
</style>
