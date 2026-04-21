import api from './axios'

export const getAlertas = async () => {
  const response = await api.get('/alertas/')
  return response.data
}

export const getAlertasActivas = async () => {
  const response = await api.get('/alertas/activas')
  return response.data
}

export const generarAlertasAutomaticas = async () => {
  const response = await api.post('/alertas/generar')
  return response.data
}

export const resolverAlerta = async (id_alerta) => {
  const response = await api.put(`/alertas/${id_alerta}/resolver`)
  return response.data
}

export const getResumenAlertas = async () => {
  const response = await api.get('/alertas/resumen')
  return response.data
}