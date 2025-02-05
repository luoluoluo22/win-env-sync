import http from '../utils/axios'

export function useAuth() {
  const login = async ({ email, password }) => {
    try {
      const { token, user } = await http.post('/auth/login', {
        email,
        password
      })
      
      localStorage.setItem('token', token)
      return user
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await http.post('/auth/logout')
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
      return await http.get('/auth/me')
    } catch (error) {
      localStorage.removeItem('token')
      return null
    }
  }

  return {
    login,
    logout,
    checkAuth
  }
} 