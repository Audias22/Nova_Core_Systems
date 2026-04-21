import api from './axios'

export const getRecepciones = async () => {
  const response = await api.get('/recepciones/')
  return response.data
}

export const getRecepcion = async (id_recepcion) => {
  const response = await api.get(`/recepciones/${id_recepcion}`)
  return response.data
}

export const crearRecepcion = async (data) => {
  const response = await api.post('/recepciones/', data)
  return response.data
}

export const actualizarEstadoRecepcion = async (id_recepcion, id_estado) => {
  const response = await api.put(`/recepciones/${id_recepcion}/estado`, { id_estado })
  return response.data
}