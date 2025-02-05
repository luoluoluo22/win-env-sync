<template>
  <div>
    <div v-if="loading" class="loading-container">
      <el-spin class="loading">
        <el-icon><loading /></el-icon>
        <div>加载中...</div>
      </el-spin>
    </div>
    
    <div v-else-if="!isAuthenticated">
      <div class="login-container">
        <el-card class="login-card">
          <template #header>
            <h2>登录</h2>
          </template>
          <el-form :model="loginForm" label-position="top">
            <el-form-item label="邮箱">
              <el-input v-model="loginForm.email" type="email" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleLogin" :loading="loginLoading">
                登录
              </el-button>
              <el-button @click="handleRegister">
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </div>
    
    <div v-else>
      <slot :user="user"></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuth } from './useAuth'

const router = useRouter()
const loading = ref(true)
const loginLoading = ref(false)
const isAuthenticated = ref(false)
const user = ref(null)

const loginForm = ref({
  email: '',
  password: ''
})

const { login, logout, checkAuth } = useAuth()

provide('auth', {
  user,
  isAuthenticated,
  logout: async () => {
    await logout()
    isAuthenticated.value = false
    user.value = null
    router.push('/login')
  }
})

async function handleLogin() {
  try {
    loginLoading.value = true
    const userData = await login(loginForm.value)
    user.value = userData
    isAuthenticated.value = true
    router.push('/')
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

function handleRegister() {
  router.push('/register')
}

onMounted(async () => {
  try {
    const userData = await checkAuth()
    if (userData) {
      user.value = userData
      isAuthenticated.value = true
    }
  } catch (error) {
    console.error('认证检查失败:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.loading {
  text-align: center;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
}

.login-card {
  width: 400px;
}

.login-card :deep(.el-card__header) {
  text-align: center;
}

.login-card h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}
</style> 