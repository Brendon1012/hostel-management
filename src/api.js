import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jmr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('jmr_token')) {
      localStorage.removeItem('jmr_token')
      localStorage.removeItem('jmr_user')
      window.dispatchEvent(new Event('jmr:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Something went wrong. Please try again.'

export default api
