// API 基础配置
export const API_BASE_URL = '/api'

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
    REGISTER: 'register', // 不带前导斜杠
    LOGIN: 'login', // 不带前导斜杠
    LOGOUT: 'logout', // 不带前导斜杠
    ME: 'me', // 不带前导斜杠
  },
  // 环境变量相关
  ENV: {
    LIST: 'env-list', // 不带前导斜杠
    UPDATE: 'env-update', // 不带前导斜杠
    DELETE: 'env-delete', // 不带前导斜杠
  },
}
