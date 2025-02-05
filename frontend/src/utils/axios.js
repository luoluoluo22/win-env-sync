import axios from 'axios'
import { ElMessage } from 'element-plus'
import { axiosConfig } from '../config/api'

// 创建 axios 实例
const instance = axios.create({
  ...axiosConfig,
  timeout: 30000, // 增加超时时间
  retry: 3, // 重试次数
  retryDelay: 1000 // 重试延迟
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    console.log('发送请求:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    console.log('收到响应:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response.data
  },
  async (error) => {
    console.error('请求错误详情:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
      error: error.message
    });

    const config = error.config

    // 如果是网络错误或超时，并且还有重试次数，则重试
    if ((error.message.includes('Network Error') || error.message.includes('timeout')) && config.retry > 0) {
      config.retry -= 1
      console.log(`请求重试，剩余次数: ${config.retry}`)
      
      // 延迟重试
      await new Promise(resolve => setTimeout(resolve, config.retryDelay))
      return instance(config)
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }

    const message = error.response?.data?.message || error.message || '请求失败'
    ElMessage.error({
      message,
      duration: 5000,
      showClose: true
    })
    return Promise.reject(error)
  }
)

export default instance 