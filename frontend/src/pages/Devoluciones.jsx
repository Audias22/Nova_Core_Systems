import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getDevoluciones, resolverDevolucion } from '../api/devoluciones'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { CheckCircleRounded, VisibilityRounded } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { formatFecha } from '../utils/fecha'

const estadoColor = {
  'Abierto': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  'En revisión': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'Resuelto': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' }
}

const plazoColor = {
  'En plazo': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  'Fuera de plazo': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
}

const dialogSx = {
  '& .MuiDialog-paper': { background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: '16px' },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

const Devoluciones = () => {
  const { tieneRol } = useAuth()
  const [devoluciones, setDevoluciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [modalResolver, setModalResolver] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [devolucionSeleccionada, setDevolucionSeleccionada] = useState(null)
  const [resolucion, setResolucion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    try {
      const data = await getDevoluciones()
      setDevoluciones(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleResolver = async () => {
    if (!resolucion) return
    setProcesando(true)
    try {
      await resolverDevolucion(devolucionSeleccionada.id_devolucion, resolucion)
      await cargar()
      setMensaje('Devolución resuelta correctamente')
      setModalResolver(false)
      setTimeout(() => setMensaje(''), 3000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al resolver devolución')
    } finally {
      setProcesando(false)
    }
  }

  const filtradas = devoluciones.filter(d =>
    d.numero_caso?.toLowerCase().includes(filtro.toLowerCase()) ||
    d.cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
    d.numero_pedido?.toLowerCase().includes(filtro.toLowerCase())
  )

  if (cargando) return (
    <Layout titulo="Devoluciones">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Devoluciones y Garantías">
      <div className="space-y-5">

        <div className="grid grid-cols-3 gap-4">
          {['Abierto', 'En revisión', 'Resuelto'].map(estado => (
            <div key={estado} className="rounded-xl p-4 border border-blue-900/30 text-center"
              style={{ background: 'rgba(13,27,62,0.6)' }}>
              <p className="text-2xl font-bold" style={{ color: estadoColor[estado]?.text }}>
                {devoluciones.filter(d => d.estado === estado).length}
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
          placeholder="Buscar por caso, cliente o pedido..."
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
                  {['Caso', 'Pedido', 'Cliente', 'Estado', 'Plazo', 'Responsable', 'F. reclamo', 'F. límite', 'Motivo', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-3 py-3 text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((d) => (
                  <tr key={d.id_devolucion} className="border-t border-blue-900/10 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-3 text-blue-400 font-mono text-xs whitespace-nowrap">{d.numero_caso}</td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-xs whitespace-nowrap">{d.numero_pedido}</td>
                    <td className="px-3 py-3 text-white text-xs">{d.cliente}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[d.estado]?.bg, color: estadoColor[d.estado]?.text }}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: plazoColor[d.plazo]?.bg, color: plazoColor[d.plazo]?.text }}>
                        {d.plazo}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-300 text-xs">{d.responsable_ventas}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(d.fecha_reclamo)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(d.fecha_limite_reclamo)}</td>
                    <td className="px-3 py-3 text-slate-300 text-xs max-w-32 truncate">{d.motivo}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Tooltip title="Ver detalle">
                          <button onClick={() => { setDevolucionSeleccionada(d); setModalDetalle(true) }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors text-blue-400">
                            <VisibilityRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {d.estado !== 'Resuelto' && tieneRol('jefe_almacen', 'ventas') && (
                          <Tooltip title="Resolver caso">
                            <button onClick={() => { setDevolucionSeleccionada(d); setResolucion(''); setModalResolver(true) }}
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

      <Dialog open={modalResolver} onClose={() => setModalResolver(false)}
        sx={{ ...dialogSx, '& .MuiDialog-paper': { ...dialogSx['& .MuiDialog-paper'], minWidth: 420 } }}>
        <DialogTitle>
          Resolver caso · {devolucionSeleccionada?.numero_caso}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-3 mt-2">
            <p className="text-slate-400 text-xs">Cliente: <span className="text-white">{devolucionSeleccionada?.cliente}</span></p>
            <p className="text-slate-400 text-xs">Motivo: <span className="text-white">{devolucionSeleccionada?.motivo}</span></p>
            <div>
              <label className="text-blue-300 text-xs block mb-1">Resolución aplicada</label>
              <textarea value={resolucion}
                onChange={(e) => setResolucion(e.target.value)}
                placeholder="Describe la resolución aplicada al caso..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.3)' }}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setModalResolver(false)} style={{ color: '#64748b' }}>Cancelar</Button>
          <Button onClick={handleResolver} disabled={procesando || !resolucion}
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', borderRadius: 8 }}>
            {procesando ? 'Guardando...' : 'Resolver caso'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle>
          {devolucionSeleccionada?.numero_caso} · {devolucionSeleccionada?.cliente}
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 text-xs mt-2">
            <div><p className="text-slate-400 mb-1">Pedido relacionado</p><p className="text-white font-mono">{devolucionSeleccionada?.numero_pedido}</p></div>
            <div><p className="text-slate-400 mb-1">Estado</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium inline-block whitespace-nowrap"
                style={{ background: estadoColor[devolucionSeleccionada?.estado]?.bg, color: estadoColor[devolucionSeleccionada?.estado]?.text }}>
                {devolucionSeleccionada?.estado}
              </span>
            </div>
            <div><p className="text-slate-400 mb-1">Fecha reclamo</p><p className="text-white">{formatFecha(devolucionSeleccionada?.fecha_reclamo)}</p></div>
            <div><p className="text-slate-400 mb-1">Fecha límite</p><p className="text-white">{formatFecha(devolucionSeleccionada?.fecha_limite_reclamo)}</p></div>
            <div className="col-span-2"><p className="text-slate-400 mb-1">Motivo</p><p className="text-white">{devolucionSeleccionada?.motivo}</p></div>
            {devolucionSeleccionada?.resolucion && (
              <div className="col-span-2"><p className="text-slate-400 mb-1">Resolución</p><p className="text-white">{devolucionSeleccionada?.resolucion}</p></div>
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

export default Devoluciones