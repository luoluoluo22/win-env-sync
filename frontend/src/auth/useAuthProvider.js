import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './useAuth'

export function useAuthProvider() {
  const router = useRouter()
  const loading = ref(true)
  const isAuthenticated = ref(false)
  const user = ref(null)
  const { login, logout, checkAuth } = useAuth()

  const auth = {
    user,
    isAuthenticated,
    loading,
    login: async (credentials) => {
      try {
        const userData = await login(credentials)
        user.value = userData
        isAuthenticated.value = true
        return userData
      } catch (error) {
        throw error
      }
    },
    logout: async () => {
      try {
        await logout()
        user.value = null
        isAuthenticated.value = false
        router.push('/login')
      } catch (error) {
        console.error('登出失败:', error)
      }
    },
    checkAuth: async () => {
      try {
        loading.value = true
        const userData = await checkAuth()
        if (userData) {
          user.value = userData
          isAuthenticated.value = true
        }
        return userData
      } catch (error) {
        console.error('认证检查失败:', error)
        return null
      } finally {
        loading.value = false
      }
    }
  }

  // 提供认证上下文
  provide('auth', auth)

  return {
    user,
    isAuthenticated,
    loading,
    auth
  }
} 