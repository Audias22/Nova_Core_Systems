import api from './axios'

export const login = async (correo, password) => {
  const response = await api.post('/auth/login', { correo, password })
  return response.data
}

export const getMe = async () => {
  const response = await api.get('/auth/me')
  return response.data
}