import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getPedidos, aprobarPedido } from '../api/pedidos'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { CheckCircleRounded, VisibilityRounded } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { formatFecha } from '../utils/fecha'

const estadoColor = {
  'Pendiente': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'Aprobado': { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff' },
  'En preparación': { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  'Despachado': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  'Entregado': { bg: 'rgba(100,116,139,0.15)', text: '#64748b' },
  'Cancelado': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
}

const dialogSx = {
  '& .MuiDialog-paper': { background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: '16px' },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

const Pedidos = () => {
  const { tieneRol } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalDetalle, setModalDetalle] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    try {
      const data = await getPedidos()
      setPedidos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleAprobar = async (id_pedido) => {
    setProcesando(true)
    try {
      await aprobarPedido(id_pedido)
      await cargar()
      setMensaje('Pedido aprobado correctamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al aprobar pedido')
    } finally {
      setProcesando(false)
    }
  }

  const filtrados = pedidos.filter(p => {
    const matchTexto = p.numero_pedido?.toLowerCase().includes(filtro.toLowerCase()) ||
      p.cliente?.toLowerCase().includes(filtro.toLowerCase())
    const matchEstado = filtroEstado ? p.estado === filtroEstado : true
    return matchTexto && matchEstado
  })

  const estados = [...new Set(pedidos.map(p => p.estado))]

  if (cargando) return (
    <Layout titulo="Pedidos">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Pedidos">
      <div className="space-y-5">

        {/* Resumen */}
        <div className="grid grid-cols-4 gap-4">
          {['Pendiente', 'Aprobado', 'Despachado', 'Entregado'].map(estado => (
            <div key={estado} className="rounded-xl p-4 border border-blue-900/30 text-center cursor-pointer"
              style={{ background: filtroEstado === estado ? 'rgba(0,212,255,0.08)' : 'rgba(13,27,62,0.6)' }}
              onClick={() => setFiltroEstado(filtroEstado === estado ? '' : estado)}>
              <p className="text-2xl font-bold" style={{ color: estadoColor[estado]?.text }}>
                {pedidos.filter(p => p.estado === estado).length}
              </p>
              <p className="text-slate-400 text-xs mt-1">{estado}</p>
            </div>
          ))}
        </div>

        {mensaje && (
          <div className="px-4 py-3 rounded-lg text-sm"
            style={{
              background: mensaje.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              color: mensaje.includes('Error') ? '#ef4444' : '#22c55e',
              border: `1px solid ${mensaje.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
            }}>
            {mensaje}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Buscar por número de pedido o cliente..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
          />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}>
            <option value="" style={{ background: '#0d1b3e' }}>Todos los estados</option>
            {estados.map(e => <option key={e} value={e} style={{ background: '#0d1b3e' }}>{e}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-blue-900/30 overflow-hidden"
          style={{ background: 'rgba(13,27,62,0.6)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {['Número', 'Cliente', 'Tipo', 'Estado', 'Total', 'Fecha', 'Aprobado por', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-4 py-3 text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((pedido) => (
                  <tr key={pedido.id_pedido} className="border-t border-blue-900/10 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-blue-400 font-mono text-xs whitespace-nowrap">{pedido.numero_pedido}</td>
                    <td className="px-4 py-3 text-white text-xs">{pedido.cliente}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{pedido.tipo_cliente}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[pedido.estado]?.bg, color: estadoColor[pedido.estado]?.text }}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white text-xs font-semibold whitespace-nowrap">
                      Q{Number(pedido.total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(pedido.fecha_pedido)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{pedido.aprobado_por || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Tooltip title="Ver detalle">
                          <button onClick={() => { setPedidoSeleccionado(pedido); setModalDetalle(true) }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors text-blue-400">
                            <VisibilityRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {pedido.estado === 'Pendiente' && tieneRol('jefe_almacen', 'admin') && (
                          <Tooltip title="Aprobar pedido">
                            <button onClick={() => handleAprobar(pedido.id_pedido)} disabled={procesando}
                              className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors text-green-400">
                              <CheckCircleRounded style={{ fontSize: '1rem' }} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Detalle */}
      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)}
        maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle>
          {pedidoSeleccionado?.numero_pedido} · {pedidoSeleccionado?.cliente}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 mb-1">Estado</p>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{ background: estadoColor[pedidoSeleccionado?.estado]?.bg, color: estadoColor[pedidoSeleccionado?.estado]?.text }}>
                  {pedidoSeleccionado?.estado}
                </span>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Tipo de cliente</p>
                <p className="text-white font-medium">{pedidoSeleccionado?.tipo_cliente}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Fecha del pedido</p>
                <p className="text-white font-medium">{formatFecha(pedidoSeleccionado?.fecha_pedido)}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Total</p>
                <p className="text-white font-semibold">Q{Number(pedidoSeleccionado?.total || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Cliente</p>
                <p className="text-white font-medium">{pedidoSeleccionado?.cliente}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Aprobado por</p>
                <p className="text-white font-medium">{pedidoSeleccionado?.aprobado_por || '—'}</p>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setModalDetalle(false)} style={{ color: '#64748b' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

export default Pedidos