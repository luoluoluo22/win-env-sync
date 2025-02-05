// API 基础配置
export const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || '/.netlify/functions'

// axios 实例配置
export const axiosConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}

// API 端点配置
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    REGISTER: '/register',
    LOGIN: '/login',
    LOGOUT: '/logout',
    ME: '/me',
  },
  // 环境变量相关
  ENV: {
    LIST: '/env-list',
    UPDATE: '/env-update',
    DELETE: '/env-delete',
  },
}
