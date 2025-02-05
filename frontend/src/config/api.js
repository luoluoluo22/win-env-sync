// API 基础配置
export const API_BASE_URL = '/api'

// axios 实例配置
export const axiosConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
} 