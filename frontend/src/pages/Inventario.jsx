import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getInventario, ajustarInventario, getMovimientos } from '../api/inventario'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { TuneRounded, HistoryRounded, WarningAmberRounded } from '@mui/icons-material'
import { formatFecha } from '../utils/fecha'
import { useAuth } from '../context/AuthContext'

const estadoColor = {
  normal: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  bajo: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  critico: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
}

const dialogSx = {
  '& .MuiDialog-paper': { background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: '16px' },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

const Inventario = () => {
  const { tieneRol } = useAuth()
  const puedeAjustar = tieneRol('jefe_almacen', 'almacen')

  const [inventario, setInventario] = useState([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modalAjuste, setModalAjuste] = useState(false)
  const [modalMovimientos, setModalMovimientos] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [ajuste, setAjuste] = useState({ cantidad: '', motivo: '' })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    try {
      const data = await getInventario()
      setInventario(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const abrirAjuste = (item) => {
    setProductoSeleccionado(item)
    setAjuste({ cantidad: '', motivo: '' })
    setMensaje('')
    setModalAjuste(true)
  }

  const abrirMovimientos = async (item) => {
    setProductoSeleccionado(item)
    setModalMovimientos(true)
    try {
      const data = await getMovimientos(item.id_inventario)
      setMovimientos(data)
    } catch {
      setMovimientos([])
    }
  }

  const handleAjuste = async () => {
    if (!ajuste.cantidad || !ajuste.motivo) return
    setGuardando(true)
    try {
      await ajustarInventario({
        id_producto: productoSeleccionado.id_inventario,
        cantidad: parseInt(ajuste.cantidad),
        motivo: ajuste.motivo
      })
      setMensaje('Ajuste aplicado correctamente')
      await cargar()
      setTimeout(() => setModalAjuste(false), 1200)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al aplicar ajuste')
    } finally {
      setGuardando(false)
    }
  }

  const filtrados = inventario.filter(i =>
    i.producto?.toLowerCase().includes(filtro.toLowerCase()) ||
    i.codigo?.toLowerCase().includes(filtro.toLowerCase()) ||
    i.categoria?.toLowerCase().includes(filtro.toLowerCase()) ||
    i.marca?.toLowerCase().includes(filtro.toLowerCase())
  )

  const criticos = inventario.filter(i => i.estado_stock === 'critico').length
  const bajos = inventario.filter(i => i.estado_stock === 'bajo').length

  if (cargando) return (
    <Layout titulo="Inventario">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Inventario">
      <div className="space-y-5">

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4 border border-blue-900/30 text-center"
            style={{ background: 'rgba(13,27,62,0.6)' }}>
            <p className="text-3xl font-bold text-white">{inventario.length}</p>
            <p className="text-slate-400 text-xs mt-1">Referencias totales</p>
          </div>
          <div className="rounded-xl p-4 border border-yellow-900/30 text-center"
            style={{ background: 'rgba(245,158,11,0.05)' }}>
            <p className="text-3xl font-bold text-yellow-400">{bajos}</p>
            <p className="text-slate-400 text-xs mt-1">Stock bajo</p>
          </div>
          <div className="rounded-xl p-4 border border-red-900/30 text-center"
            style={{ background: 'rgba(239,68,68,0.05)' }}>
            <p className="text-3xl font-bold text-red-400">{criticos}</p>
            <p className="text-slate-400 text-xs mt-1">Stock crítico</p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar por producto, código, categoría o marca..."
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
                  {['Código', 'Producto', 'Categoría', 'Marca', 'Disponible', 'Reservado', 'Mínimo', 'Ubicación', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-4 py-3 text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => (
                  <tr key={item.id_inventario}
                    className="border-t border-blue-900/10 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-blue-400 font-mono text-xs whitespace-nowrap">{item.codigo}</td>
                    <td className="px-4 py-3 text-white text-xs max-w-40 truncate">{item.producto}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{item.categoria}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{item.marca}</td>
                    <td className="px-4 py-3 text-white font-semibold text-xs">{item.cantidad_disponible}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{item.cantidad_reservada}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{item.stock_minimo}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.ubicacion_bodega}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{
                          background: estadoColor[item.estado_stock]?.bg,
                          color: estadoColor[item.estado_stock]?.text
                        }}>
                        {item.estado_stock === 'critico' ? '⚠ Crítico' : item.estado_stock === 'bajo' ? 'Bajo' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        {puedeAjustar && (
                          <Tooltip title="Ajustar inventario">
                            <button onClick={() => abrirAjuste(item)}
                              className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors text-blue-400">
                              <TuneRounded style={{ fontSize: '1rem' }} />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip title="Ver movimientos">
                          <button onClick={() => abrirMovimientos(item)}
                            className="p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors text-purple-400">
                            <HistoryRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {item.estado_stock === 'critico' && (
                          <Tooltip title="Stock crítico — requiere reposición">
                            <WarningAmberRounded style={{ fontSize: '1rem', color: '#ef4444' }} />
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

      {/* Modal Ajuste — solo se muestra si tiene permiso */}
      {puedeAjustar && (
        <Dialog open={modalAjuste} onClose={() => setModalAjuste(false)} sx={dialogSx}>
          <DialogTitle>
            Ajustar inventario · {productoSeleccionado?.codigo}
          </DialogTitle>
          <DialogContent className="space-y-4 pt-2">
            <p className="text-slate-400 text-sm mt-2">
              Stock actual: <span className="text-white font-semibold">{productoSeleccionado?.cantidad_disponible} unidades</span>
            </p>
            <div className="mt-3">
              <label className="text-blue-300 text-xs block mb-1">Cantidad (positivo para entrada, negativo para salida)</label>
              <input type="number" value={ajuste.cantidad}
                onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none mt-1"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.3)' }}
              />
            </div>
            <div className="mt-3">
              <label className="text-blue-300 text-xs block mb-1">Motivo del ajuste</label>
              <input type="text" value={ajuste.motivo}
                onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })}
                placeholder="Ej: Auditoría física, corrección de conteo..."
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none mt-1"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.3)' }}
              />
            </div>
            {mensaje && (
              <p className="text-sm mt-2" style={{ color: mensaje.includes('Error') ? '#ef4444' : '#22c55e' }}>
                {mensaje}
              </p>
            )}
          </DialogContent>
          <DialogActions className="px-6 pb-4">
            <Button onClick={() => setModalAjuste(false)} style={{ color: '#64748b' }}>Cancelar</Button>
            <Button onClick={handleAjuste} disabled={guardando}
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)', color: 'white', borderRadius: 8 }}>
              {guardando ? 'Guardando...' : 'Aplicar ajuste'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modal Movimientos — todos los roles con acceso a inventario pueden ver */}
      <Dialog open={modalMovimientos} onClose={() => setModalMovimientos(false)}
        maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle>
          Movimientos · {productoSeleccionado?.codigo} · {productoSeleccionado?.producto}
        </DialogTitle>
        <DialogContent>
          {movimientos.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin movimientos registrados</p>
          ) : (
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="border-b border-blue-900/30">
                  {['Tipo', 'Usuario', 'Cantidad', 'Anterior', 'Nueva', 'Fecha', 'Referencia'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium pb-3 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id_movimiento} className="border-t border-blue-900/10">
                    <td className="py-2 pr-3 text-blue-400 whitespace-nowrap">{m.tipo_movimiento}</td>
                    <td className="py-2 pr-3 text-slate-300">{m.usuario}</td>
                    <td className="py-2 pr-3 text-white font-semibold">{m.cantidad}</td>
                    <td className="py-2 pr-3 text-slate-400">{m.cantidad_anterior}</td>
                    <td className="py-2 pr-3 text-white">{m.cantidad_nueva}</td>
                    <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{formatFecha(m.fecha_movimiento)}</td>
                    <td className="py-2 text-slate-500 font-mono">{m.referencia || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setModalMovimientos(false)} style={{ color: '#64748b' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

export default Inventario