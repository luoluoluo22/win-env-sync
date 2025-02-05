import http from '../utils/axios'
import { API_ENDPOINTS } from '../config/api'

export function useAuth() {
  const login = async ({ email, password }) => {
    try {
      const { token, user } = await http.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      })

      localStorage.setItem('token', token)
      return user
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await http.post(API_ENDPOINTS.AUTH.LOGOUT)
    } finally {
      localStorage.removeItem('token')
    }
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      return null
    }

    try {
      const response = await http.get(API_ENDPOINTS.AUTH.ME)
      return response.user
    } catch (error) {
      localStorage.removeItem('token')
      return null
    }
  }

  return {
    login,
    logout,
    checkAuth,
  }
}
