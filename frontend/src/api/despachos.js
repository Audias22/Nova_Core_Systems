import api from './axios'

export const getDespachos = async () => {
  const response = await api.get('/despachos/')
  return response.data
}

export const getDespacho = async (id_despacho) => {
  const response = await api.get(`/despachos/${id_despacho}`)
  return response.data
}

export const crearDespacho = async (data) => {
  const response = await api.post('/despachos/', data)
  return response.data
}

export const confirmarEntrega = async (id_despacho, confirmacion_cliente) => {
  const response = await api.put(`/despachos/${id_despacho}/confirmar`, { confirmacion_cliente })
  return response.data
}