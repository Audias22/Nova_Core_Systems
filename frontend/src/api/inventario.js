import api from './axios'

export const getInventario = async () => {
  const response = await api.get('/inventario/')
  return response.data
}

export const getProductoInventario = async (id_producto) => {
  const response = await api.get(`/inventario/${id_producto}`)
  return response.data
}

export const ajustarInventario = async (data) => {
  const response = await api.post('/inventario/ajuste', data)
  return response.data
}

export const getAlertasStock = async () => {
  const response = await api.get('/inventario/alertas-stock')
  return response.data
}

export const getMovimientos = async (id_producto) => {
  const response = await api.get(`/inventario/movimientos/${id_producto}`)
  return response.data
}