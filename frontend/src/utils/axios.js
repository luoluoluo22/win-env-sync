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
    // 添加token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 确保不会重复添加/.netlify/functions前缀
    if (!config.url.startsWith('http') && !config.url.startsWith('/.netlify')) {
      // 移除开头的斜杠
      const url = config.url.startsWith('/') ? config.url.slice(1) : config.url
      config.url = url
    }

    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    // 直接返回响应数据
    return response.data
  },
  (error) => {
    if (error.response) {
      // 处理特定的错误状态
      switch (error.response.status) {
        case 401:
          // 未授权或token过期
          localStorage.removeItem('token')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 404:
          console.error('请求的资源不存在:', error.response.config.url)
          break
        case 500:
          console.error('服务器错误:', error.response.data)
          break
        default:
          console.error('请求失败:', error.response.data)
      }
      return Promise.reject(error.response.data)
    }

    if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到响应:', error.request)
      return Promise.reject({ message: '网络错误，请检查您的连接' })
    }

    // 发送请求时出错
    console.error('请求配置错误:', error.message)
    return Promise.reject(error)
  }
)

export default http
