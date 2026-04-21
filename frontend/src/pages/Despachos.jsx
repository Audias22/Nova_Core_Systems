import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getDespachos, confirmarEntrega } from '../api/despachos'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { CheckCircleRounded, VisibilityRounded } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { formatFecha } from '../utils/fecha'

const estadoColor = {
  'En tránsito': { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff' },
  'Entregado': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  'Con incidencia': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
}

const dialogSx = {
  '& .MuiDialog-paper': { background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: '16px' },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

const Despachos = () => {
  const { tieneRol } = useAuth()
  const [despachos, setDespachos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [modalConfirmar, setModalConfirmar] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [despachoSeleccionado, setDespachoSeleccionado] = useState(null)
  const [confirmacion, setConfirmacion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    try {
      const data = await getDespachos()
      setDespachos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleConfirmar = async () => {
    if (!confirmacion) return
    setProcesando(true)
    try {
      await confirmarEntrega(despachoSeleccionado.id_despacho, confirmacion)
      await cargar()
      setMensaje('Entrega confirmada correctamente')
      setModalConfirmar(false)
      setTimeout(() => setMensaje(''), 3000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al confirmar entrega')
    } finally {
      setProcesando(false)
    }
  }

  const filtrados = despachos.filter(d =>
    d.numero_pedido?.toLowerCase().includes(filtro.toLowerCase()) ||
    d.cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
    d.responsable?.toLowerCase().includes(filtro.toLowerCase())
  )

  if (cargando) return (
    <Layout titulo="Despachos">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Despachos">
      <div className="space-y-5">

        <div className="grid grid-cols-3 gap-4">
          {['En tránsito', 'Entregado', 'Con incidencia'].map(estado => (
            <div key={estado} className="rounded-xl p-4 border border-blue-900/30 text-center"
              style={{ background: 'rgba(13,27,62,0.6)' }}>
              <p className="text-2xl font-bold" style={{ color: estadoColor[estado]?.text }}>
                {despachos.filter(d => d.estado === estado).length}
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

        <input
          type="text"
          placeholder="Buscar por pedido, cliente o responsable..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
        />

        <div className="rounded-xl border border-blue-900/30 overflow-hidden"
          style={{ background: 'rgba(13,27,62,0.6)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {['Pedido', 'Cliente', 'Municipio', 'Estado', 'Responsable', 'F. despacho', 'F. entrega', 'Días', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-3 py-3 text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d) => (
                  <tr key={d.id_despacho} className="border-t border-blue-900/10 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-3 text-blue-400 font-mono text-xs whitespace-nowrap">{d.numero_pedido}</td>
                    <td className="px-3 py-3 text-white text-xs">{d.cliente}</td>
                    <td className="px-3 py-3 text-slate-300 text-xs whitespace-nowrap">{d.municipio_entrega}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[d.estado]?.bg, color: estadoColor[d.estado]?.text }}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-300 text-xs">{d.responsable}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(d.fecha_despacho)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(d.fecha_entrega_real)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs text-center">{d.dias_entrega ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Tooltip title="Ver detalle">
                          <button onClick={() => { setDespachoSeleccionado(d); setModalDetalle(true) }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors text-blue-400">
                            <VisibilityRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {d.estado === 'En tránsito' && tieneRol('jefe_almacen', 'flota', 'ventas') && (
                          <Tooltip title="Confirmar entrega">
                            <button onClick={() => { setDespachoSeleccionado(d); setConfirmacion(''); setModalConfirmar(true) }}
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

      <Dialog open={modalConfirmar} onClose={() => setModalConfirmar(false)} sx={{ ...dialogSx, '& .MuiDialog-paper': { ...dialogSx['& .MuiDialog-paper'], minWidth: 400 } }}>
        <DialogTitle>
          Confirmar entrega · {despachoSeleccionado?.numero_pedido}
        </DialogTitle>
        <DialogContent>
          <p className="text-slate-400 text-sm mb-3 mt-2">Cliente: <span className="text-white">{despachoSeleccionado?.cliente}</span></p>
          <label className="text-blue-300 text-xs block mb-1">Nota de confirmación del cliente</label>
          <input type="text" value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            placeholder="Ej: Entrega recibida conforme por el cliente"
            className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.3)' }}
          />
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setModalConfirmar(false)} style={{ color: '#64748b' }}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={procesando || !confirmacion}
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', borderRadius: 8 }}>
            {procesando ? 'Guardando...' : 'Confirmar entrega'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle>
          Despacho · {despachoSeleccionado?.numero_pedido}
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 text-xs mt-2">
            <div><p className="text-slate-400 mb-1">Cliente</p><p className="text-white font-medium">{despachoSeleccionado?.cliente}</p></div>
            <div><p className="text-slate-400 mb-1">Municipio</p><p className="text-white font-medium">{despachoSeleccionado?.municipio_entrega}</p></div>
            <div><p className="text-slate-400 mb-1">Responsable</p><p className="text-white font-medium">{despachoSeleccionado?.responsable}</p></div>
            <div><p className="text-slate-400 mb-1">Estado</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium inline-block whitespace-nowrap"
                style={{ background: estadoColor[despachoSeleccionado?.estado]?.bg, color: estadoColor[despachoSeleccionado?.estado]?.text }}>
                {despachoSeleccionado?.estado}
              </span>
            </div>
            <div><p className="text-slate-400 mb-1">Fecha despacho</p><p className="text-white font-medium">{formatFecha(despachoSeleccionado?.fecha_despacho)}</p></div>
            <div><p className="text-slate-400 mb-1">Fecha entrega</p><p className="text-white font-medium">{despachoSeleccionado?.fecha_entrega_real ? formatFecha(despachoSeleccionado?.fecha_entrega_real) : 'Pendiente'}</p></div>
            {despachoSeleccionado?.confirmacion_cliente && (
              <div className="col-span-2">
                <p className="text-slate-400 mb-1">Confirmación</p>
                <p className="text-white font-medium">{despachoSeleccionado?.confirmacion_cliente}</p>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setModalDetalle(false)} style={{ color: '#64748b' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

export default Despachos