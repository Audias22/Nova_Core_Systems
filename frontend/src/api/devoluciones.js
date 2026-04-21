import api from './axios'

export const getDevoluciones = async () => {
  const response = await api.get('/devoluciones/')
  return response.data
}

export const getDevolucion = async (id_devolucion) => {
  const response = await api.get(`/devoluciones/${id_devolucion}`)
  return response.data
}

export const crearDevolucion = async (data) => {
  const response = await api.post('/devoluciones/', data)
  return response.data
}

export const resolverDevolucion = async (id_devolucion, resolucion) => {
  const response = await api.put(`/devoluciones/${id_devolucion}/resolver`, { resolucion })
  return response.data
}