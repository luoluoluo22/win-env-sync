import axios from 'axios'
import { API_BASE_URL } from '../config/api'

// 创建axios实例
const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      // 处理特定的错误状态
      switch (error.response.status) {
        case 401:
          // 未授权或token过期
          localStorage.removeItem('token')
          break
        case 404:
          console.error('请求的资源不存在')
          break
        case 500:
          console.error('服务器错误')
          break
        default:
          console.error('发生错误:', error.response.data.message)
      }
      return Promise.reject(error.response.data)
    }
    return Promise.reject(error)
  }
)

export default http
