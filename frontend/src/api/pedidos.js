import api from './axios'

export const getPedidos = async () => {
  const response = await api.get('/pedidos/')
  return response.data
}

export const getPedido = async (id_pedido) => {
  const response = await api.get(`/pedidos/${id_pedido}`)
  return response.data
}

export const crearPedido = async (data) => {
  const response = await api.post('/pedidos/', data)
  return response.data
}

export const aprobarPedido = async (id_pedido) => {
  const response = await api.put(`/pedidos/${id_pedido}/aprobar`)
  return response.data
}

export const actualizarEstadoPedido = async (id_pedido, id_estado) => {
  const response = await api.put(`/pedidos/${id_estado}/estado`, { id_estado })
  return response.data
}